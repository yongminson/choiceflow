import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase 강제 연결 (에러 방지용 안전한 세팅)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subscription, userId } = body;

    // 장부에 핸드폰 주소록 저장
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId || null,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    }, { onConflict: 'endpoint' });

    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("푸시 구독 저장 에러:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}