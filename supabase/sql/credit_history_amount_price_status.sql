-- 기존 credit_history 에 amount / price / status 컬럼 추가 (이미 있으면 스킵)
-- Supabase SQL Editor 에서 실행하세요.

alter table public.credit_history
  add column if not exists amount integer;

alter table public.credit_history
  add column if not exists price integer;

alter table public.credit_history
  add column if not exists status text not null default 'success';

comment on column public.credit_history.amount is '충전된 크레딧 수';
comment on column public.credit_history.price is '결제 금액(원)';
comment on column public.credit_history.status is '결제 상태 (예: success)';

-- 기존 행 백필 (선택)
update public.credit_history
set
  amount = coalesce(amount, credits_added),
  price = coalesce(price, amount_won)
where amount is null or price is null;
