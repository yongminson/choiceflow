/**
 * 결과 화면이 규칙을 지키는지 한 번에 훑는다.
 *
 * 그동안은 보고받은 한 건만 고치고 내보냈다. 그래서 같은 종류의 문제가
 * 다른 요청에서 다시 나왔다. 부속품 필터를 만들 때 패드·브러시만 넣고
 * 세제·랙을 빠뜨린 것, 대상 읽기를 고칠 때 "남편"만 보고 "아이"를
 * 빠뜨린 것이 그랬다.
 *
 * 한 건을 고치면 그 종류 전체를 쓸어봐야 한다. 그러려면 여러 요청을
 * 한꺼번에 돌려 볼 것이 있어야 한다.
 *
 * 여기서는 AI 와 쿠팡을 부르지 않는다. 그동안 문제가 났던 곳은 거의
 * 전부 "받아 온 상품을 어떻게 판단하는가"였고, 그 부분은 값만 있으면
 * 돌려볼 수 있다. 상품 목록은 실제 화면에 올라왔던 이름을 그대로 쓴다.
 *
 * 실행: npm run audit
 */

import { detectAudience } from "../src/lib/recommendation/gender.ts";
import { detectTargetItem } from "../src/lib/recommendation/item-match.ts";
import { detectCleaningNeed } from "../src/lib/recommendation/cleaning-match.ts";
import { detectOccasion } from "../src/lib/recommendation/occasion.ts";
import { productFitProblem } from "../src/lib/recommendation/product-fit.ts";
import { dropAccessories } from "../src/lib/recommendation/accessory-match.ts";
import { applyPriceBurdenScores } from "../src/lib/recommendation/scores.ts";
import { applyPriorityWeighting } from "../src/lib/recommendation/overall-score.ts";
import { assignSelectionLabels } from "../src/lib/recommendation/selection-labels.ts";
import { orderForDisplay } from "../src/lib/recommendation/display-order.ts";
import { derivedFitChecks } from "../src/lib/recommendation/fit-checks.ts";
import { replaceWrongCautions } from "../src/lib/recommendation/caution-match.ts";
import { verifyRecommendations } from "../src/lib/recommendation/verify-result.ts";
import { hasServiceableBrand } from "../src/lib/recommendation/senior-care.ts";
import { productBrandKey } from "../src/lib/monetization/brand-verify.ts";
import type { QuickRecommendation } from "../src/lib/types/analyze.ts";
import type { CategoryId } from "../src/lib/types/category.ts";

type Product = { name: string; price: number };

type Scenario = {
  label: string;
  categoryId: CategoryId;
  scenarioLabel: string;
  priorityId: string;
  maxBudgetWon: number;
  wish: string;
  /** 쿠팡이 이 검색어로 돌려줄 법한 목록. 맞는 것과 아닌 것을 섞는다. */
  pool: Product[];
  /** 반드시 걸러져야 하는 상품. 하나라도 통과하면 실패다. */
  mustReject: string[];
  /** 반드시 남아야 하는 상품. 하나라도 걸리면 실패다. */
  mustKeep: string[];
  /** 서비스센터를 찾아갈 수 있는 제조사가 하나는 있어야 하는가. */
  needsServiceableBrand?: boolean;
  /** 같은 브랜드가 이만큼을 넘으면 안 된다. */
  maxSameBrand?: number;
};

const LABELS = {
  best: "가장 추천",
  value: "가성비 선택",
  reliable: "검증 우선",
  premium: "한 단계 위",
} as const;

