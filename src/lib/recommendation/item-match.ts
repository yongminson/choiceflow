/**
 * 요청한 품목과 다른 상품을 후보에서 뺀다.
 *
 * "가을 니트"를 찾았는데 후보 넷 중 둘이 니트가 아니었다. 여름용 팔토시와
 * 정장 바지가 들어왔고, 그중 바지가 종합 1위로 올라갔다. 후보를 서로 다르게
 * 만들라는 지시를 품목까지 바꿔도 된다는 뜻으로 받아들인 탓이다.
 *
 * 후보가 서로 달라야 한다는 것은 같은 품목 안에서 소재·두께·가격대가
 * 다르라는 뜻이지, 니트를 찾는 사람에게 바지를 보여주라는 뜻이 아니다.
 *
 * 여기 적힌 품목만 걸러진다. 목록에 없는 말을 적었으면 아무것도 거르지
 * 않는다. 모르는 품목을 함부로 걸러 후보를 비우는 것보다 낫다.
 */

/**
 * 같은 것으로 볼 품목끼리 묶는다.
 * 첫 낱말이 대표 이름이고, 나머지는 같은 자리에 놓아도 되는 것들이다.
 */
const ITEM_GROUPS: string[][] = [
  // 상의
  ["니트", "스웨터", "가디건", "풀오버", "니트웨어", "knit", "sweater", "cardigan"],
  ["티셔츠", "티샤츠", "반팔티", "긴팔티", "tshirt", "t-shirt"],
  ["맨투맨", "스웨트셔츠", "스웻셔츠"],
  ["후드", "후드티", "후디", "hoodie"],
  ["셔츠", "남방", "블라우스", "shirt", "blouse"],
  // 아우터
  ["코트", "coat"],
  ["자켓", "재킷", "점퍼", "잠바", "블루종", "jacket"],
  ["패딩", "다운점퍼", "푸퍼", "padding"],
  ["조끼", "베스트", "vest"],
  // 하의
  ["바지", "팬츠", "슬랙스", "청바지", "데님", "조거", "pants", "jeans"],
  ["치마", "스커트", "skirt"],
  ["레깅스", "leggings"],
  // 한 벌
  ["원피스", "드레스", "dress"],
  // 신발
  ["운동화", "스니커즈", "sneakers"],
  ["구두", "로퍼", "힐"],
  ["부츠", "boots"],
  ["슬리퍼", "샌들", "쪼리"],
  // 잡화
  ["가방", "백팩", "토트백", "크로스백", "숄더백", "bag"],
  ["지갑", "wallet"],
  ["모자", "볼캡", "비니", "캡모자"],
  ["양말", "삭스", "socks"],
  ["목도리", "머플러", "스카프"],
  ["장갑", "gloves"],
  // 자주 찾는 생활가전
  ["에어프라이어", "에어프라이기"],
  ["청소기", "클리너"],
  ["전기포트", "커피포트", "티포트", "주전자"],
  ["가습기"],
  ["제습기"],
  ["공기청정기"],
  ["안마기", "마사지기", "안마의자"],
  ["전기장판", "온수매트", "전기요"],
];

export type TargetItem = {
  /** 대표 이름. 로그와 검증에 쓴다. */
  name: string;
  /** 상품명이 이 품목인지 보는 조건. */
  pattern: RegExp;
};

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 적어 주신 글에서 찾는 품목을 읽는다.
 *
 * 여러 품목이 나오면 정하지 않는다. "니트랑 바지"라고 적었는데 한쪽만
 * 남기면 나머지 절반을 버리는 셈이다.
 */
export function detectTargetItem(...texts: string[]): TargetItem | undefined {
  const haystack = texts.filter(Boolean).join(" ").toLowerCase();
  if (!haystack.trim()) return undefined;

  const hits = ITEM_GROUPS.filter((group) =>
    group.some((word) => haystack.includes(word.toLowerCase()))
  );
  if (hits.length !== 1) return undefined;

  const group = hits[0];
  return {
    name: group[0],
    pattern: new RegExp(group.map(escape).join("|"), "i"),
  };
}

/** 상품명이 찾는 품목에 해당하는지. */
export function matchesTargetItem(
  productName: string,
  target: TargetItem | undefined
): boolean {
  if (!target) return true;
  return target.pattern.test(productName);
}
