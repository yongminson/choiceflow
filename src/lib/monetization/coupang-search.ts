/**
 * 공개 쿠팡 검색 URL (검색어로 바로 이동).
 * 수익화 분석 결과의 `searchKeyword` 전용 — 파트너스 딥링크와 무관하게 동일 패턴을 씁니다.
 */
export function buildDirectCoupangNpSearchUrl(searchKeyword: string): string {
  const q = searchKeyword.trim();
  return `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}`;
}

/**
 * 쿠팡 검색/제휴 링크 생성.
 * - `NEXT_PUBLIC_COUPANG_PARTNER_PATH` 가 있으면 `https://link.coupang.com/a/{PATH}?q=...` 형태로 검색어를 붙입니다.
 * - 없으면 공개 검색 URL(`www.coupang.com/np/search`)을 사용합니다.
 */
export function buildCoupangSearchUrl(searchQuery: string): string {
  const q = searchQuery.trim().slice(0, 100) || "쇼핑";
  const partner = process.env.NEXT_PUBLIC_COUPANG_PARTNER_PATH?.trim();
  if (partner) {
    const encoded = encodeURIComponent(q);
    return `https://link.coupang.com/a/${partner}?q=${encoded}`;
  }
  return `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}`;
}
