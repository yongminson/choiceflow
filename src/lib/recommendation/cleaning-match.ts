/**
 * 청소기는 "청소기"라는 낱말만으로는 같은 물건이 되지 않는다.
 *
 * "손걸레질 대신 쓸 물걸레 청소기, 6살 아이가 바닥에서 놀아서 자주 닦아야
 * 해요"라고 적었는데 후보 넷 중 하나만 물걸레 청소기였다. 유리창 청소
 * 로봇이 종합 1위로 올라갔고, 진공청소기와 스팀청소기가 나머지를 채웠다.
 *
 * 품목 필터는 상품명에 "청소기"가 있는지만 봤다. 유리창 청소 로봇도
 * 상품명에 청소기가 들어가니 그대로 통과했다. 바닥을 닦겠다는 사람에게
 * 창문 닦는 기계를 권한 셈이다.
 *
 * 청소기는 두 축으로 갈린다.
 *   무엇을 — 바닥 / 창문 / 침구 / 의류
 *   어떻게 — 진공 / 물걸레 / 스팀 / 로봇
 *
 * 무엇을 닦는지가 어긋나면 아예 쓸 수 없는 물건이다. 바닥을 닦으려는
 * 사람에게 유리창 로봇은 대안이 아니라 잘못 온 상품이다. 그래서 뺀다.
 *
 * 어떻게 닦는지는 다르다. 물걸레를 찾았어도 "진공을 같이 되는 것"은
 * 생각해 볼 만한 대안이다. 그래서 아예 막지 않고 한 개까지만 허용한다.
 * 넷 중 셋이 다른 방식이면 그건 대안이 아니라 요청을 못 읽은 것이다.
 */

export type CleaningSurface = "floor" | "window" | "bedding" | "clothes";
export type CleaningMethod = "vacuum" | "mop" | "steam" | "robot";

export type CleaningNeed = {
  surface?: CleaningSurface;
  method?: CleaningMethod;
};

/** 적어 주신 글에서 무엇을 닦으려는지 읽는다. */
const SURFACE_WISH: [RegExp, CleaningSurface][] = [
  [/유리창|창문|베란다|샤시|새시|창틀/, "window"],
  [/침구|이불|매트리스|진드기|침대\s*청소/, "bedding"],
  [/의류|옷\s*세탁|빨래|세탁물/, "clothes"],
  [/바닥|마루|장판|거실|걸레질|방\s*닦/, "floor"],
];

/** 상품명에서 무엇을 닦는 물건인지 읽는다. */
const SURFACE_PRODUCT: [RegExp, CleaningSurface][] = [
  [/유리창|창문|베란다|샤시|새시|창틀|유리\s*닦/, "window"],
  [/침구|이불|매트리스|진드기|침대용/, "bedding"],
  [/의류\s*관리|스타일러|건조기|세탁기/, "clothes"],
];

const METHOD_WISH: [RegExp, CleaningMethod][] = [
  [/물걸레|걸레질|물\s*청소|밀대/, "mop"],
  [/스팀|고온\s*살균/, "steam"],
  [/로봇/, "robot"],
  [/진공|흡입|먼지\s*흡/, "vacuum"],
];

const METHOD_PRODUCT: [RegExp, CleaningMethod][] = [
  [/로봇/, "robot"],
  [/스팀/, "steam"],
  [/물걸레|걸레|밀대|water/i, "mop"],
  [/진공|흡입|무선\s*청소기|스틱\s*청소기/, "vacuum"],
];

function firstMatch<T>(pairs: [RegExp, T][], text: string): T | undefined {
  return pairs.find(([pattern]) => pattern.test(text))?.[1];
}

/**
 * 청소 요청인지, 그렇다면 무엇을 어떻게 닦으려는지 읽는다.
 *
 * 청소 이야기가 아니면 undefined 를 돌려준다. 밥솥을 찾는 사람에게
 * 이 잣대를 들이댈 이유가 없다.
 */
export function detectCleaningNeed(
  ...texts: string[]
): CleaningNeed | undefined {
  const haystack = texts.filter(Boolean).join(" ");
  if (!haystack.trim()) return undefined;
  if (!/청소|걸레|닦|먼지|흡입/.test(haystack)) return undefined;

  const need: CleaningNeed = {
    surface: firstMatch(SURFACE_WISH, haystack),
    method: firstMatch(METHOD_WISH, haystack),
  };
  return need.surface || need.method ? need : undefined;
}

/** 상품이 무엇을 닦는 물건인지. 표시가 없으면 바닥용으로 본다. */
export function productSurface(productName: string): CleaningSurface {
  return firstMatch(SURFACE_PRODUCT, productName) ?? "floor";
}

/** 상품이 어떤 방식인지. 알 수 없으면 undefined. */
export function productMethod(
  productName: string
): CleaningMethod | undefined {
  return firstMatch(METHOD_PRODUCT, productName);
}

/**
 * 이 상품을 후보에 올리면 안 되는지.
 *
 * blockOffMethod 가 true 면 방식이 다른 것도 뺀다. 다른 방식 하나를
 * 이미 후보에 넣었을 때 부르는 쪽에서 켠다.
 */
export function isWrongCleaning(
  productName: string,
  need: CleaningNeed | undefined,
  blockOffMethod = false
): boolean {
  if (!need) return false;

  // 무엇을 닦는지가 어긋나면 쓸 수 없는 물건이다.
  if (need.surface && productSurface(productName) !== need.surface) return true;

  if (!blockOffMethod || !need.method) return false;
  const method = productMethod(productName);
  // 방식을 알 수 없는 상품은 막지 않는다. 모르는 것을 틀렸다고 할 수 없다.
  return method !== undefined && method !== need.method;
}

/** 이 상품이 요청한 방식과 다른지. 몇 개나 들어왔는지 세는 데 쓴다. */
export function isOffMethod(
  productName: string,
  need: CleaningNeed | undefined
): boolean {
  if (!need?.method) return false;
  const method = productMethod(productName);
  return method !== undefined && method !== need.method;
}
