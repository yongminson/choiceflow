import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
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

    webpush.setVapidDetails(
      'mailto:admin@choiceflow.com', // 이메일은 형식만 맞으면 작동합니다.
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
      process.env.VAPID_PRIVATE_KEY as string
    );

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
      // 변수명은 pushSub 하나로 통일합니다.
      const pushSub = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
      try {
        await webpush.sendNotification(
          pushSub, // 에러 해결: pushSub로 통일
          payload  // 에러 해결: 위에서 이미 JSON.stringify를 했으므로 중복 안 되게 변경
        );
        successCount++;
      } catch (error: any) {
        failCount++;
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log("만료된 구독권 자동 삭제 진행:", pushSub.endpoint); // 에러 해결: pushSub로 통일
          
          // 에러 해결: 파일 맨 위에 이미 supabase가 선언되어 있으므로, 새로 만들지 않고 바로 씁니다.
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', pushSub.endpoint); // 에러 해결: pushSub로 통일
        } else {
          console.error("푸시 발송 에러:", error);
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