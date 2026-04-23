import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { category, name, phone, details } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "이름과 연락처는 필수입니다." }, { status: 400 });
    }

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