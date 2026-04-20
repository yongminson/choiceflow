import { NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { CREDIT_PACKS } from "@/lib/payment/credit-packs";

export async function POST(request: Request) {
  try {
    const { paymentId, packId } = await request.json();

    // 1. 로그인한 유저 확인
    const supabase = createRouteHandlerSupabaseClient(request);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
    }

    // 2. 어떤 상품(크레딧 팩)을 샀는지 확인
    const pack = CREDIT_PACKS.find((p) => p.id === packId);
    if (!pack) {
      return NextResponse.json({ ok: false, error: "잘못된 상품입니다." }, { status: 400 });
    }

    // 3. 포트원 서버에 "이 사람이 진짜 돈을 냈는지" 검증 요청
    const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;
    if (!PORTONE_API_SECRET) {
      return NextResponse.json({ ok: false, error: "서버 결제키 설정 오류" }, { status: 500 });
    }

    const verifyRes = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `PortOne ${PORTONE_API_SECRET}`
      }
    });

    if (!verifyRes.ok) {
      return NextResponse.json({ ok: false, error: "결제 내역을 찾을 수 없습니다." }, { status: 400 });
    }

    const paymentData = await verifyRes.json();

    // 4. 결제 상태 및 금액 비교 (가짜로 금액을 조작했는지 확인)
    if (paymentData.status !== "PAID") {
      return NextResponse.json({ ok: false, error: "결제가 완료되지 않았습니다." }, { status: 400 });
    }

    if (paymentData.amount.total !== pack.priceWon) {
      return NextResponse.json({ ok: false, error: "결제 금액이 일치하지 않습니다. (해킹 의심)" }, { status: 400 });
    }

    // 5. 모든 검증 통과! 유저의 DB에 크레딧 충전
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();

    const currentCredits = profile?.credits || 0;
    const newCredits = currentCredits + pack.credits;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ credits: newCredits })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ ok: false, error: "크레딧 지급에 실패했습니다." }, { status: 500 });
    }

    // 6. 성공 결과 반환
    return NextResponse.json({
      ok: true,
      addedCredits: pack.credits,
      totalCredits: newCredits
    });

  } catch (error) {
    console.error("결제 검증 중 오류:", error);
    return NextResponse.json({ ok: false, error: "결제 처리 중 서버 오류가 발생했습니다." }, { status: 500 });
  }
}