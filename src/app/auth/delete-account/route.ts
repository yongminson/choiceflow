import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    // 1. 현재 탈퇴 버튼을 누른 사람이 누구인지 안전하게 확인합니다.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 2. 🌟 관리자 마스터키를 장착한 특수 클라이언트를 소환합니다.
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // 방금 .env에 넣은 마스터키!
    );

    // 3. 마스터키의 권한으로 해당 유저를 DB에서 영구 삭제합니다!
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (error) throw error;

    // 4. 삭제 성공 후 프론트엔드에 "성공!" 신호를 보냅니다.
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('회원 탈퇴 에러:', error);
    return NextResponse.json({ error: '회원 탈퇴에 실패했습니다.' }, { status: 500 });
  }
}