import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: '로그인 세션을 찾을 수 없습니다.' }, { status: 401 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json({ error: '마스터키가 없습니다.' }, { status: 500 });
    }

    const supabaseAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

    // 🌟 [핵심 어뷰징 방지 로직] 유저를 삭제하기 직전, 이메일을 블랙리스트에 저장합니다!
    if (user.email) {
      await supabaseAdmin.from('withdrawn_users').insert({ email: user.email });
    }

    // 마스터키로 유저 데이터 완벽 삭제 (이때 Cascade가 작동해 프로필 등 찌꺼기도 다 지워집니다)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      return NextResponse.json({ error: `Supabase 거부: ${deleteError.message}` }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: `서버 내부 에러: ${error.message}` }, { status: 500 });
  }
}