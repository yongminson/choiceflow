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

    // 재가입을 반복해 무료 크레딧을 다시 받는 것을 막기 위해 탈퇴 이메일을 남긴다.
    //
    // /account/delete 안내 페이지와 Google Play 데이터 보안 양식에 "30일 보관 후 파기"로
    // 신고했으므로, 실제로 그렇게 동작해야 한다. 전용 크론이 없어 탈퇴 처리 시점에
    // 만료분을 함께 지운다. 탈퇴가 없으면 정리도 필요 없으므로 이 시점이면 충분하다.
    const RETENTION_DAYS = 30;
    const expiredBefore = new Date(
      Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    const { error: purgeError } = await supabaseAdmin
      .from('withdrawn_users')
      .delete()
      .lt('created_at', expiredBefore);
    if (purgeError) {
      // 정리에 실패해도 탈퇴 자체는 진행한다. 사용자의 삭제 요청이 우선이다.
      console.error('탈퇴 이메일 보관기간 정리 실패:', purgeError.message);
    }

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