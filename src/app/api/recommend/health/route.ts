import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "quick-recommendation",
    configured: {
      gemini: Boolean(process.env.GEMINI_API_KEY?.trim()),
      naverShopping: Boolean(
        process.env.NAVER_CLIENT_ID?.trim() &&
          process.env.NAVER_CLIENT_SECRET?.trim()
      ),
      googlePlaces: Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim()),
    },
    notes: {
      googlePlaces:
        "평점·후기 필드는 Google Maps Platform 과금 및 할당량 설정이 필요합니다.",
      prices:
        "네이버 쇼핑 최저가는 배송비·쿠폰·옵션을 제외할 수 있는 조회 시점 노출가입니다.",
      naverShoppingSunset:
        "네이버 쇼핑 검색 API는 2026-07-31 종료 예정이므로 대체 가격 공급자가 필요합니다.",
    },
  });
}
