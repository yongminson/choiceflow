-- analysis_history: 입력/결과 JSON + spent_credits
-- Supabase SQL Editor 에서 실행하세요.

alter table public.analysis_history
  add column if not exists input_data jsonb;
alter table public.analysis_history
  add column if not exists result_data jsonb;
alter table public.analysis_history
  add column if not exists spent_credits integer;

comment on column public.analysis_history.input_data is '분석 요청 스냅샷(JSON)';
comment on column public.analysis_history.result_data is '분석 결과 스냅샷(JSON)';
comment on column public.analysis_history.spent_credits is '소모 크레딧';

-- 기존 credits_used 와 병행 시 백필 (선택)
update public.analysis_history
set spent_credits = credits_used
where spent_credits is null and credits_used is not null;
