import { NextResponse } from "next/server";

import {
  CoupangApiError,
  currentCoupangSubId,
  getCoupangConfigurationStatus,
  requestCoupangDeepLink,
  searchCoupangProduct,
} from "@/lib/monetization/coupang-server";
import { describeAffiliateUrl } from "@/lib/monetization/affiliate-check";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "icn1";

/**
 * 결과 화면의 쿠팡 링크가 실제로 수수료를 받을 수 있는지 확인한다.
 *
 * 브라우저 주소창에 넣기만 하면 되도록 만들었다. 기존 /api/coupang/health
 * 는 열쇠가 설정됐는지만 보고, 실제로 추적 링크가 만들어지는지는 토큰이
 * 있어야 볼 수 있었다. 몇 달 동안 클릭이 0 이었는데 링크가 살아 있는지
 * 확인할 길이 없었다.
 *
 * 화면이 쓰는 두 경로를 그대로 돌린다.
 *   1) 상품 검색 — 결과 카드 링크는 거의 전부 여기서 나온다.
 *   2) 딥링크 — 상품을 못 찾았을 때 /api/coupang 이 쓰는 길이다.
 *      여기가 실패하면 /api/coupang 은 추적 없는 일반 쿠팡 검색으로 보낸다.
 *
 * 열쇠는 내보내지 않는다. 주소의 도메인과 추적 표시 유무만 돌려준다.
 * 쿠팡 호출 한도를 아끼려고 결과를 10분 동안 그대로 쓴다.
 */

const CHECK_KEYWORD = "무선 이어폰";
const CACHE_MS = 10 * 60 * 1000;

let cached: { at: number; body: unknown } | null = null;

export async function GET() {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return NextResponse.json(cached.body, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const configuration = getCoupangConfigurationStatus();
  const subId = currentCoupangSubId();

  if (!configuration.configured) {
    const body = {
      ok: false,
      verdict: "쿠팡 열쇠가 설정되지 않아 모든 링크가 추적 없이 나가고 있습니다.",
      missing: configuration.missing,
    };
    return NextResponse.json(body, { status: 503 });
  }

  // 1) 상품 검색
  let searchReport;
  try {
    /*
      캐시를 거치면 예전에 만든 링크를 돌려줄 수 있다. 제외 목록이 비어
      있지 않으면 캐시를 쓰지 않으므로, 실제 상품과 겹치지 않는 값을 하나
      넣어 매번 쿠팡에 새로 묻게 한다.
    */
    const product = await searchCoupangProduct(CHECK_KEYWORD, undefined, {
      excludeKeys: new Set(["__affiliate_check__"]),
    });
    searchReport = product
      ? describeAffiliateUrl(product.productUrl, subId)
      : { parsed: false, host: "", tracked: false, note: "검색 결과가 없음" };
  } catch (error) {
    searchReport = {
      parsed: false,
      host: "",
      tracked: false,
      note: `검색 실패: ${error instanceof Error ? error.message.slice(0, 120) : "알 수 없음"}`,
    };
  }

  // 2) 딥링크
  let deepLinkShort;
  let deepLinkLanding;
  let deepLinkError: string | undefined;
  try {
    const { shortenUrl, landingUrl } = await requestCoupangDeepLink(CHECK_KEYWORD);
    deepLinkShort = describeAffiliateUrl(shortenUrl, subId);
    deepLinkLanding = describeAffiliateUrl(landingUrl, subId);
  } catch (error) {
    deepLinkError =
      error instanceof CoupangApiError
        ? `${error.code}${error.status ? `:${error.status}` : ""} ${error.message}`.slice(0, 200)
        : String(error).slice(0, 200);
  }

  const searchOk = searchReport.tracked && searchReport.hasSubId === true;
  const deepLinkOk =
    !deepLinkError &&
    deepLinkShort?.tracked === true &&
    deepLinkLanding?.hasSubId !== false;

  const verdict =
    searchOk && deepLinkOk
      ? `정상 — 결과 화면의 쿠팡 링크가 추적되고, 채널 "${subId}" 로 잡힙니다.`
      : !searchReport.tracked
        ? "문제 — 결과 카드 링크가 추적되지 않습니다. 눌러도 수수료가 없습니다."
        : deepLinkError
          ? "일부 문제 — 상품 링크는 정상이지만 딥링크가 실패합니다. 상품을 못 찾은 카드는 상품 검색 링크로 대신 보내 추적은 유지되지만, 딥링크 권한을 확인해야 합니다."
          : !searchOk
            ? `일부 문제 — 링크는 추적되지만 채널 "${subId}" 가 안 붙습니다. 리포트를 전체로 보면 잡힙니다.`
            : "일부 문제 — 딥링크 채널을 확인하지 못했습니다.";

  const body = {
    ok: searchOk && deepLinkOk,
    verdict,
    checkedAt: new Date().toISOString(),
    keyword: CHECK_KEYWORD,
    expectedSubId: subId,
    productSearch: searchReport,
    deepLink: deepLinkError
      ? { ok: false, error: deepLinkError }
      : { ok: true, short: deepLinkShort, landing: deepLinkLanding },
  };

  cached = { at: Date.now(), body };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
