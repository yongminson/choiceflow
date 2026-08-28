/**
 * 적어 주신 글에서 "누가 쓸 것인지"를 읽어낸다.
 *
 * "여성 니트"라고 적었는데 후보 넷이 전부 아동복으로 나온 적이 있다.
 * 원인은 어린이 단서 목록에 나이를 뜻하는 "세"가 낱말째로 들어 있어
 * "세탁기"의 "세"에 걸린 것이었다. 성별은 맞게 읽고 연령을 잘못 읽어
 * "여성"이 "여아"가 되었다.
 *
 * 그래서 낱말을 그냥 포함 여부로 찾지 않는다. 흔한 말 안에 숨어 있는
 * 글자에 걸리지 않도록, 걸리면 안 되는 쓰임을 하나씩 빼 둔 형태로 찾는다.
 *
 * 옷과 선물은 대상이 어긋나면 그 추천 자체가 못 쓰는 것이 된다.
 * 그래서 AI 에게 맡기지 않고 여기서 직접 뽑아 검색어에 넣고,
 * 대상이 다른 상품은 결과에서 뺀다.
 */

/**
 * 나이는 숫자에 붙어 있을 때만 나이로 본다.
 * "7세"는 나이지만 "세탁기"의 "세"는 아니고, "6살"은 나이지만 "살림"은 아니다.
 */
const CHILD_PATTERNS: RegExp[] = [
  /\d\s*살/,
  /\d\s*세\b|\d\s*세[^련탁트일심]/,
  // "아이"는 아이보리·아이템·아이폰처럼 다른 말의 앞머리로 자주 쓰인다.
  /아이(?!보리|템|폰|패드|스|라인|디어|콘|돌|리)/,
  /애기|돌쟁이|신생아/,
  /유치원|어린이집|어린이|초등|미취학/,
  /유아|아동|키즈|주니어/,
  /조카|손주|손녀|손자/,
];

/** 어른이 쓸 것이 분명한 말. 이게 있으면 나이 단서가 있어도 어른으로 본다. */
const ADULT_PATTERNS: RegExp[] = [/남편|아내|와이프|신랑|각시/, /직장|출근|회사/, /성인/];

const MALE_PATTERNS: RegExp[] = [
  // "남아"는 "재고가 남아있는"처럼 성별과 무관하게도 쓰인다.
  /남아(?!있|잇|서|도|나|야|남)/,
  /남자아이|사내아이|아들|남학생|남성|남자|남친|남편/,
];

const FEMALE_PATTERNS: RegExp[] = [
  // "딸"은 "딸기"의 앞머리로 더 자주 쓰인다.
  /딸(?!기|랑|깍|꾹)/,
  /여아|여자아이|여학생|여성|여자|여친|아내|와이프/,
];

/** 남녀 모두를 가리키는 말. 이게 있으면 한쪽으로 정하지 않는다. */
const UNISEX_PATTERNS: RegExp[] = [/남녀공용|남여공용|남녀|유니섹스/];

export type Gender = "male" | "female" | "unknown";
export type AgeGroup = "adult" | "child" | "unknown";

export type DetectedAudience = {
  gender: Gender;
  ageGroup: AgeGroup;
  /** 검색어에 넣을 말. 예: "여성", "남아". 넣을 것이 없으면 비어 있다. */
  term: string;
  /** 상품명에 이게 있으면 대상이 다른 상품으로 본다. */
  rejectPattern: RegExp;
};

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

/** 상품명에 붙는 아동복 표시. 성인 요청에서는 이런 상품을 쓰지 않는다. */
const CHILD_PRODUCT_MARKS =
  /키즈|주니어|아동|유아|여아|남아|어린이|초등|베이비|baby|kids|junior/i;

/**
 * "100~150", "110-140" 같은 아동복 사이즈 범위 표기.
 * 두 값이 모두 아동복 치수대일 때만 아동 상품으로 본다.
 */
const SIZE_RANGE = /(\d{2,3})\s*[~\-–]\s*(\d{2,3})/;

export function hasChildSizeRange(productName: string): boolean {
  const match = SIZE_RANGE.exec(productName);
  if (!match) return false;
  const from = Number(match[1]);
  const to = Number(match[2]);
  return from >= 60 && to <= 180 && from < to;
}

/** 성인 요청에서 걸러야 하는 상품인지. */
export function isChildProduct(productName: string): boolean {
  return CHILD_PRODUCT_MARKS.test(productName) || hasChildSizeRange(productName);
}

