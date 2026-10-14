// 정의서 6절 매칭 알고리즘 구현
// 탐욕 편성 + 교환 개선 + 30회 반복 중 최고안 선택
import { WEIGHTS, GROUP_SIZE } from "./constants";

export interface Applicant {
  applicationId: string;
  personId: string;
  name: string;
  phone: string; // 복호화된 번호 (결과 표시용)
  region1: string;
  region2: string | null;
  interests: string[];
  school: string;
  appliedAt: string; // ISO
  noshow: boolean;
  prevWaitlist: boolean; // 직전 회차 대기자였는지 (우선 매칭 가점)
  prevPartners: Set<string>; // 이전 회차에 같은 조였던 personId들
}

export interface MatchGroup {
  members: Applicant[];
  leaderId: string; // personId — 조장 (조에서 신청 시각이 가장 빠른 사람)
  score: number;
  commonInterests: string[];
  allSameRegion: boolean;
  prevConflict: boolean; // 이전 회차 동일 조 쌍이 포함됨 (하드제약 예외 시)
  warnings: string[];
}

export interface MatchResult {
  groups: MatchGroup[];
  waitlist: Applicant[];
  excludedNoshow: Applicant[];
  totalScore: number;
  qualityWarning: string | null;
  seed: number;
}

// 시드 기반 난수 (mulberry32)
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function commonInterests(a: Applicant, b: Applicant): string[] {
  return a.interests.filter((i) => b.interests.includes(i));
}

// 정의서 6.3 쌍 점수
function pairScore(a: Applicant, b: Applicant): number {
  let s = 0;
  if (a.region1 === b.region1) s += WEIGHTS.region1Match;
  else if (a.region1 === b.region2 || b.region1 === a.region2) s += WEIGHTS.regionCross;
  s += Math.min(commonInterests(a, b).length, 3) * WEIGHTS.interestEach;
  if (a.school.trim() !== b.school.trim()) s += WEIGHTS.diffSchool;
  return s;
}

function groupCommonInterests(members: Applicant[]): string[] {
  if (members.length === 0) return [];
  return members[0].interests.filter((i) => members.every((m) => m.interests.includes(i)));
}

// 정의서 6.3 조 점수 (쌍 점수 합 + 조 보너스)
function groupScore(members: Applicant[]): number {
  let s = 0;
  for (let i = 0; i < members.length; i++)
    for (let j = i + 1; j < members.length; j++) s += pairScore(members[i], members[j]);
  if (members.every((m) => m.region1 === members[0].region1)) s += WEIGHTS.groupAllRegion;
  if (groupCommonInterests(members).length > 0) s += WEIGHTS.groupAllInterest;
  return s;
}

function hasPrevConflict(members: Applicant[]): boolean {
  for (let i = 0; i < members.length; i++)
    for (let j = i + 1; j < members.length; j++)
      if (members[i].prevPartners.has(members[j].personId)) return true;
  return false;
}

function pickLeader(members: Applicant[]): string {
  // 조장: 조에서 신청 시각이 가장 빠른 사람 [결정]
  return [...members].sort((a, b) => a.appliedAt.localeCompare(b.appliedAt))[0].personId;
}

function finalizeGroup(members: Applicant[]): MatchGroup {
  const common = groupCommonInterests(members);
  const warnings: string[] = [];
  if (common.length === 0) warnings.push("공통 관심사가 없는 조입니다");
  const conflict = hasPrevConflict(members);
  if (conflict) warnings.push("이전 회차와 같은 조였던 쌍이 포함되어 있습니다");
  return {
    members,
    leaderId: pickLeader(members),
    score: groupScore(members),
    commonInterests: common,
    allSameRegion: members.every((m) => m.region1 === members[0].region1),
    prevConflict: conflict,
    warnings,
  };
}

