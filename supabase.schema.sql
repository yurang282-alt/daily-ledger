create table if not exists public.ledger_records (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  entry_date date not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.ledger_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, name)
);

create table if not exists public.ledger_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  monthly_budget numeric(12, 2) not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.ledger_records enable row level security;
alter table public.ledger_categories enable row level security;
alter table public.ledger_settings enable row level security;

drop policy if exists "Users can manage own records" on public.ledger_records;
create policy "Users can manage own records" on public.ledger_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage own categories" on public.ledger_categories;
create policy "Users can manage own categories" on public.ledger_categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage own settings" on public.ledger_settings;
create policy "Users can manage own settings" on public.ledger_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists ledger_records_user_date_idx on public.ledger_records (user_id, entry_date desc);
create index if not exists ledger_categories_user_kind_idx on public.ledger_categories (user_id, kind);