const ADULT_PRODUCT_MARKS = /성인용|성인|남성용|여성용|남성|여성/;

/**
 * 적어 주신 글에서 대상을 읽는다. 확실하지 않으면 정하지 않는다.
 * 잘못 짚은 대상으로 거르는 것이 안 거르는 것보다 나쁘기 때문이다.
 */
export function detectAudience(wish: string): DetectedAudience | undefined {
  const text = wish.trim();
  if (!text) return undefined;

  const unisex = matchesAny(text, UNISEX_PATTERNS);
  const male = !unisex && matchesAny(text, MALE_PATTERNS);
  const female = !unisex && matchesAny(text, FEMALE_PATTERNS);
  // 양쪽이 다 나오거나 둘 다 없으면 성별은 모르는 것으로 둔다.
  const gender: Gender = male === female ? "unknown" : male ? "male" : "female";

  const adultEvidence = matchesAny(text, ADULT_PATTERNS);
  const childEvidence = matchesAny(text, CHILD_PATTERNS);
  const ageGroup: AgeGroup = adultEvidence
    ? "adult"
    : childEvidence
      ? "child"
      : gender === "unknown"
        ? "unknown"
        : // 성별만 적고 나이 이야기가 없으면 어른으로 본다.
          "adult";

  if (gender === "unknown" && ageGroup === "unknown") return undefined;

  return {
    gender,
    ageGroup,
    term: termFor(gender, ageGroup),
    rejectPattern: rejectPatternFor(gender, ageGroup),
  };
}

function termFor(gender: Gender, ageGroup: AgeGroup): string {
  if (ageGroup === "child") {
    if (gender === "male") return "남아";
    if (gender === "female") return "여아";
    return "아동";
  }
  if (gender === "male") return "남성";
  if (gender === "female") return "여성";
  return "";
}

const FEMALE_ONLY_MARKS = [
  "여아", "여자", "여성", "여아용", "여성용", "소녀", "걸스", "girls", "girl",
  "공주", "프린세스", "princess",
  "티니핑", "시크릿쥬쥬", "쥬쥬", "엘사", "겨울왕국", "라푼젤", "아리엘",
  "헬로키티", "키티", "산리오", "마이멜로디", "쿠로미", "미니마우스",
];

const MALE_ONLY_MARKS = [
  "남아", "남자", "남성", "남아용", "남성용", "소년", "보이즈", "boys", "boy",
  "파워레인저", "또봇", "카봇", "헬로카봇", "미니특공대", "스파이더맨",
  "아이언맨", "헐크", "배트맨", "울트라맨",
];

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rejectPatternFor(gender: Gender, ageGroup: AgeGroup): RegExp {
  const parts: string[] = [];
  if (gender === "male") parts.push(...FEMALE_ONLY_MARKS.map(escape));
  if (gender === "female") parts.push(...MALE_ONLY_MARKS.map(escape));
  if (ageGroup === "adult") parts.push(CHILD_PRODUCT_MARKS.source);
  if (ageGroup === "child") parts.push(ADULT_PRODUCT_MARKS.source);
  // 걸러낼 것이 없으면 아무것도 걸리지 않는 패턴을 준다.
  return parts.length > 0 ? new RegExp(parts.join("|"), "i") : /(?!)/;
}

/**
 * 상품명이 이 요청의 대상과 맞는지 본다.
 * 사이즈 범위 표기는 정규식 하나로 담기 어려워 따로 확인한다.
 */
export function isWrongAudience(
  productName: string,
  audience: DetectedAudience
): boolean {
  if (audience.rejectPattern.test(productName)) return true;
  return audience.ageGroup === "adult" && hasChildSizeRange(productName);
}

/**
 * 검색어에 대상을 넣는다.
 *
 * "아동용"·"키즈"처럼 대상이 뭉뚱그려진 말이 이미 있으면 그 자리를 대신한다.
 * 없으면 앞에 붙인다. 이미 들어 있으면 그대로 둔다.
 */
export function applyAudienceToKeyword(
  keyword: string,
  audience: DetectedAudience | undefined
): string {
  if (!audience?.term) return keyword;
  if (keyword.includes(audience.term)) return keyword;

  const generic = ["아동용", "아동", "키즈", "유아용", "유아", "성인용", "남녀공용"];
  for (const word of generic) {
    if (keyword.includes(word)) {
      return keyword.replace(word, audience.term).replace(/\s+/g, " ").trim();
    }
  }
  return `${audience.term} ${keyword}`.trim();
}
