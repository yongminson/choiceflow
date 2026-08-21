/**
 * 적어 주신 글에서 성별을 읽어낸다.
 *
 * "6살 남아 유치원 신을 가을 운동화"라고 적었는데 분홍색 여아 캐릭터
 * 운동화가 걸린 화면이 나갔다. AI 가 쓴 설명에는 "6살 남아를 위해"가
 * 정확히 들어 있었는데, 쿠팡 검색어가 "아동용 벨크로 운동화"였다.
 * 검색어에서 성별이 빠지니 검색 결과에 성별이 반영될 리가 없다.
 *
 * 옷과 선물은 성별이 어긋나면 그 추천은 그냥 못 쓰는 것이 된다.
 * 그래서 AI 에게 맡기지 않고 적어 주신 글에서 직접 뽑아 검색어에 넣고,
 * 반대 성별로 보이는 상품은 결과에서 뺀다.
 */

const MALE_WORDS = ["남아", "남자아이", "사내아이", "아들", "남학생", "남성", "남자", "남친", "남편"];
const FEMALE_WORDS = ["여아", "여자아이", "딸", "여학생", "여성", "여자", "여친", "아내", "와이프"];

/** 어린이를 가리키는 말이 함께 있으면 "남성"이 아니라 "남아"로 쓴다. */
const CHILD_HINTS = ["살", "세", "아이", "애기", "유치원", "어린이집", "초등", "유아", "키즈", "아동", "조카", "손주"];

/** 남녀 모두를 가리키는 말. 이게 있으면 한쪽으로 정하지 않는다. */
const UNISEX_WORDS = ["남녀공용", "남여공용", "남녀", "공용", "유니섹스"];

/**
 * "남아"는 "재고가 남아있는"처럼 성별과 무관하게 쓰이기도 한다.
 * 뒤에 이런 글자가 붙으면 성별로 읽지 않는다.
 */
const LEFTOVER_SUFFIX = /남아(있|잇|서|도|나|야)/;

export type DetectedGender = {
  /** 검색어에 넣을 말. 예: "남아", "여성" */
  term: string;
  /** 상품명에 이게 들어 있으면 반대 성별로 본다. */
  rejectPattern: RegExp;
};

const FEMALE_ONLY_MARKS = [
  "여아", "여자", "여성", "여아용", "여성용", "소녀", "걸스", "girls", "girl",
  "공주", "프린세스", "princess",
  // 여아용으로 널리 알려진 캐릭터. 이름만 봐도 성별이 갈린다.
  "티니핑", "시크릿쥬쥬", "쥬쥬", "엘사", "겨울왕국", "라푼젤", "아리엘",
  "헬로키티", "키티", "산리오", "마이멜로디", "쿠로미", "미니마우스",
];

const MALE_ONLY_MARKS = [
  "남아", "남자", "남성", "남아용", "남성용", "소년", "보이즈", "boys", "boy",
  // 남아용으로 널리 알려진 캐릭터.
  "파워레인저", "또봇", "카봇", "헬로카봇", "미니특공대", "스파이더맨",
  "아이언맨", "헐크", "배트맨", "울트라맨",
];

function toPattern(words: string[]): RegExp {
  return new RegExp(words.map(escape).join("|"), "i");
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function includesAny(haystack: string, words: string[]): boolean {
  return words.some((word) => haystack.includes(word));
}

/**
 * 적어 주신 글에서 성별을 읽는다. 확실하지 않으면 아무것도 돌려주지 않는다.
 * 잘못 짚은 성별로 거르는 것이 안 거르는 것보다 나쁘기 때문이다.
 */
export function detectGender(wish: string): DetectedGender | undefined {
  const text = wish.trim();
  if (!text) return undefined;
  if (includesAny(text, UNISEX_WORDS)) return undefined;

  /*
    "남아"는 "재고가 남아있는"처럼 성별과 무관하게도 쓰인다. 그런 쓰임이면
    남성 근거에서 뺀다. 다만 "남성"처럼 다른 근거가 따로 있으면 그것은 살린다.
  */
  const maleWords = MALE_WORDS.filter((word) => text.includes(word)).filter(
    (word) => word !== "남아" || !LEFTOVER_SUFFIX.test(text)
  );
  const male = maleWords.length > 0;
  const female = includesAny(text, FEMALE_WORDS);
  // 양쪽이 다 나오면 누구 것인지 알 수 없다.
  if (male === female) return undefined;

  const child = includesAny(text, CHILD_HINTS);
  const term = male ? (child ? "남아" : "남성") : child ? "여아" : "여성";

  return {
    term,
    rejectPattern: toPattern(male ? FEMALE_ONLY_MARKS : MALE_ONLY_MARKS),
  };
}

/**
 * 검색어에 성별을 넣는다.
 *
 * "아동용"·"키즈"처럼 성별이 없는 말이 이미 있으면 그 자리를 대신한다.
 * 없으면 앞에 붙인다. 이미 성별이 들어 있으면 그대로 둔다.
 */
export function applyGenderToKeyword(
  keyword: string,
  gender: DetectedGender | undefined
): string {
  if (!gender) return keyword;
  if (keyword.includes(gender.term)) return keyword;

  const generic = ["아동용", "아동", "키즈", "유아용", "유아", "성인용", "남녀공용"];
  for (const word of generic) {
    if (keyword.includes(word)) {
      return keyword.replace(word, gender.term).replace(/\s+/g, " ").trim();
    }
  }
  return `${gender.term} ${keyword}`.trim();
}
