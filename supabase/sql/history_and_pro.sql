-- =============================================================================
-- 분석·결제 히스토리 및 Pro 구독 플래그
-- Supabase SQL Editor 에서 순서대로 실행하세요.
-- =============================================================================

-- Pro 구독 여부 (PortOne 정식 연동 시 갱신)
alter table public.profiles
  add column if not exists is_pro boolean not null default false;
comment on column public.profiles.is_pro is 'Pro 구독 활성 여부';

-- AI 분석 성공 시 기록
create table if not exists public.analysis_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  credits_used integer not null check (credits_used > 0),
  created_at timestamptz not null default now()
);

comment on table public.analysis_history is 'AI 분석 크레딧 차감 이력';

create index if not exists analysis_history_user_created_idx
  on public.analysis_history (user_id, created_at desc);

alter table public.analysis_history enable row level security;

drop policy if exists "analysis_history_select_own" on public.analysis_history;
create policy "analysis_history_select_own"
  on public.analysis_history for select
  using (auth.uid() = user_id);

drop policy if exists "analysis_history_insert_own" on public.analysis_history;
create policy "analysis_history_insert_own"
  on public.analysis_history for insert
  with check (auth.uid() = user_id);

alter table public.analysis_history add column if not exists input_data jsonb;
alter table public.analysis_history add column if not exists result_data jsonb;
alter table public.analysis_history add column if not exists spent_credits integer;
comment on column public.analysis_history.input_data is '분석 요청 스냅샷(JSON)';
comment on column public.analysis_history.result_data is '분석 결과 스냅샷(JSON)';
comment on column public.analysis_history.spent_credits is '소모 크레딧';

-- 크레딧 충전(결제) 성공 시 기록
create table if not exists public.credit_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  credits_added integer not null check (credits_added > 0),
  amount_won integer not null check (amount_won >= 0),
  created_at timestamptz not null default now()
);

comment on table public.credit_history is '크레딧 충전·결제 내역';

create index if not exists credit_history_user_created_idx
  on public.credit_history (user_id, created_at desc);

alter table public.credit_history enable row level security;

drop policy if exists "credit_history_select_own" on public.credit_history;
create policy "credit_history_select_own"
  on public.credit_history for select
  using (auth.uid() = user_id);

drop policy if exists "credit_history_insert_own" on public.credit_history;
create policy "credit_history_insert_own"
  on public.credit_history for insert
  with check (auth.uid() = user_id);

-- API `/api/payment/fake-charge` 와 동기화 (기존 DB는 credit_history_amount_price_status.sql 로도 추가 가능)
alter table public.credit_history add column if not exists amount integer;
alter table public.credit_history add column if not exists price integer;
alter table public.credit_history add column if not exists status text not null default 'success';
comment on column public.credit_history.amount is '충전된 크레딧 수';
comment on column public.credit_history.price is '결제 금액(원)';
comment on column public.credit_history.status is '결제 상태 (예: success)';
