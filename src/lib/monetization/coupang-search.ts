/**
 * 쿠팡 딥링크 API를 호출하는 우리 서버(/api/coupang)로 연결합니다.
 * 이 주소를 타면 자동으로 수수료 링크가 생성되어 쿠팡으로 리다이렉트 됩니다.
 */
export function buildDirectCoupangNpSearchUrl(searchKeyword: string): string {
  const q = searchKeyword.trim();
  if (!q) return "https://www.coupang.com";
  
  // 우리 서버 API로 검색어를 넘겨서 쿠팡 딥링크를 생성 후 이동시킵니다.
  return `/api/coupang?q=${encodeURIComponent(q)}`;
}