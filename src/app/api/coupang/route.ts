import { NextResponse } from "next/server";

import {
  buildCoupangSearchUrl,
  CoupangApiError,
  createCoupangDeepLink,
  normalizeCoupangKeyword,
} from "@/lib/monetization/coupang-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "icn1";
export const fetchCache = "force-no-store";

function redirectWithoutCache(url: string, mode: "api" | "fallback") {
  const response = NextResponse.redirect(url, 302);
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate"
  );
  response.headers.set("X-ChoiceFlow-Coupang-Mode", mode);
  return response;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = normalizeCoupangKeyword(searchParams.get("q"));
  const fallbackUrl = buildCoupangSearchUrl(keyword);

  if (!keyword) {
    return redirectWithoutCache(fallbackUrl, "fallback");
  }

  try {
    const deepLink = await createCoupangDeepLink(keyword);
    return redirectWithoutCache(deepLink, "api");
  } catch (error) {
    const details =
      error instanceof CoupangApiError
        ? { code: error.code, status: error.status }
        : { code: "UNEXPECTED_ERROR" };
    console.error("[coupang] Deep-link generation failed; using fallback.", details);
    return redirectWithoutCache(fallbackUrl, "fallback");
  }
}
