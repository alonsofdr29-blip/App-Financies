create extension if not exists "pgcrypto";

create table if not exists public.finance_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  currency text not null default 'EUR',
  reminder_day integer not null default 5,
  notifications_enabled boolean not null default false,
  locale text not null default 'es-ES',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text,
  name text not null,
  emoji text not null,
  kind text not null check (kind in ('income', 'expense')),
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  title text not null,
  amount numeric(12,2) not null,
  transaction_date date not null,
  payment_method text not null default 'card',
  note text not null default '',
  category_id uuid references public.finance_categories(id) on delete set null,
  category_name text not null,
  category_emoji text not null,
  recurring_source_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_recurring_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  title text not null,
  amount numeric(12,2) not null,
  day_of_month integer not null check (day_of_month between 1 and 31),
  payment_method text not null default 'card',
  note text not null default '',
  category_id uuid references public.finance_categories(id) on delete set null,
  category_name text not null,
  category_emoji text not null,
  active boolean not null default true,
  start_month text not null,
  end_month text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  emoji text not null,
  target_amount numeric(12,2) not null,
  saved_amount numeric(12,2) not null default 0,
  deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_monthly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null,
  total_budget numeric(12,2) not null default 0,
  category_budgets jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_key)
);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists finance_profiles_updated_at on public.finance_profiles;
create trigger finance_profiles_updated_at before update on public.finance_profiles
for each row execute procedure public.handle_updated_at();

drop trigger if exists finance_categories_updated_at on public.finance_categories;
create trigger finance_categories_updated_at before update on public.finance_categories
for each row execute procedure public.handle_updated_at();

drop trigger if exists finance_transactions_updated_at on public.finance_transactions;
create trigger finance_transactions_updated_at before update on public.finance_transactions
for each row execute procedure public.handle_updated_at();

drop trigger if exists finance_recurring_entries_updated_at on public.finance_recurring_entries;
create trigger finance_recurring_entries_updated_at before update on public.finance_recurring_entries
for each row execute procedure public.handle_updated_at();

drop trigger if exists finance_savings_goals_updated_at on public.finance_savings_goals;
create trigger finance_savings_goals_updated_at before update on public.finance_savings_goals
for each row execute procedure public.handle_updated_at();

drop trigger if exists finance_monthly_plans_updated_at on public.finance_monthly_plans;
create trigger finance_monthly_plans_updated_at before update on public.finance_monthly_plans
for each row execute procedure public.handle_updated_at();

alter table public.finance_profiles enable row level security;
alter table public.finance_categories enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.finance_recurring_entries enable row level security;
alter table public.finance_savings_goals enable row level security;
alter table public.finance_monthly_plans enable row level security;

create policy "profiles owner only" on public.finance_profiles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "categories owner only" on public.finance_categories
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "transactions owner only" on public.finance_transactions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "recurring owner only" on public.finance_recurring_entries
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "goals owner only" on public.finance_savings_goals
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "monthly plans owner only" on public.finance_monthly_plans
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

