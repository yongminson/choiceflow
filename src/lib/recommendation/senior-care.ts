/**
 * 나이 든 분이 쓸 물건이면 무엇이 중요한지가 달라진다.
 *
 * "70대 부모님이 유튜브랑 손주 영상통화만 하실 태블릿"이라고 적었는데
 * 후보 넷이 전부 이름을 처음 듣는 브랜드였다. 쿠팡 검색 상위가 저가
 * 제품으로 채워지면 그대로 넷이 된다.
 *
 * 값만 보면 맞는 후보다. 그런데 이 상황에서 실제로 갈리는 것은 값이
 * 아니라 다른 쪽이다. 고장 났을 때 들고 갈 곳이 가까운지, 쓰던 것과
 * 화면이 비슷한지, 자식이 원격으로 도와줄 수 있는지다. 서비스센터가
 * 전국에 있는 제품과 판매자에게 택배로 보내야 하는 제품은 같은 값이라도
 * 같은 물건이 아니다.
 *
 * 그래서 이런 요청에서는 이름이 알려진 제조사 하나를 따로 찾아 후보에
 * 넣는다. 그것을 고르라는 뜻이 아니라, 견줄 대상을 화면에 두자는 것이다.
 */

/** 적어 준 글에 이런 말이 있으면 나이 든 분이 쓸 물건으로 본다. */
const SENIOR_PATTERNS: RegExp[] = [
  /\b(6|7|8|9)\d\s*대\b/,
  /\d{2,3}\s*세\s*(이상|가까운|되신|되시는)/,
  /어르신|노인|시니어|고령/,
  /부모님|아버지|어머니|아빠|엄마|장인|장모|시부모|친정\s*부모/,
  /할머니|할아버지|조부모/,
  /은퇴하신|연세\s*드신|연로하신/,
];

/**
 * 부모님이라고 적었어도 본인이 쓸 물건이면 해당하지 않는다.
 * "부모님 댁에 둘 나" 같은 문장까지 걸러 내지는 못하므로, 확실히
 * 아닌 것만 뺀다.
 */
const NOT_SENIOR_PATTERNS: RegExp[] = [
  /부모님\s*(께|한테)?\s*(드릴|선물)/,
  /예비\s*부모|새내기\s*부모|초보\s*부모/,
];

export function needsSeniorCare(...texts: string[]): boolean {
  const haystack = texts.filter(Boolean).join(" ");
  if (!haystack.trim()) return false;
  if (NOT_SENIOR_PATTERNS.some((pattern) => pattern.test(haystack))) {
    /*
      선물로 드리는 것도 결국 그분이 쓰신다. 그래서 빼지 않고 그대로 둔다.
      여기 걸리는 것은 "예비 부모"처럼 나이와 상관없는 말뿐이다.
    */
    if (/예비|새내기|초보/.test(haystack)) return false;
  }
  return SENIOR_PATTERNS.some((pattern) => pattern.test(haystack));
}

/**
 * 국내에 서비스센터를 두고 있어 들고 갈 곳이 있는 제조사.
 *
 * 품질이 더 좋다는 뜻이 아니다. 고장 났을 때 어디로 가면 되는지가
 * 분명하다는 뜻이다. 나이 든 분에게는 그 차이가 값보다 클 수 있다.
 */
const SERVICEABLE_BRANDS: string[] = [
  "삼성",
  "갤럭시",
  "LG",
  "엘지",
  "애플",
  "아이패드",
  "위니아",
  "대우",
  "쿠쿠",
  "쿠첸",
  "코웨이",
  "SK매직",
  "청호나이스",
  "한샘",
  "현대",
  "레노버",
  "샤오미",
];

const SERVICEABLE_PATTERN = new RegExp(
  SERVICEABLE_BRANDS.map((brand) =>
    brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  ).join("|"),
  "i"
);

/** 서비스센터를 찾아갈 수 있는 제조사의 상품인지. */
export function isServiceableBrand(productName: string): boolean {
  return SERVICEABLE_PATTERN.test(productName);
}

/** 후보 중에 그런 상품이 하나라도 있는지. */
export function hasServiceableBrand(
  items: { productName?: string }[]
): boolean {
  return items.some(
    (item) => item.productName && isServiceableBrand(item.productName)
  );
}

/**
 * 이름이 알려진 제조사 쪽으로 검색어를 돌린다.
 *
 * 검색어에 제조사 이름을 넣지는 않는다. 특정 회사를 밀어 주는 것이
 * 되고, 그 회사가 그 품목을 안 만들면 아예 결과가 비어 버린다.
 * 대신 그런 제품이 상위에 걸리기 쉬운 말을 붙인다.
 */
export function seniorFriendlyKeyword(keyword: string): string {
  if (/브랜드|정품|서비스센터|국내/.test(keyword)) return keyword;
  return `국내 브랜드 ${keyword}`;
}
