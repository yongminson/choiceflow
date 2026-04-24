import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// 🔥 Next.js 빌드 에러 방지용
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: Request) {
  // 1. 보안 검사
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 401 });
  }

  try {
    // 🚨 수정한 부분: 하드코딩 제거! 환경변수에서 키를 가져옵니다.
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
        throw new Error("Vercel 환경변수에 VAPID 키가 없습니다.");
    }

    // 우체국 세팅
    webpush.setVapidDetails(
      "mailto:admin@choiceflow.co.kr", 
      publicKey,
      privateKey
    );

    // 3. DB에서 알림을 허락한 유저들 가져오기
    const { data: subscriptions, error } = await supabase.from("push_subscriptions").select("*");

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: "알림을 보낼 대상이 없습니다." });
    }

    // 4. 보낼 알림 내용 🎁
    const payload = JSON.stringify({
      title: "🎁 오늘의 무료 1크레딧 충전 완료!",
      body: "지금 바로 접속해서 ChoiceFlow AI 분석을 무료로 이용해 보세요!",
      url: "https://choice.ymstudio.co.kr", 
    });

    // 5. 발송!
    const sendPromises = subscriptions.map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      
      return webpush.sendNotification(pushSubscription, payload).catch((e) => {
        console.log("알림 발송 실패 (차단/삭제한 유저):", sub.endpoint);
      });
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, sentCount: subscriptions.length });
  } catch (e: any) {
    console.error("알림 발송 중 에러:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}