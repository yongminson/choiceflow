import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// 1. VAPID 키 세팅 (아까 하드코딩한 공개키와, Vercel에 넣은 비밀키)
const publicKey = "BIAX-LspIga8pR2ehMyiGYUK9GAywlLBQ0GHtABX-iTfIkUc-NmKTfmeY2iYWuGbq82VHRKAT3v1tVmG8FwCp6g";
const privateKey = process.env.VAPID_PRIVATE_KEY!;

webpush.setVapidDetails(
  "mailto:admin@choiceflow.co.kr", // 관리자 이메일 (아무거나 적어도 무방합니다)
  publicKey,
  privateKey
);

// 2. Supabase DB 연결 (마스터키 사용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET 요청으로 설정 (Vercel Cron은 기본적으로 GET으로 찌릅니다)
export async function GET(req: Request) {
  // 🔥 [보안 핵심] 아무나 이 주소를 쳐서 알림 테러를 하지 못하게 '암호(CRON_SECRET)'를 확인합니다!
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 401 });
  }

  try {
    // 3. DB에서 알림을 허락한 모든 유저의 주소록 가져오기
    const { data: subscriptions, error } = await supabase.from("push_subscriptions").select("*");

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: "알림을 보낼 대상이 없습니다." });
    }

    // 4. 보낼 알림의 제목과 내용 작성 🎁
    const payload = JSON.stringify({
      title: "🎁 오늘의 무료 1크레딧 충전 완료!",
      body: "지금 바로 접속해서 ChoiceFlow AI 분석을 무료로 이용해 보세요!",
      url: "https://choice.ymstudio.co.kr", // 알림 누르면 이동할 주소
    });

    // 5. 모두에게 단체 알림 발송!
    const sendPromises = subscriptions.map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      
      // 알림 쏘기 (만약 앱을 지웠거나 차단한 유저가 섞여 있어도 에러 안 나게 처리)
      return webpush.sendNotification(pushSubscription, payload).catch((e) => {
        console.log("알림 발송 실패 (아마 알림을 차단/삭제한 유저일 수 있음):", sub.endpoint);
      });
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, sentCount: subscriptions.length });
  } catch (e: any) {
    console.error("알림 발송 중 에러:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}