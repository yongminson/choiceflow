import { NextResponse } from "next/server";

import {
  CoupangApiError,
  createCoupangDeepLink,
  getCoupangConfigurationStatus,
  hasValidDiagnosticToken,
  isDiagnosticTokenConfigured,
  normalizeCoupangKeyword,
} from "@/lib/monetization/coupang-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "icn1";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export async function GET() {
  const configuration = getCoupangConfigurationStatus();

  return NextResponse.json(
    {
      ok: configuration.configured,
      service: "coupang-partners",
      configured: configuration.configured,
      missing: configuration.missing,
      liveProbe: false,
      diagnosticTokenConfigured: isDiagnosticTokenConfigured(),
    },
    {
      status: configuration.configured ? 200 : 503,
      headers: NO_STORE_HEADERS,
    }
  );
}

export async function POST(request: Request) {
  if (!isDiagnosticTokenConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        service: "coupang-partners",
        code: "DIAGNOSTIC_TOKEN_MISSING",
      },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  if (!hasValidDiagnosticToken(request.headers.get("authorization"))) {
    return NextResponse.json(
      {
        ok: false,
        service: "coupang-partners",
        code: "UNAUTHORIZED",
      },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  let keyword = "무선 이어폰";
  try {
    const body = (await request.json()) as { keyword?: unknown };
    keyword = normalizeCoupangKeyword(body.keyword) || keyword;
  } catch {
    // 빈 본문도 기본 진단 검색어로 검사합니다.
  }

  const startedAt = Date.now();
  try {
    await createCoupangDeepLink(keyword);
    return NextResponse.json(
      {
        ok: true,
        service: "coupang-partners",
        configured: true,
        apiReachable: true,
        responseShapeValid: true,
        elapsedMs: Date.now() - startedAt,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    const details =
      error instanceof CoupangApiError
        ? { code: error.code, upstreamStatus: error.status }
        : { code: "UNEXPECTED_ERROR" };
    const apiReachable =
      details.code !== "UPSTREAM_NETWORK" &&
      details.code !== "UPSTREAM_TIMEOUT" &&
      details.code !== "MISSING_CONFIGURATION";
    const status =
      details.code === "MISSING_CONFIGURATION"
        ? 503
        : details.code === "INVALID_KEYWORD"
          ? 400
          : 502;

    console.error("[coupang] Diagnostic probe failed.", details);
    return NextResponse.json(
      {
        ok: false,
        service: "coupang-partners",
        configured: getCoupangConfigurationStatus().configured,
        apiReachable,
        responseShapeValid: false,
        elapsedMs: Date.now() - startedAt,
        ...details,
      },
      { status, headers: NO_STORE_HEADERS }
    );
  }
}
