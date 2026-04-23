import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// 🔥 [핵심 추가] Next.js가 빌드(건축)할 때 이 파일을 미리 실행해서 에러 내는 것을 막아줍니다!
export const dynamic = "force-dynamic";

// DB 연결은 바깥에 둬도 안전합니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: Request) {
  // 1. 보안 검사 (아무나 알림 못 쏘게 막기)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 401 });
  }

  try {
    const publicKey = "BIAX-LspIga8pR2ehMyiGYUK9GAywlLBQ0GHtABX-iTfIkUc-NmKTfmeY2iYWuGbq82VHRKAT3v1tVmG8FwCp6g";
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!privateKey) {
        throw new Error("Vercel 환경변수에 VAPID_PRIVATE_KEY가 없습니다.");
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

    // 4. 보낼 알림의 제목과 내용 작성 🎁
    const payload = JSON.stringify({
      title: "🎁 오늘의 무료 1크레딧 충전 완료!",
      body: "지금 바로 접속해서 ChoiceFlow AI 분석을 무료로 이용해 보세요!",
      url: "https://choice.ymstudio.co.kr", 
    });

    // 5. 모두에게 단체 알림 발송!
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