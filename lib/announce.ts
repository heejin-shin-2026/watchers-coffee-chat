// 조별 안내문·조장 안내문·대기자 안내문 템플릿 (정의서 5.5)
import { regionName, interestNames, type Region, type Interest } from "./constants";
import type { MatchGroup } from "./matching";

export interface AnnounceMember {
  name: string;
  phone: string; // 전체 번호
  school: string;
  personId: string;
}

function memberLine(m: AnnounceMember): string {
  return `${m.name} (${m.phone}) · ${m.school}`;
}

// 조별 안내문 (단톡방/문자 공용)
export function groupAnnounce(
  groupNo: number,
  regionCode: string,
  members: AnnounceMember[],
  commonInterests: string[],
  regions: Region[] = [],
  interests: Interest[] = []
): string {
  const lines = members.map(memberLine).join("\n");
  const common = interestNames(commonInterests, interests).join(", ") || "없음";
  return `[커피챗 ${groupNo}조 - ${regionName(regionCode, regions.length ? regions : undefined)}]\n${lines}\n공통 관심사: ${common}\n네 분이 직접 연락해서 시간과 장소를 정해 주세요!`;
}

// 조장 안내문 — 회장이 조장에게 직접 보내 "알아서 연락하라"고 하는 용도
export function leaderAnnounce(
  groupNo: number,
  regionCode: string,
  leader: AnnounceMember,
  others: AnnounceMember[],
  commonInterests: string[],
  regions: Region[] = [],
  interests: Interest[] = []
): string {
  const lines = others.map(memberLine).join("\n");
  const common = interestNames(commonInterests, interests).join(", ") || "없음";
  return `[커피챗 ${groupNo}조 조장 안내]\n안녕하세요 ${leader.name}님! 이번 커피챗 ${groupNo}조(${regionName(regionCode, regions.length ? regions : undefined)})의 조장으로 지정되셨어요 🙏\n아래 세 분께 직접 연락해서 시간과 장소를 정해 주세요.\n${lines}\n공통 관심사: ${common}`;
}

export function waitlistAnnounce(name: string): string {
  return `${name}님, 신청해 주셔서 감사합니다. 이번 회차는 지역별 인원 구성상 대기자로 안내드립니다. 다음 회차에서 우선 배정해 드릴게요.`;
}
