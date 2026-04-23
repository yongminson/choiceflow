import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 관리자 마스터키로 DB 연결 (보안)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { category, name, phone, details } = body;

    // 필수 항목 검사
    if (!name || !phone) {
      return NextResponse.json({ error: "이름과 연락처는 필수입니다." }, { status: 400 });
    }

    // 장부에 데이터 기록하기
    const { error } = await supabase.from('consultation_leads').insert({
      category: category || '고가자산',
      name,
      phone,
      details
    });

    if (error) throw error;

    // 나중에는 여기에 "대표님 텔레그램/이메일로 알림 쏘는 코드"를 추가할 수 있습니다!
    // 지금은 일단 장부에만 예쁘게 적어둡니다.

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("상담 신청 저장 에러:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}