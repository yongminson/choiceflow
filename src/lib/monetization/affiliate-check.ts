/**
 * 쿠팡으로 나가는 주소가 수수료를 받을 수 있는 주소인지 본다.
 *
 * 몇 달 동안 파트너스 리포트에 클릭이 0 이었는데, 링크가 추적되고 있는지
 * 확인할 방법이 없었다. 링크를 눌러도 쿠팡은 똑같이 열리기 때문에 화면만
 * 보고는 수수료가 붙는 링크인지 아닌지 알 수 없다.
 *
 * 파트너스 링크에는 정해진 표시가 붙는다.
 *   - link.coupang.com/re/AFFSDP?lptag=AF...&subid=...  (상품 검색 결과)
 *   - link.coupang.com/a/xxxx                          (딥링크 짧은 주소)
 *   - 펼친 딥링크 주소에도 lptag 와 subid 가 들어 있다.
 * 이 표시가 없는 www.coupang.com/np/search?q=... 는 그냥 쿠팡 검색이라
 * 눌러도 수수료가 없다.
 */

export type AffiliateUrlReport = {
  /** 주소를 읽을 수 있었는지 */
  parsed: boolean;
  host: string;
  /** 파트너스 추적 표시(lptag 등)나 추적용 짧은 주소인지 */
  tracked: boolean;
  /** 채널 아이디가 들어 있는지. 짧은 주소는 안을 볼 수 없어 undefined. */
  hasSubId?: boolean;
  /** 사람이 읽을 한 줄 설명 */
  note: string;
};

export function describeAffiliateUrl(
  value: string | undefined,
  expectedSubId: string
): AffiliateUrlReport {
  if (!value) {
    return { parsed: false, host: "", tracked: false, note: "주소가 없음" };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { parsed: false, host: "", tracked: false, note: "주소를 읽을 수 없음" };
  }

  const host = url.hostname.toLowerCase();
  const params = url.searchParams;
  const lptag = params.get("lptag") ?? params.get("lpTag");
  const subId = params.get("subid") ?? params.get("subId");

  // 딥링크 짧은 주소. 안에 무엇이 들었는지는 펼친 주소로 따로 본다.
  if (host === "link.coupang.com" && url.pathname.startsWith("/a/")) {
    return {
      parsed: true,
      host,
      tracked: true,
      hasSubId: undefined,
      note: "딥링크 짧은 주소 (추적됨, 채널은 펼친 주소로 확인)",
    };
  }

  if (host === "coupa.ng") {
    return {
      parsed: true,
      host,
      tracked: true,
      hasSubId: undefined,
      note: "쿠팡 짧은 주소 (추적됨, 채널은 펼친 주소로 확인)",
    };
  }

  const isCoupang = host === "coupang.com" || host.endsWith(".coupang.com");
  if (!isCoupang) {
    return { parsed: true, host, tracked: false, note: "쿠팡 주소가 아님" };
  }

  if (!lptag) {
    return {
      parsed: true,
      host,
      tracked: false,
      hasSubId: false,
      note: "추적 표시(lptag)가 없음 — 눌러도 수수료가 없는 일반 쿠팡 주소",
    };
  }

  const hasSubId = subId === expectedSubId;
  return {
    parsed: true,
    host,
    tracked: true,
    hasSubId,
    note: hasSubId
      ? `추적됨, 채널 "${expectedSubId}" 포함`
      : subId
        ? `추적됨, 그러나 채널이 "${subId}" (기대값 "${expectedSubId}")`
        : `추적됨, 그러나 채널 아이디가 없음 — 리포트를 "${expectedSubId}" 로 거르면 안 보임`,
  };
}
