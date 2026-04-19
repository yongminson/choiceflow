-- =============================================================================
-- Supabase Dashboard → SQL Editor 에서 순서대로 실행하세요.
-- auth.users 에 가입 시 public.profiles 에 행을 자동 생성합니다.
-- =============================================================================

-- 1) profiles 테이블 (없을 때만 생성)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  credits integer not null default 5,
  created_at timestamptz not null default now()
);

comment on table public.profiles is '앱 사용자 프로필 · 크레딧';
comment on column public.profiles.credits is '분석 등에 사용하는 기본 크레딧';

-- 일 1회 무료(매일 자정 갱신) 추적 — API 뼈대에서 참조
alter table public.profiles
  add column if not exists last_free_use_at timestamptz;
comment on column public.profiles.last_free_use_at is '일일 무료 분석 마지막 사용 시각 (KST 자정 기준 정책과 조합)';

-- 2) RLS
alter table public.profiles enable row level security;

-- 기존 정책이 있으면 이름 충돌 시 삭제 후 다시 만들기
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- 3) 가입 시 자동 삽입 (SECURITY DEFINER)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, credits)
  values (new.id, 5);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- =============================================================================
-- 참고:
-- - 이미 존재하는 auth 사용자에게 프로필을 채우려면 별도 마이그레이션 INSERT 가 필요합니다.
-- - credits 기본값(5)은 위 INSERT 와 테이블 default 에 맞춰 조정하세요.
-- =============================================================================
