// 정의서 부록 A 설정값 모음 — 운영자가 /admin/settings 에서 바꿀 수 있는 값들의 기본값
export interface Region {
  code: string;
  name: string;
  examples: string;
}

export interface Interest {
  code: string;
  name: string;
}

export const DEFAULT_REGIONS: Region[] = [
  { code: "GANGNAM", name: "강남·서초", examples: "강남역, 역삼, 선릉, 교대, 양재" },
  { code: "GWANGHWAMUN", name: "광화문·종로", examples: "광화문, 종각, 을지로, 시청" },
  { code: "YEOUIDO", name: "여의도·영등포", examples: "여의도, 영등포, 신길" },
  { code: "SEONGSU", name: "성수·왕십리", examples: "성수, 서울숲, 왕십리, 건대" },
  { code: "MAPO", name: "마포·홍대", examples: "홍대, 합정, 망원, 공덕" },
];

export const DEFAULT_INTERESTS: Interest[] = [
  { code: "KR_STOCK", name: "국내 주식" },
  { code: "US_STOCK", name: "미국 주식" },
  { code: "ETF", name: "ETF·인덱스" },
  { code: "CRYPTO", name: "코인·가상자산" },
  { code: "REALTY", name: "부동산" },
  { code: "BOND", name: "채권·금리" },
  { code: "STARTUP", name: "스타트업·비상장" },
  { code: "COMMODITY", name: "원자재·금" },
  { code: "DERIV", name: "선물·옵션" },
  { code: "BEGINNER", name: "이제 막 시작했어요" },
];

export const INTEREST_MIN = 1;
export const INTEREST_MAX = 3;

// 정의서 6.3 매칭 가중치 [결정]
export const WEIGHTS = {
  region1Match: 40,      // 선호지역 1순위 일치 (쌍)
  regionCross: 15,       // 한쪽 1순위 = 다른 쪽 2순위 (쌍)
  interestEach: 12,      // 공통 관심사 1개당 (쌍, 최대 3개)
  diffSchool: 6,         // 서로 다른 대학원 소속 (쌍)
  groupAllRegion: 30,    // 조 전원 같은 1순위 지역 (조 보너스)
  groupAllInterest: 25,  // 조 전원 공통 관심사 존재 (조 보너스)
};

export const GROUP_SIZE = 4;

export const CONSENT_POLICY_VERSION = "v1";

export const CONSENT_TEXT = `수집 항목: 이름, 전화번호, 선호지역, 대학원 소속, 투자 관심사
수집 목적: 커피챗 조 편성과 모임 안내 연락
보유 기간: 해당 회차 종료 후 6개월 (이후 파기, 단 매칭 중복 방지용 전화번호 해시값은 1년간 보관)
제3자 제공: 같은 조로 편성된 구성원에게 이름·전화번호·소속 공유
동의 거부 시: 커피챗 신청이 불가합니다`;

export const MESSAGES = {
  applyDone: "신청이 접수되었습니다.",
  applyUpdated: "이미 신청 내역이 있어 최신 내용으로 업데이트했습니다.",
  closed: "이번 회차 신청이 마감되었습니다. 다음 회차를 기다려 주세요.",
  waitlist:
    "신청해 주셔서 감사합니다. 이번 회차는 지역별 인원 구성상 대기자로 안내드립니다. 다음 회차에서 우선 배정해 드릴게요.",
};

export function regionName(code: string, regions: Region[] = DEFAULT_REGIONS): string {
  return regions.find((r) => r.code === code)?.name ?? code;
}

export function interestNames(codes: string[], interests: Interest[] = DEFAULT_INTERESTS): string[] {
  return codes.map((c) => interests.find((i) => i.code === c)?.name ?? c);
}
