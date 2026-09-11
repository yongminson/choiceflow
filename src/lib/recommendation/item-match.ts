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
  /*
    전기로 데우는 것과 물을 순환시키는 것은 다른 물건이다.

    한 묶음으로 두었더니 전기요를 찾는 사람에게 온수매트가 올라왔고,
    "동절기 물 빠짐이 번거롭다"는 온수매트 단점이 전기요 카드에 붙었다.
    쓰는 방식도 관리도 값도 달라서 같은 자리에 놓을 물건이 아니다.
  */
  ["전기요", "전기장판", "전기매트", "온열매트"],
  ["온수매트", "온수요", "워터매트"],
  // 방석은 앉는 것이다. 누워 쓰는 요·매트와 같은 자리에 두지 않는다.
  ["전기방석", "온열방석", "방석"],
];

/**
 * 한 상품에 같이 있으면 안 되는 품목끼리 묶는다.
 *
 * "전기방석 카본 온열 소파 전기요"가 전기요를 찾는 사람에게 올라왔다.
 * 이름에 전기요가 들어 있어 걸러지지 않았지만 실제로는 소파에 까는
 * 방석이고, 침대에서 아이와 쓰겠다는 요청과는 맞지 않는다.
 *
 * 이름에 두 품목이 함께 있으면 어느 쪽인지 알 수 없다. 그럴 때는
 * 후보에서 뺀다. 여기 적힌 짝끼리만 본다. 품목 이름이 겹치는 것은
 * 흔한 일이라 아무 데나 적용하면 멀쩡한 상품까지 사라진다.
 * "니트 원피스"처럼 둘 다 맞는 이름도 있기 때문이다.
 */
const CONFLICTING_GROUPS: string[][] = [
  ["전기요", "온수매트", "전기방석"],
];

export type TargetItem = {
  /** 대표 이름. 로그와 검증에 쓴다. */
  name: string;
  /** 상품명이 이 품목인지 보는 조건. */
  pattern: RegExp;
  /** 이것이 함께 있으면 다른 품목이다. */
  conflict?: RegExp;
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

  /*
    이 품목과 헷갈리면 안 되는 말을 모은다. 같은 짝에 묶인 다른 품목의
    낱말이 상품명에 함께 있으면 어느 쪽인지 알 수 없다.
  */
  const rivals = CONFLICTING_GROUPS.filter((pair) =>
    pair.includes(group[0])
  ).flatMap((pair) =>
    ITEM_GROUPS.filter(
      (other) => other !== group && pair.includes(other[0])
    ).flat()
  );

  return {
    name: group[0],
    pattern: new RegExp(group.map(escape).join("|"), "i"),
    conflict:
      rivals.length > 0
        ? new RegExp(rivals.map(escape).join("|"), "i")
        : undefined,
  };
}

/** 상품명이 찾는 품목에 해당하는지. */
export function matchesTargetItem(
  productName: string,
  target: TargetItem | undefined
): boolean {
  if (!target) return true;
  if (!target.pattern.test(productName)) return false;
  // 이름에 다른 품목까지 함께 적혀 있으면 어느 쪽인지 알 수 없다.
  return !target.conflict?.test(productName);
}
