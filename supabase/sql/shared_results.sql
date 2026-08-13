-- =============================================================================
-- 공유용 추천 결과 저장소
-- Supabase Dashboard → SQL Editor 에서 실행하세요.
--
-- 결과를 sessionStorage 에만 두면 링크를 받은 사람은 아무것도 볼 수 없다.
-- 공유 버튼을 누른 순간의 결과를 그대로 떠서 /r/<id> 로 열리게 한다.
-- =============================================================================

create table if not exists public.shared_results (
  id uuid primary key default gen_random_uuid(),
  -- 공유 시점의 추천 결과 스냅샷. 이후 추천이 바뀌어도 링크 내용은 고정된다.
  payload jsonb not null,
  category text,
  created_at timestamptz not null default now(),
  -- 만든 사람(로그인한 경우에만). 통계·남용 추적용이며 표시하지 않는다.
  created_by uuid references auth.users (id) on delete set null
);

comment on table public.shared_results is '공유 링크로 열리는 추천 결과 스냅샷';

create index if not exists shared_results_created_at_idx
  on public.shared_results (created_at desc);

-- RLS 를 켜고 정책을 만들지 않는다.
-- 이 테이블은 서버 라우트(service role)로만 읽고 쓴다.
-- anon 키로는 어떤 행도 직접 조회·삽입할 수 없다.
alter table public.shared_results enable row level security;