// 한 번의 편성 시도
function runOnce(pool: Applicant[], rand: () => number): { groups: MatchGroup[]; waitlist: Applicant[] } {
  // 노쇼 제외 (대기자보다 뒤)
  const active = pool.filter((a) => !a.noshow);
  // 1순위 지역별 그룹핑 (직전 대기자 우선)
  const byRegion = new Map<string, Applicant[]>();
  for (const a of active) {
    if (!byRegion.has(a.region1)) byRegion.set(a.region1, []);
    byRegion.get(a.region1)!.push(a);
  }
  // 지역 인원이 4명 미만이면 2순위 희망자를 끌어오기
  for (const [region, list] of byRegion) {
    const need = GROUP_SIZE - (list.length % GROUP_SIZE || 0);
    if (need > 0 && need < GROUP_SIZE) {
      // 다른 지역에서 2순위가 이 지역인 사람 탐색
      const donors: Applicant[] = [];
      for (const [r2, l2] of byRegion) {
        if (r2 === region) continue;
        for (const c of l2) {
          if (c.region2 === region && !donors.includes(c)) {
            donors.push(c);
            if (donors.length >= need) break;
          }
        }
        if (donors.length >= need) break;
      }
      for (const d of donors) {
        const idx = byRegion.get(d.region1)!.indexOf(d);
        if (idx >= 0) byRegion.get(d.region1)!.splice(idx, 1);
        list.push(d);
      }
    }
  }

  // 지역 그룹 안에서 탐욕 편성
  const groups: Applicant[][] = [];
  const unassigned = new Set(active.map((a) => a.applicationId));
  const regionLists = [...byRegion.entries()].map(([region, list]) => ({
    region,
    list: list.filter((a) => unassigned.has(a.applicationId)),
  }));

  const pickSeed = (list: Applicant[]): Applicant => {
    const sorted = [...list].sort(
      (x, y) => Number(y.prevWaitlist) - Number(x.prevWaitlist) || x.appliedAt.localeCompare(y.appliedAt)
    );
    // 앞쪽 3명 중 랜덤 1명을 시드로 (다양성 확보)
    const k = Math.min(3, sorted.length);
    return sorted[Math.floor(rand() * k)];
  };

  for (const { list } of regionLists) {
    const local = list.filter((a) => unassigned.has(a.applicationId));
    while (local.length >= GROUP_SIZE) {
      const seed = pickSeed(local);
      const idx = local.indexOf(seed);
      local.splice(idx, 1);
      unassigned.delete(seed.applicationId);
      const members = [seed];
      while (members.length < GROUP_SIZE && local.length > 0) {
        // 시드와의 쌍 점수가 높은 순, 이전조 제약 제외
        const scored = local
          .filter((c) => !seed.prevPartners.has(c.personId) && !members.some((m) => m.prevPartners.has(c.personId)))
          .map((c) => ({ c, s: members.reduce((acc, m) => acc + pairScore(m, c), 0) }))
          .sort((a, b) => b.s - a.s || rand() - 0.5);
        const next = scored.length > 0 ? scored[0].c : local[Math.floor(rand() * local.length)];
        const ni = local.indexOf(next);
        local.splice(ni, 1);
        unassigned.delete(next.applicationId);
        members.push(next);
      }
      if (members.length === GROUP_SIZE) groups.push(members);
      else {
        // 4명을 못 채우면 대기자로 반환
        for (const m of members) unassigned.add(m.applicationId);
        break;
      }
    }
  }

  // 교환 개선 패스 (최대 200회)
  let improved = true;
  let tries = 0;
  const totalOf = (gs: Applicant[][]) => gs.reduce((a, g) => a + groupScore(g), 0);
  while (improved && tries < 200) {
    improved = false;
    tries++;
    for (let i = 0; i < groups.length && !improved; i++) {
      for (let j = i + 1; j < groups.length && !improved; j++) {
        for (let a = 0; a < GROUP_SIZE && !improved; a++) {
          for (let b = 0; b < GROUP_SIZE && !improved; b++) {
            const gi = [...groups[i]];
            const gj = [...groups[j]];
            [gi[a], gj[b]] = [gj[b], gi[a]];
            if (hasPrevConflict(gi) || hasPrevConflict(gj)) continue;
            if (groupScore(gi) + groupScore(gj) > groupScore(groups[i]) + groupScore(groups[j])) {
              groups[i] = gi;
              groups[j] = gj;
              improved = true;
            }
          }
        }
      }
    }
  }

  const waitlist = active
    .filter((a) => unassigned.has(a.applicationId))
    .sort((a, b) => a.appliedAt.localeCompare(b.appliedAt));

  return { groups: groups.map(finalizeGroup), waitlist };
}

export function runMatching(pool: Applicant[], seedBase = Date.now()): MatchResult {
  const active = pool.filter((a) => !a.noshow);
  const excludedNoshow = pool.filter((a) => a.noshow);
  const ITER = 30;
  let best: { groups: MatchGroup[]; waitlist: Applicant[] } | null = null;
  let bestScore = -Infinity;
  let bestClean: { groups: MatchGroup[]; waitlist: Applicant[] } | null = null;
  let bestCleanScore = -Infinity;
  let bestSeed = seedBase;

  for (let i = 0; i < ITER; i++) {
    const seed = seedBase + i * 7919;
    const r = runOnce(active, rng(seed));
    const score = r.groups.reduce((a, g) => a + g.score, 0);
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
    // 정의서 6.2: 이전 회차 동일 조 제약 — 충돌 없는 편성안이 있으면 그것을 우선
    const hasConflict = r.groups.some((g) => g.prevConflict);
    if (!hasConflict && score > bestCleanScore) {
      bestCleanScore = score;
      bestClean = r;
      bestSeed = seed;
    }
  }

  // 충돌 없는 안이 하나라도 있으면 그것을 선택, 없으면 최고점 안(경고 표시됨)
  const chosen = bestClean ?? best;
  if (chosen && !bestClean) {
    bestSeed = seedBase; // 충돌 포함 안 — seed는 참고용
  }

  const groups = chosen?.groups ?? [];
  const waitlist = chosen?.waitlist ?? [];

  // 정의서 6.5 품질 기준: 전체 조의 80% 이상이 전원/3명 이상 같은 1순위 지역
  let qualityWarning: string | null = null;
  if (groups.length > 0) {
    const okCount = groups.filter((g) => {
      const c = new Map<string, number>();
      for (const m of g.members) c.set(m.region1, (c.get(m.region1) ?? 0) + 1);
      return Math.max(...c.values()) >= 3;
    }).length;
    if (okCount / groups.length < 0.8) {
      qualityWarning = `지역 일치 품질 기준 미달: ${groups.length}개 조 중 ${okCount}개만 3명 이상 같은 지역입니다. 수동 조정을 검토해 주세요.`;
    }
  }

  return {
    groups,
    waitlist,
    excludedNoshow,
    totalScore: bestClean ? bestCleanScore : bestScore === -Infinity ? 0 : bestScore,
    qualityWarning,
    seed: bestSeed,
  };
}
