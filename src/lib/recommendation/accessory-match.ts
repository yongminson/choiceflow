/**
 * 본체 자리에 부속품이 들어오는 것을 막는다.
 *
 * 로봇청소기를 바꾸겠다는 요청에 "Deebot Ozmo T9 T8 T5 N5 N8 DJ65"가
 * 11,990원으로 후보에 올랐다. 로봇청소기가 아니라 거기 끼우는 호환
 * 물걸레 패드다. 그런데 설명은 "검증된 내구성"이라 적혔고 단점에는
 * "브랜드 프리미엄으로 가격이 다소 높게 책정될 수 있습니다"가 붙었다.
 * 11,990원짜리에 값이 높다고 적은 셈이다.
 *
 * AI 는 "검증 우선 후보"라는 자리를 채울 글을 먼저 쓰고, 서버가 나중에
 * 상품을 붙인다. 붙은 것이 부속품이어도 글은 본체 이야기 그대로 남는다.
 *
 * 부속품은 "관점이 다른 선택지"가 아니다. 살 물건 자체가 다르다.
 * 수를 채우려고 넣느니 후보를 줄이는 편이 낫다.
 */

/**
 * 상품명에 이런 말이 있으면 본체가 아니라 거기 딸린 물건이다.
 *
 * 처음에는 패드·필터·브러시만 적어 두었다. 그랬더니 식기세척기를 찾는
 * 요청에 "식기세척기 세제" 셋과 "식기세척기 바구니"가 후보로 올라왔다.
 * 상품명에 품목 이름이 그대로 들어 있어 품목 필터도 통과했다.
 *
 * 쓰는 물건에는 함께 쓰는 소모품이 딸려 있고, 그 이름에는 거의 항상
 * 본체 이름이 붙는다. 그래서 여기에 적는 말을 넉넉히 둔다.
 */
const ACCESSORY_MARKS =
  /호환|리필|소모품|교체용|정품\s*부품|전용\s*패드|물걸레\s*패드|걸레\s*패드|극세사\s*패드|먼지봉투|더스트백|필터\s*세트|헤파필터|브러시|브러쉬|솔\s*세트|청소솔|세척솔|거치대|충전\s*거치|케이스|파우치|커버|보호\s*필름|어댑터|충전기|배터리\s*팩|노즐|연장\s*호스|물통|받침대|스탠드|부품|악세사리|액세서리/;

/**
 * 함께 쓰는 소모품. 본체와 이름이 겹치지만 사는 물건이 다르다.
 *
 * "식기세척기세제"처럼 띄어쓰기 없이 붙는 경우가 많아 앞뒤를 묶지 않는다.
 * 다만 "세제통 일체형 세탁기"처럼 본체 설명에 쓰이는 경우가 있어,
 * 아래 BODY_MARKS 가 함께 있으면 본체로 본다.
 */
const CONSUMABLE_MARKS =
  /세제|세정제|세척제|린스|린스젤|헹굼제|타블렛|캡슐\s*세제|파우더|액상\s*세제|정제형|살균\s*티슈|탈취제|방향제|섬유유연제|건조\s*시트|랙\b|바구니|트레이(?!닝)|수저통|홀더|칸막이|보관함|정리함|매트\s*시트|스티커|라벨/;

/**
 * 본체인데도 위 낱말이 들어가는 경우가 있다. "브러시 일체형 청소기"처럼
 * 기능 설명으로 쓰인 것까지 빼면 멀쩡한 상품이 사라진다.
 * 이런 말이 함께 있으면 부속품으로 보지 않는다.
 */
const BODY_MARKS =
  /본체|일체형|올인원|세트\s*구성품\s*포함|로봇청소기\s*본체|무선청소기\s*본체/;

/**
 * 호환 모델명이 줄줄이 적힌 상품명.
 *
 * "T9 T8 T5 N5 N8 DJ65" 처럼 짧은 모델 코드가 여럿 나열되면 그것은
 * 한 제품이 아니라 "이 기기들에 맞는 부속"이라는 뜻이다.
 * 본체는 보통 자기 모델명 하나만 달고 나온다.
 */
const MODEL_CODE = /\b[A-Z]{1,3}\d{1,4}[A-Z]?\b/g;

