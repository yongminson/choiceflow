import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 401 });
  }

  try {
    // 🔥 짝짝이 원인 제거! 환경변수에서 진짜 키를 가져옵니다.
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) throw new Error("VAPID 키가 없습니다.");

    webpush.setVapidDetails("mailto:admin@choiceflow.co.kr", publicKey, privateKey);

    const { data: subscriptions, error } = await supabase.from("push_subscriptions").select("*");
    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: "알림 보낼 대상이 없습니다." });
    }

    const payload = JSON.stringify({
      title: "🎁 오늘의 무료 1크레딧 충전 완료!",
      body: "지금 바로 접속해서 ChoiceFlow AI 분석을 무료로 이용해 보세요!",
      url: "https://choice.ymstudio.co.kr", 
    });

    let successCount = 0;
    let failCount = 0;

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSub = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
      try {
        await webpush.sendNotification(pushSub, payload);
        successCount++;
      } catch (e: any) {
        console.error(`🚨 발송 실패 (ID: ${sub.id}):`, e?.body || e?.message || e);
        failCount++;
        if (e.statusCode === 404 || e.statusCode === 410) {
           await supabase.from("push_subscriptions").delete().eq("id", sub.id);
           console.log("🗑️ 만료된 토큰 자동 삭제 완료");
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, successCount, failCount });
  } catch (e: any) {
    console.error("💥 치명적 에러 발생:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}