const SCENARIOS: Scenario[] = [
  {
    label: "식기세척기 3인용 무설치",
    categoryId: "appliance",
    scenarioLabel: "주방가전",
    priorityId: "convenience",
    maxBudgetWon: 500_000,
    wish: "식기세척기 3인용 무설치 카운터탑 제품을 찾아요, 싱크대 위에 올려놓고 쓸 거예요",
    pool: [
      { name: "베리크린 올인원 가정용 식기세척기세제", price: 11_900 },
      { name: "공간케어 대용량 업소용 프리미엄 식기세척기 세제", price: 14_990 },
      { name: "올인원 식기세척기 타블렛 세제 식세기세제 3 in 1", price: 19_800 },
      { name: "식기세척기 바구니 수저통", price: 8_900 },
      { name: "스타리온 업소용 식기세척기 SW-S65H 전문설치", price: 1_310_000 },
      { name: "LG 트롬 오브제컬렉션 의류건조기", price: 890_000 },
      { name: "쿠쿠 3인용 카운터탑 식기세척기 CDW-A0310FW", price: 329_000 },
      { name: "SK매직 터치 3인용 식기세척기 무설치", price: 398_000 },
      { name: "nuvia 누비아 식기세척기 6인용 무설치", price: 479_000 },
    ],
    mustReject: [
      "베리크린 올인원 가정용 식기세척기세제",
      "공간케어 대용량 업소용 프리미엄 식기세척기 세제",
      "올인원 식기세척기 타블렛 세제 식세기세제 3 in 1",
      "식기세척기 바구니 수저통",
      "스타리온 업소용 식기세척기 SW-S65H 전문설치",
      "LG 트롬 오브제컬렉션 의류건조기",
    ],
    mustKeep: [
      "쿠쿠 3인용 카운터탑 식기세척기 CDW-A0310FW",
      "SK매직 터치 3인용 식기세척기 무설치",
    ],
  },
  {
    label: "로봇청소기 물걸레",
    categoryId: "appliance",
    scenarioLabel: "청소·세탁",
    priorityId: "convenience",
    maxBudgetWon: 1_500_000,
    wish: "5년 쓴 흡입 전용 로봇청소기 교체, 6살 아이가 흘린 자국까지 닦이게 물걸레 되는 걸로",
    pool: [
      { name: "Deebot Ozmo T9 T8 T5 N5 N8 DJ65 호환 물걸레 패드", price: 11_990 },
      { name: "로봇청소기 전용 물걸레 패드 10매 리필", price: 9_900 },
      { name: "로봇청소기 사이드 브러쉬 세트", price: 7_900 },
      { name: "에브리봇 AI 클린케어 올인원 로봇청소기", price: 549_000 },
      { name: "샤오미 로보락 S8 로봇청소기 물걸레", price: 690_000 },
      { name: "루미에뜨 고층 아파트 베란다 유리창 청소 로봇 청소기", price: 321_200 },
    ],
    mustReject: [
      "Deebot Ozmo T9 T8 T5 N5 N8 DJ65 호환 물걸레 패드",
      "로봇청소기 전용 물걸레 패드 10매 리필",
      "로봇청소기 사이드 브러쉬 세트",
      "루미에뜨 고층 아파트 베란다 유리창 청소 로봇 청소기",
    ],
    mustKeep: [
      "에브리봇 AI 클린케어 올인원 로봇청소기",
      "샤오미 로보락 S8 로봇청소기 물걸레",
    ],
  },
  {
    label: "전기압력밥솥 10인용",
    categoryId: "appliance",
    scenarioLabel: "주방가전",
    priorityId: "performance",
    maxBudgetWon: 500_000,
    wish: "전기압력밥솥 10인용 찾아요",
    pool: [
      { name: "쿠쿠 전기압력밥솥 10인용 CRP-QS1010FW", price: 289_000 },
      { name: "쿠첸 IH 압력밥솥 10인용", price: 349_000 },
      { name: "쿠첸 10인용 전기압력밥솥 내솥 교체용", price: 45_000 },
      { name: "밥솥 고무패킹 실리콘 링 호환 부품", price: 6_900 },
      { name: "전기압력밥솥 세척솔 청소솔", price: 4_500 },
    ],
    mustReject: [
      "쿠첸 10인용 전기압력밥솥 내솥 교체용",
      "밥솥 고무패킹 실리콘 링 호환 부품",
      "전기압력밥솥 세척솔 청소솔",
    ],
    mustKeep: [
      "쿠쿠 전기압력밥솥 10인용 CRP-QS1010FW",
      "쿠첸 IH 압력밥솥 10인용",
    ],
  },
  {
    label: "성인 여성 운동복 (아이는 상황 설명)",
    categoryId: "fashion",
    scenarioLabel: "운동·아웃도어",
    priorityId: "price",
    maxBudgetWon: 50_000,
    wish: "아이 등원 후 아침 걷기를 시작하려고요, 40대 여성이 처음 사는 운동복이에요",
    pool: [
      { name: "버니덴 프리미엄 시크릿 주니어 필라테스 요가레깅스", price: 15_900 },
      { name: "키즈크루 아동용 기모 리본포 상하세트", price: 29_150 },
      { name: "초등생 여아 후드 바람막이 점퍼", price: 33_820 },
      { name: "나이키 여성 러닝 레깅스", price: 39_000 },
      { name: "젝시믹스 여성 트레이닝 세트", price: 45_000 },
    ],
    mustReject: [
      "버니덴 프리미엄 시크릿 주니어 필라테스 요가레깅스",
      "키즈크루 아동용 기모 리본포 상하세트",
      "초등생 여아 후드 바람막이 점퍼",
    ],
    mustKeep: ["나이키 여성 러닝 레깅스", "젝시믹스 여성 트레이닝 세트"],
  },
  {
    label: "아이 운동화 (아이가 신는 경우)",
    categoryId: "fashion",
    scenarioLabel: "운동·아웃도어",
    priorityId: "price",
    maxBudgetWon: 80_000,
    wish: "6살 아이가 신을 운동화 사려고요",
    pool: [
      { name: "나이키 키즈 운동화 180", price: 49_000 },
      { name: "뉴발란스 아동 운동화 190", price: 59_000 },
      { name: "아디다스 성인 러닝화 280", price: 79_000 },
    ],
    mustReject: ["아디다스 성인 러닝화 280"],
    mustKeep: ["나이키 키즈 운동화 180", "뉴발란스 아동 운동화 190"],
  },
  {
    label: "추석 시댁 모임 옷",
    categoryId: "fashion",
    scenarioLabel: "행사·모임",
    priorityId: "design",
    maxBudgetWon: 150_000,
    wish: "추석에 시댁 모임에 입고 갈 단정한 옷 찾아요",
    pool: [
      { name: "여름여행 플라워 시스루 미니원피스", price: 39_000 },
      { name: "가을 단정한 니트 원피스 정장", price: 89_000 },
      { name: "베이직 라운드 니트 카디건 세트", price: 79_000 },
    ],
    mustReject: ["여름여행 플라워 시스루 미니원피스"],
    mustKeep: ["가을 단정한 니트 원피스 정장", "베이직 라운드 니트 카디건 세트"],
  },
  {
    label: "전기요 (온수매트 아님)",
    categoryId: "appliance",
    scenarioLabel: "계절·생활",
    priorityId: "performance",
    maxBudgetWon: 300_000,
    wish: "침대에서 아이와 같이 쓸 전기요 찾아요",
    pool: [
      { name: "무자계 카본 전기요 싱글", price: 89_000 },
      { name: "한일 전기요 더블 온열매트", price: 119_000 },
      { name: "일월 듀얼하트 온수매트", price: 157_000 },
      { name: "전기방석 카본 온열 소파 전기요", price: 27_990 },
    ],
    mustReject: ["일월 듀얼하트 온수매트", "전기방석 카본 온열 소파 전기요"],
    mustKeep: ["무자계 카본 전기요 싱글", "한일 전기요 더블 온열매트"],
  },
  {
    label: "70대 부모님 태블릿",
    categoryId: "appliance",
    scenarioLabel: "모바일·PC",
    priorityId: "convenience",
    maxBudgetWon: 500_000,
    wish: "70대 부모님이 유튜브랑 손주 영상통화만 하실 태블릿, 제가 대신 골라드리려고요",
    pool: [
      { name: "삼성 갤럭시탭 A9+ 11인치", price: 299_000 },
      { name: "레노버 태블릿 M11", price: 249_000 },
      { name: "DOOGEE U11PRO 안드로이드 태블릿 11인치", price: 279_000 },
      { name: "태블릿 강화유리 보호필름 케이스", price: 12_900 },
    ],
    mustReject: ["태블릿 강화유리 보호필름 케이스"],
    mustKeep: ["삼성 갤럭시탭 A9+ 11인치", "레노버 태블릿 M11"],
    needsServiceableBrand: true,
  },
  {
    label: "TV 교체 (남편은 상황 설명)",
    categoryId: "appliance",
    scenarioLabel: "TV·디지털",
    priorityId: "performance",
    maxBudgetWon: 1_500_000,
    wish: "8년 쓴 거실 TV 교체, 남편은 스포츠 보고 6살 아이는 유튜브 보고 저는 드라마 봐요",
    pool: [
      { name: "삼성전자 4K Crystal UHD TV 65인치", price: 715_770 },
      { name: "LG 스마트 65인치 4K UHD TV", price: 677_000 },
      { name: "TV 벽걸이 브라켓 거치대", price: 29_000 },
    ],
    mustReject: ["TV 벽걸이 브라켓 거치대"],
    mustKeep: ["삼성전자 4K Crystal UHD TV 65인치", "LG 스마트 65인치 4K UHD TV"],
  },
  {
    label: "친구 생일 선물",
    categoryId: "gift",
    scenarioLabel: "친구 생일",
    priorityId: "design",
    maxBudgetWon: 100_000,
    wish: "회사 후배가 20대 여자친구 생일선물을 물어봐서 대신 찾아요, 사귄 지 1년 됐대요",
    pool: [
      { name: "wassup 여성은목걸이 순은999 베이직 펜던트", price: 58_600 },
      { name: "당근맘슬림 여성 미니 카드지갑 한손 지퍼", price: 10_840 },
      { name: "시들지 않는 진짜 꽃 프리저브드 유리돔 무드등", price: 51_900 },
      { name: "우드 캔들워머 무드등 향초 워머 램프", price: 50_900 },
    ],
    mustReject: [],
    mustKeep: [
      "wassup 여성은목걸이 순은999 베이직 펜던트",
      "당근맘슬림 여성 미니 카드지갑 한손 지퍼",
    ],
  },
  {
    label: "가을 니트 (팔토시·바지 섞임)",
    categoryId: "fashion",
    scenarioLabel: "일상복",
    priorityId: "performance",
    maxBudgetWon: 100_000,
    wish: "작년에 산 여성 니트가 두 번 빨고 보풀 나서 버렸어요, 세탁기에 그냥 돌릴 수 있는 가을 니트",
    pool: [
      { name: "해피제이 아이스 아웃도어 UV차단 팔토시 손등형", price: 9_900 },
      { name: "남성 정장 슬랙스 바지 검정", price: 39_000 },
      { name: "여성 라운드넥 캐시미어 니트", price: 69_000 },
      { name: "여성 케이블 꽈배기 스웨터", price: 55_000 },
    ],
    mustReject: [
      "해피제이 아이스 아웃도어 UV차단 팔토시 손등형",
      "남성 정장 슬랙스 바지 검정",
    ],
    mustKeep: ["여성 라운드넥 캐시미어 니트", "여성 케이블 꽈배기 스웨터"],
  },
  {
    label: "밥솥 브랜드 편중",
    categoryId: "appliance",
    scenarioLabel: "주방가전",
    priorityId: "performance",
    maxBudgetWon: 500_000,
    wish: "6인용 전기밥솥 추천해 주세요",
    pool: [
      { name: "쿠첸 IH압력밥솥 6인용 CRS-A601", price: 219_000 },
      { name: "쿠첸 브레인 6인용 전기압력밥솥", price: 239_000 },
      { name: "쿠첸 프리미엄 6인용 밥솥 골드", price: 259_000 },
      { name: "쿠쿠 트윈프레셔 6인용 전기압력밥솥", price: 289_000 },
      { name: "리큅 미니 6인용 전기밥솥", price: 129_000 },
    ],
    mustReject: [],
    mustKeep: ["쿠쿠 트윈프레셔 6인용 전기압력밥솥", "리큅 미니 6인용 전기밥솥"],
    maxSameBrand: 2,
  },
  {
    label: "공기청정기 (필터 소모품 섞임)",
    categoryId: "appliance",
    scenarioLabel: "계절·생활",
    priorityId: "performance",
    maxBudgetWon: 500_000,
    wish: "거실에 둘 공기청정기 33평형 찾아요",
    pool: [
      { name: "위닉스 타워 프리미엄 공기청정기 33평", price: 359_000 },
      { name: "삼성 블루스카이 공기청정기 대형", price: 429_000 },
      { name: "공기청정기 헤파필터 호환 교체용 2매", price: 24_900 },
      { name: "공기청정기 전용 탈취 필터 리필", price: 18_000 },
    ],
    mustReject: [
      "공기청정기 헤파필터 호환 교체용 2매",
      "공기청정기 전용 탈취 필터 리필",
    ],
    mustKeep: [
      "위닉스 타워 프리미엄 공기청정기 33평",
      "삼성 블루스카이 공기청정기 대형",
    ],
  },
  {
    label: "의류건조기 (식기세척기 아님)",
    categoryId: "appliance",
    scenarioLabel: "청소·세탁",
    priorityId: "convenience",
    maxBudgetWon: 1_500_000,
    wish: "빨래 널 곳이 없어서 의류건조기 알아봐요",
    pool: [
      { name: "LG 트롬 오브제컬렉션 의류건조기 20kg", price: 1_290_000 },
      { name: "삼성 그랑데 AI 건조기 17kg", price: 1_190_000 },
      { name: "쿠쿠 3인용 카운터탑 식기세척기", price: 329_000 },
      { name: "건조기 전용 향기시트 100매", price: 9_900 },
    ],
    mustReject: ["쿠쿠 3인용 카운터탑 식기세척기", "건조기 전용 향기시트 100매"],
    mustKeep: ["LG 트롬 오브제컬렉션 의류건조기 20kg", "삼성 그랑데 AI 건조기 17kg"],
  },
  {
    label: "70대 어머니 신발 (아는 제조사 필요)",
    categoryId: "fashion",
    scenarioLabel: "일상복",
    priorityId: "convenience",
    maxBudgetWon: 150_000,
    wish: "70대 어머니 편하게 신으실 신발 사드리려고요",
    pool: [
      { name: "아식스 여성 워킹화 젤 쿠션", price: 119_000 },
      { name: "프로스펙스 여성 컴포트 워킹화", price: 89_000 },
      { name: "노브랜드 여성 캐주얼 단화", price: 29_000 },
      { name: "아동 캐릭터 운동화 170", price: 35_000 },
    ],
    mustReject: ["아동 캐릭터 운동화 170"],
    mustKeep: ["아식스 여성 워킹화 젤 쿠션", "프로스펙스 여성 컴포트 워킹화"],
  },
  {
    label: "가습기 (소모품 섞임)",
    categoryId: "appliance",
    scenarioLabel: "계절·생활",
    priorityId: "convenience",
    maxBudgetWon: 200_000,
    wish: "아기 방에 둘 가습기 찾아요",
    pool: [
      { name: "미로 무필터 가습기 NR08M", price: 159_000 },
      { name: "위닉스 초음파 가습기 대용량", price: 89_000 },
      { name: "가습기 살균제 세정 타블렛 30정", price: 12_900 },
      { name: "가습기 전용 필터 교체용", price: 9_900 },
    ],
    mustReject: ["가습기 살균제 세정 타블렛 30정", "가습기 전용 필터 교체용"],
    mustKeep: ["미로 무필터 가습기 NR08M", "위닉스 초음파 가습기 대용량"],
  },
  {
    label: "조카 돌선물 (아동용이 맞음)",
    categoryId: "gift",
    scenarioLabel: "돌·백일",
    priorityId: "design",
    maxBudgetWon: 100_000,
    wish: "조카 돌선물 뭐가 좋을까요",
    pool: [
      { name: "아기 원목 장난감 오감 발달 세트", price: 59_000 },
      { name: "유아 아동 촉감 놀이 매트", price: 79_000 },
      { name: "성인 남성 가죽 벨트", price: 49_000 },
    ],
    mustReject: ["성인 남성 가죽 벨트"],
    mustKeep: ["아기 원목 장난감 오감 발달 세트", "유아 아동 촉감 놀이 매트"],
  },
  {
    label: "겨울 패딩 (여름옷 섞임)",
    categoryId: "fashion",
    scenarioLabel: "일상복",
    priorityId: "performance",
    maxBudgetWon: 300_000,
    wish: "올겨울 입을 여성 롱패딩 찾아요",
    pool: [
      { name: "여성 구스다운 롱패딩 블랙", price: 259_000 },
      { name: "여성 경량 다운점퍼 숏패딩", price: 159_000 },
      { name: "여름 냉감 린넨 패딩 조끼", price: 39_000 },
      { name: "패딩 전용 세탁 세제 중성", price: 8_900 },
    ],
    mustReject: ["여름 냉감 린넨 패딩 조끼", "패딩 전용 세탁 세제 중성"],
    mustKeep: ["여성 구스다운 롱패딩 블랙", "여성 경량 다운점퍼 숏패딩"],
  },
];