/** 이보다 많이 나열되면 호환 목록으로 본다. */
const MODEL_CODE_LIMIT = 3;

export function countModelCodes(productName: string): number {
  const seen = new Set<string>();
  productName.toUpperCase().replace(MODEL_CODE, (code) => {
    seen.add(code);
    return code;
  });
  return seen.size;
}

/** 상품명만 보고 부속품인지. */
export function looksLikeAccessory(productName: string): boolean {
  /*
    소모품 판정이 먼저다. "올인원"은 본체에도 소모품에도 쓰이는 말이라
    본체 표시로 먼저 걸러 내면 "올인원 식기세척기세제"가 본체로 빠져나간다.
    세제는 어떤 말이 붙어도 세제다.
  */
  /*
    "세제 자동투입 세탁기"처럼 소모품 낱말이 기능 이름으로 쓰인 본체가
    있다. 그런 말이 함께 있으면 소모품으로 보지 않는다.
  */
  const consumableAsFeature = /자동\s*투입|일체형|내장|디스펜서/.test(productName);
  if (CONSUMABLE_MARKS.test(productName) && !consumableAsFeature) return true;
  if (BODY_MARKS.test(productName)) return false;
  if (ACCESSORY_MARKS.test(productName)) return true;
  return countModelCodes(productName) >= MODEL_CODE_LIMIT;
}

/**
 * 값이 혼자 너무 싸면 본체가 아닐 수 있다.
 *
 * 이름만으로는 못 걸러지는 것이 남는다. 같은 자리에 놓인 후보끼리
 * 값이 열 배 넘게 차이 나면 같은 종류의 물건이 아니라고 보는 편이 맞다.
 * 55만원짜리 로봇청소기 옆의 11,990원은 더 싼 로봇청소기가 아니다.
 *
 * 이름이 수상한 것과 겹칠 때만 뺀다. 값만 싸다고 빼면 진짜 가성비
 * 상품이 사라진다. 가성비 후보를 보여주는 것이 이 화면의 일이다.
 */
export const CHEAP_OUTLIER_RATIO = 10;

export function isCheapOutlier(price: number, highest: number): boolean {
  if (!Number.isFinite(price) || !Number.isFinite(highest)) return false;
  if (price <= 0 || highest <= 0) return false;
  return highest / price >= CHEAP_OUTLIER_RATIO;
}

/**
 * 후보에서 부속품을 덜어낸다. 상품이 붙은 뒤에 부른다.
 *
 * 값 비교는 다른 후보가 있어야 되므로 여기서 함께 본다.
 * 이름이 수상하지 않으면 값이 싸도 그대로 둔다.
 */
export function dropAccessories<
  T extends { name: string; productName?: string; price?: number }
>(items: T[]): T[] {
  const prices = items
    .map((item) => item.price)
    .filter((price): price is number => typeof price === "number" && price > 0);
  const highest = prices.length > 0 ? Math.max(...prices) : 0;

  const kept = items.filter((item) => {
    if (!item.productName) return true;

    const suspiciousName = looksLikeAccessory(item.productName);
    const cheap =
      typeof item.price === "number" && isCheapOutlier(item.price, highest);

    /*
      이름이 수상하면 값과 상관없이 뺀다.

      값이 열 배 넘게 차이 나는 것도 뺀다. 같은 검색어에서 나왔는데 값이
      이만큼 벌어지면 같은 종류의 물건이 아니다. 47만원짜리 식기세척기
      옆의 11,900원은 더 싼 식기세척기가 아니라 세제다. 이름에 적힌 말을
      다 알 수는 없으므로 값 쪽을 따로 본다.

      값 차이만으로 빼려면 비교 대상이 있어야 한다. 후보가 하나뿐이면
      highest 가 자기 자신이라 걸리지 않는다.
    */
    if (!suspiciousName && !cheap) return true;

    console.warn("[recommend] 본체가 아닌 상품을 후보에서 뺍니다.", {
      name: item.name,
      productName: item.productName,
      price: item.price,
      modelCodes: countModelCodes(item.productName),
      cheapOutlier: cheap,
    });
    return false;
  });

  return kept.length > 0 ? kept : items;
}
