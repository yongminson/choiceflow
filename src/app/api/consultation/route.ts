import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// 요청 시점에 생성한다. 모듈 최상단 생성은 환경변수가 없는 빌드 단계에서 실패한다.
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { category, name, phone, details, privacyAgreed } = body;

    // 검증을 먼저 한다. DB 클라이언트를 만든 뒤에 검사하면, 연결 설정이
    // 잘못됐을 때 동의 확인에 닿기도 전에 다른 오류로 끝나 버린다.
    if (!name || !phone) {
      return NextResponse.json({ error: "이름과 연락처는 필수입니다." }, { status: 400 });
    }

    // 동의 확인은 화면에서만 막으면 우회할 수 있다. 연락처를 받는 요청이므로
    // 서버에서도 동의 없이는 저장하지 않는다.
    if (privacyAgreed !== true) {
      return NextResponse.json(
        { error: "개인정보 수집·이용 동의가 필요합니다." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Supabase 장부에 기록
    const { error } = await supabase.from('consultation_leads').insert({
      category: category || '고가자산/렌탈',
      name,
      phone,
      details
    });

    if (error) throw error;

    // 🔥 2. 대표님 텔레그램으로 실시간 알림 쏘기
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      const message = `🚨 [신규 상담 신청 접수]\n\n📌 분류: ${category}\n👤 성함: ${name}\n📞 연락처: ${phone}\n📝 내용: ${details || '없음'}`;
      
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("상담 신청 에러:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}