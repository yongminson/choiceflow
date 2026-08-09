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
    // 지도 검색을 방해하는 수식어. 남으면 상호가 하나도 안 잡힌다.
    .replace(
      /(미니|대형|초대형|프리미엄|고급|저렴한|맛있는|유명한|인기|추천|특제|수제|매운|얼큰한|담백한|따뜻한|시원한|한상|한 상)/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  const words = (stripped || value).split(" ").filter(Boolean);
  if (words.length === 0) return value.slice(0, 20);
  // 지도 검색은 단어가 늘어날수록 결과가 급격히 줄어든다.
  // 업종·메뉴는 보통 마지막 단어에 온다("미니 화로 어묵탕" -> "어묵탕").
  return words[words.length - 1].slice(0, 20);
}
