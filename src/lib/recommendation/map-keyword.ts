/**
 * 지도 검색어 정리.
 * AI가 "1인용 냉동삼겹살 밀키트" 같은 상품형 문구를 만들면 지도에는
 * 상호가 하나도 뜨지 않는다. 상품 표현을 걷어내고 핵심 메뉴명만 남긴다.
 */
export function toMapKeyword(value: string): string {
  const stripped = value
    // \b 는 한글 뒤에서 경계로 잡히지 않아 한글 단위와 영문 단위를 나눠 처리한다.
    .replace(/\d+\s*(인용|인분|개입|봉|팩)/g, " ")
    .replace(/\d+\s*(kg|g|ml|l)(?![a-z가-힣])/gi, " ")
    .replace(
      /(밀키트|간편식|냉동|즉석|가정간편식|HMR|세트|선물세트|포장|배달|택배|정품|무료배송)/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
  const base = stripped || value;
  // 지도 검색은 단어 2개를 넘기면 결과가 급격히 줄어든다.
  return base.split(" ").slice(0, 2).join(" ").slice(0, 20);
}

