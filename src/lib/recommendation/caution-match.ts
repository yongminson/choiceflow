/**
 * 감수할 점이 실제로 붙은 상품 이야기인지 본다.
 *
 * 전기요를 추천해 놓고 "동절기 보관 시 물 빠짐 과정이 번거로울 수 있습니다"
 * 라는 단점이 붙어 나갔다. 물을 빼는 것은 온수매트 이야기다. 전기요에는
 * 뺄 물이 없다.
 *
 * 왜 이런 일이 생기냐면, AI 는 "전기요" 같은 이름만 지어 놓고 단점까지
 * 함께 쓰는데, 실제 상품은 그 뒤에 서버가 쿠팡에서 찾아 붙이기 때문이다.
 * AI 가 머릿속에 그린 물건과 화면에 실린 물건이 다를 수 있다.
 *
 * 단점은 이 서비스가 다른 추천과 갈리는 지점이라 틀린 채로 두면 안 된다.
 * 맞는 단점을 새로 지어낼 방법은 없으니, 확실히 어긋난 것만 걷어낸다.
 * 걷어낸 자리는 부르는 쪽에서 일반 문구로 채운다.
 *
 * 애매한 것은 건드리지 않는다. 맞는 단점을 잘못 지우면 카드에서 단점이
 * 사라지는데, 그것이 틀린 단점 하나보다 나쁘다.
 */

/**
 * 특정 방식의 제품에만 해당하는 말.
 *
 * `marks` 에 적힌 말이 단점에 나오면, 상품명이 `products` 중 하나여야
 * 한다. 아니면 그 단점은 다른 물건 이야기다.
 */
const EXCLUSIVE_TERMS: { marks: RegExp; products: RegExp; what: string }[] = [
  {
    // 물을 순환시키는 제품에만 있는 이야기
    marks: /물\s*빠짐|물빠짐|물\s*배출|배수|급수|물통|물\s*순환|보일러|누수|물을\s*빼/,
    products: /온수|워터|물\s*순환/,
    what: "물을 순환시키는 제품",
  },
  {
    marks: /전자파|EMF/i,
    products: /전기|온열|매트|장판|요|담요|카페트|히터/,
    what: "전기로 열을 내는 제품",
  },
  {
    marks: /필터\s*교체|필터\s*값|필터\s*비용|필터를\s*갈/,
    products: /청정|정수|필터|청소기|가습|제습|에어/,
    what: "필터를 쓰는 제품",
  },
  {
    marks: /배터리\s*수명|충전\s*시간|완충|주행\s*거리/,
    products: /무선|충전|배터리|코드리스|휴대/,
    what: "충전해 쓰는 제품",
  },
  {
    marks: /소음|dB|데시벨/,
    products: /청소|가습|제습|청정|선풍|에어|세탁|건조|냉장|모터|팬|믹서|블렌더/,
    what: "모터나 팬이 도는 제품",
  },
];

/**
 * 이 단점이 이 상품 이야기가 아닌지.
 *
 * 상품명을 모르면 판단하지 않는다. 확인할 수 없는 것을 틀렸다고 할 수 없다.
 */
export function isWrongCaution(
  caution: string | undefined,
  productName: string | undefined
): boolean {
  if (!caution || !productName) return false;

  return EXCLUSIVE_TERMS.some(
    ({ marks, products }) => marks.test(caution) && !products.test(productName)
  );
}

/**
 * 상품과 맞지 않는 단점을 일반 문구로 바꾼다.
 *
 * 상품을 붙인 뒤에 부른다. 붙이기 전에는 무엇과 견줄지가 없다.
 * 자리를 비우지 않는 것이 중요하다. 단점 칸이 비면 좋은 점만 남은
 * 카드가 되는데, 그것이 이 화면에서 가장 피하려던 모습이다.
 */
export function replaceWrongCautions(
  items: { caution?: string; productName?: string; name: string }[],
  fallback: string
): void {
  for (const item of items) {
    if (!item.caution || !item.productName) continue;
    const reason = wrongCautionReason(item.caution, item.productName);
    if (!reason) continue;

    console.warn("[recommend] 상품과 맞지 않는 단점을 바꿉니다.", {
      name: item.name,
      productName: item.productName,
      caution: item.caution,
      reason,
    });
    item.caution = fallback;
  }
}

/** 어긋난 이유를 로그에 적기 위한 설명. */
export function wrongCautionReason(
  caution: string,
  productName: string
): string | undefined {
  const hit = EXCLUSIVE_TERMS.find(
    ({ marks, products }) => marks.test(caution) && !products.test(productName)
  );
  return hit ? `${hit.what}에만 해당하는 내용` : undefined;
}
