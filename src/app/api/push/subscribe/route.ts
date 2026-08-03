import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// 모듈 최상단에서 클라이언트를 만들면 빌드 시 페이지 데이터 수집 단계에서
// 환경변수가 없을 때 빌드가 통째로 실패한다. 요청 시점에 생성한다.
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { subscription, userId } = body;

    if (
      !subscription ||
      typeof subscription.endpoint !== "string" ||
      !subscription.endpoint.startsWith("https://") ||
      typeof subscription.keys?.p256dh !== "string" ||
      typeof subscription.keys?.auth !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "구독 정보가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    // 장부에 핸드폰 주소록 저장
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId || null,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    }, { onConflict: 'endpoint' });

    if (error) {
      console.error("DB Insert Error:", error);
      throw error;
    }
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("푸시 구독 저장 에러:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}