/** 후보에 붙일 설명. 실제 AI 가 쓰던 투를 흉내 낸다. */
function candidateFor(product: Product, index: number): QuickRecommendation {
  return {
    rank: index + 1,
    name: product.name,
    productName: product.name,
    price: product.price,
    reason: "적어 주신 조건에 맞춰 고른 후보입니다.",
    searchKeyword: "",
    qualitySummary: "",
    caution: "구매 전에 사양과 사용 조건을 한 번 더 확인해 주세요.",
    isRocket: index % 2 === 0,
    selectionType: (["best", "value", "reliable", "premium"] as const)[index % 4],
    selectionLabel: LABELS[
      (["best", "value", "reliable", "premium"] as const)[index % 4]
    ],
    scores: [
      { label: "성능", value: 90 - index * 4 },
      { label: "가격 부담", value: 50 },
      { label: "관리 편의", value: 85 - index * 3 },
      { label: "A/S 안심도", value: 80 - index * 2 },
    ],
    fitChecks: [
      { ok: true, text: "요청한 제품군에 해당함", source: "guide" as const },
    ],
  };
}

type Failure = { scenario: string; kind: string; detail: string };

function runScenario(scenario: Scenario): Failure[] {
  const failures: Failure[] = [];

  const audience =
    scenario.categoryId === "fashion" || scenario.categoryId === "gift"
      ? detectAudience(scenario.wish)
      : undefined;
  const targetItem = detectTargetItem(scenario.wish, scenario.scenarioLabel);
  const cleaning = detectCleaningNeed(scenario.wish, scenario.scenarioLabel);
  const occasion =
    scenario.categoryId === "fashion" ? detectOccasion(scenario.wish) : undefined;

  /*
    1) 상품 걸러 내기 — 화면에 나가는 것과 같은 판단을 쓴다.

    쿠팡 조회는 후보를 하나씩 순서대로 채우면서 이미 자리를 차지한
    브랜드를 다음 후보에서 건너뛴다. 여기서도 같은 순서로 돌지 않으면
    브랜드가 쏠리는 것을 못 잡는다.
  */
  const MAX_SAME_BRAND = 2;
  const brandCounts = new Map<string, number>();
  const cappedBrands = () => {
    const capped = new Set<string>();
    brandCounts.forEach((count, brand) => {
      if (count >= MAX_SAME_BRAND) capped.add(brand);
    });
    return capped;
  };

  const kept: Product[] = [];
  for (const product of scenario.pool) {
    const problem = productFitProblem(product.name, product.price, {
      audience,
      targetItem,
      occasion,
      cleaning,
      excludeBrands: cappedBrands(),
      maxPriceWon: scenario.maxBudgetWon,
    });

    if (!problem) {
      const brand = productBrandKey(product.name);
      if (brand) brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1);
    }

    if (!problem) kept.push(product);

    if (!problem && scenario.mustReject.includes(product.name)) {
      failures.push({
        scenario: scenario.label,
        kind: "걸러졌어야 하는데 통과",
        detail: product.name,
      });
    }
    if (problem && scenario.mustKeep.includes(product.name)) {
      failures.push({
        scenario: scenario.label,
        kind: "남아야 하는데 걸러짐",
        detail: `${product.name} — ${problem}`,
      });
    }
  }

  if (kept.length < 2) {
    failures.push({
      scenario: scenario.label,
      kind: "후보가 둘도 안 남음",
      detail: `${kept.length}개`,
    });
    return failures;
  }

  // 2) 나머지 파이프라인을 화면과 같은 순서로 돌린다.
  const candidates = kept.slice(0, 4).map(candidateFor);
  replaceWrongCautions(candidates, "판매처에서 확인해 주세요.", scenario.maxBudgetWon);
  const deduped = dropAccessories(candidates);

  const prices = deduped
    .map((item) => item.price)
    .filter((price): price is number => typeof price === "number");
  const withChecks = deduped.map((item) => ({
    ...item,
    fitChecks: derivedFitChecks(item, scenario.maxBudgetWon, {
      cheapestPrice: Math.min(...prices),
      priciestPrice: Math.max(...prices),
    }),
  }));

  const ordered = orderForDisplay(
    assignSelectionLabels(
      applyPriorityWeighting(
        applyPriceBurdenScores(withChecks, scenario.maxBudgetWon),
        scenario.categoryId,
        scenario.priorityId
      ),
      (type) => LABELS[type]
    )
  );

  // 3) 시나리오가 따로 요구한 것을 본다.
  if (scenario.needsServiceableBrand && !hasServiceableBrand(ordered)) {
    failures.push({
      scenario: scenario.label,
      kind: "서비스센터 있는 제조사가 후보에 없음",
      detail: ordered.map((item) => item.productName).join(" / "),
    });
  }

  if (scenario.maxSameBrand) {
    const counts = new Map<string, number>();
    for (const item of ordered) {
      const brand = item.productName ? productBrandKey(item.productName) : "";
      if (!brand) continue;
      counts.set(brand, (counts.get(brand) ?? 0) + 1);
    }
    counts.forEach((count, brand) => {
      if (count > (scenario.maxSameBrand as number)) {
        failures.push({
          scenario: scenario.label,
          kind: "같은 브랜드가 너무 많음",
          detail: `${brand} ${count}개`,
        });
      }
    });
  }

  // 4) 내보내기 직전 검증을 그대로 돌린다.
  for (const violation of verifyRecommendations(ordered, {
    categoryId: scenario.categoryId,
    priorityId: scenario.priorityId,
    audience,
    targetItem,
    occasion,
    cleaning,
    maxBudgetWon: scenario.maxBudgetWon,
  })) {
    failures.push({
      scenario: scenario.label,
      kind: "검증 규칙 위반",
      detail: `${violation.rule} — ${JSON.stringify(violation.detail)}`,
    });
  }

  return failures;
}

const quiet = console.warn;
console.warn = () => {};
const allFailures = SCENARIOS.flatMap(runScenario);
console.warn = quiet;

console.log(`시나리오 ${SCENARIOS.length}개를 돌렸습니다.\n`);

if (allFailures.length === 0) {
  console.log("어긋난 곳이 없습니다.");
  process.exit(0);
}

const byScenario = new Map<string, Failure[]>();
for (const failure of allFailures) {
  const list = byScenario.get(failure.scenario) ?? [];
  list.push(failure);
  byScenario.set(failure.scenario, list);
}

byScenario.forEach((list, scenario) => {
  console.log(`[${scenario}]`);
  for (const failure of list) {
    console.log(`  ${failure.kind}: ${failure.detail}`);
  }
  console.log("");
});

console.log(`어긋난 곳 ${allFailures.length}건`);
process.exit(1);
