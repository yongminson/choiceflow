import { NextResponse } from "next/server";

import { getCreditPackById } from "@/lib/payment/credit-packs";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  packId?: unknown;
  amount?: unknown;
  price?: unknown;
};

function parseCharge(body: Body): { amount: number; price: number } | null {
  const pack = getCreditPackById(body.packId);
  if (pack) {
    return { amount: pack.credits, price: pack.priceWon };
  }
  const amount = body.amount;
  const price = body.price;
  if (
    typeof amount === "number" &&
    Number.isFinite(amount) &&
    amount > 0 &&
    Number.isInteger(amount) &&
    typeof price === "number" &&
    Number.isFinite(price) &&
    price >= 0 &&
    Number.isInteger(price)
  ) {
    return { amount, price };
  }
  return null;
}

/**
 * 테스트용 가짜 결제 — 세션 유저 `profiles.credits` 증가 + `credit_history` 기록
 * 흐름: SELECT 현재 credits → (현재 + amount)로 UPDATE → credit_history INSERT
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const parsed = parseCharge(body);
  if (!parsed) {
    return NextResponse.json(
      { error: "유효한 packId 또는 amount·price가 필요합니다." },
      { status: 400 }
    );
  }

  const { amount, price } = parsed;

  const supabase = createRouteHandlerSupabaseClient(request);

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    console.error("[api/payment/fake-charge] auth.getUser", userErr);
    return NextResponse.json({ error: "세션을 확인하지 못했습니다." }, { status: 500 });
  }

  if (!user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: profileRow, error: readErr } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .maybeSingle();

  if (readErr) {
    console.error("[api/payment/fake-charge] profiles read", readErr);
    return NextResponse.json({ error: "프로필을 불러오지 못했습니다." }, { status: 500 });
  }

  const current =
    typeof profileRow?.credits === "number" && Number.isFinite(profileRow.credits)
      ? profileRow.credits
      : 0;
  const nextCredits = current + amount;

  const { data: updatedProfile, error: updateErr } = await supabase
    .from("profiles")
    .update({ credits: nextCredits })
    .eq("id", user.id)
    .select("id, credits")
    .maybeSingle();

  if (updateErr) {
    console.error("[api/payment/fake-charge] profiles update", updateErr);
    return NextResponse.json({ error: "크레딧을 반영하지 못했습니다." }, { status: 500 });
  }

  if (!updatedProfile || updatedProfile.id !== user.id) {
    console.error("[api/payment/fake-charge] profiles update: no row updated", {
      userId: user.id,
    });
    return NextResponse.json(
      { error: "프로필을 찾을 수 없어 크레딧을 반영하지 못했습니다." },
      { status: 500 }
    );
  }

  const written =
    typeof updatedProfile.credits === "number" && Number.isFinite(updatedProfile.credits)
      ? updatedProfile.credits
      : null;
  if (written !== nextCredits) {
    console.error("[api/payment/fake-charge] profiles update: credits mismatch", {
      expected: nextCredits,
      got: written,
    });
    return NextResponse.json(
      { error: "크레딧 저장이 일치하지 않습니다. 다시 시도해 주세요." },
      { status: 500 }
    );
  }

  const { error: historyErr } = await supabase.from("credit_history").insert({
    user_id: user.id,
    amount,
    price,
    status: "success",
  });

  if (historyErr) {
    console.error("결제 내역 저장 에러:", historyErr);
    const { error: rollbackErr } = await supabase
      .from("profiles")
      .update({ credits: current })
      .eq("id", user.id);
    if (rollbackErr) {
      console.error("[api/payment/fake-charge] profiles rollback after history failure", rollbackErr);
    }
    return NextResponse.json(
      { error: "결제 내역을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true as const,
    addedCredits: amount,
    credits: nextCredits,
    amount,
    price,
  });
}
