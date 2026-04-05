-- Phase 1: 追加テーブル（Phase 0のテーブルはそのまま残す）
-- Phase 0のスキーマ適用後に実行すること

-- ユーザープロファイル（Supabase Auth連携）
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('rsw', 'admin', 'supervisor', 'family')),
  facility_id uuid,
  name text not null,
  phone text,
  created_at timestamptz default now()
);

-- 任意後見契約
create table guardianship_contracts (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid references residents(id) not null,
  notarial_deed_number text,
  rsw_user_id uuid references auth.users(id),
  supervisor_user_id uuid references auth.users(id),
  proxy_scope text,
  monthly_transfer_limit integer,
  per_transaction_limit_physical integer,
  per_transaction_limit_online integer,
  start_date date,
  status text default 'active' check (status in ('active', 'terminated')),
  created_at timestamptz default now()
);

-- カードチェックアウトログ
create table card_checkouts (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references accounts(id) not null,
  rsw_user_id uuid references auth.users(id) not null,
  checked_out_at timestamptz default now(),
  checked_in_at timestamptz,
  purpose text,
  created_at timestamptz default now()
);

-- アラート
create table alerts (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid references residents(id),
  alert_type text not null,
  severity text default 'warning' check (severity in ('info', 'warning', 'critical')),
  message text not null,
  related_transaction_id uuid references transactions(id),
  related_checkout_id uuid references card_checkouts(id),
  is_resolved boolean default false,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- 月次レポート
create table monthly_reports (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid references residents(id) not null,
  year_month text not null,
  total_income integer,
  total_expense integer,
  expense_by_category jsonb,
  ending_balance integer,
  alert_count integer default 0,
  pdf_path text,
  generated_at timestamptz default now(),
  unique(resident_id, year_month)
);

-- 連絡先（家族・後見監督人）
create table contacts (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid references residents(id) not null,
  user_id uuid references auth.users(id),
  role text not null check (role in ('family', 'supervisor', 'emergency')),
  name text not null,
  relationship text,
  phone text,
  email text,
  notify_realtime boolean default false,
  notify_monthly boolean default true,
  created_at timestamptz default now()
);

-- 招待
create table invitations (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid references residents(id) not null,
  email text not null,
  role text not null check (role in ('family', 'supervisor')),
  invited_by uuid references auth.users(id) not null,
  token text unique not null,
  accepted_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Phase 1用インデックス
create index idx_card_checkouts_active on card_checkouts(card_id) where checked_in_at is null;
create index idx_alerts_unresolved on alerts(resident_id) where is_resolved = false;
create index idx_contacts_user on contacts(user_id);
create index idx_invitations_token on invitations(token);

-- RLS有効化: invitations
alter table invitations enable row level security;

create policy "admin_all_invitations" on invitations for all
  using (get_user_role() = 'admin');

-- residents テーブルに Phase 1 用カラムを追加
alter table residents add column if not exists birth_date date;
alter table residents add column if not exists gender text;
alter table residents add column if not exists care_level text;
alter table residents add column if not exists health_notes text;
alter table residents add column if not exists move_in_date date;
alter table residents add column if not exists has_family boolean default false;
alter table residents add column if not exists updated_at timestamptz default now();

-- RLS有効化
alter table residents enable row level security;
alter table accounts enable row level security;
alter table transactions enable row level security;
alter table receipts enable row level security;
alter table user_profiles enable row level security;
alter table guardianship_contracts enable row level security;
alter table card_checkouts enable row level security;
alter table alerts enable row level security;
alter table monthly_reports enable row level security;
alter table contacts enable row level security;

-- RLSヘルパー関数
create or replace function get_user_role()
returns text as $$
  select role from user_profiles where id = auth.uid();
$$ language sql security definer;

-- RLSポリシー: residents
create policy "admin_all" on residents for all
  using (get_user_role() = 'admin');

create policy "family_select" on residents for select
  using (id in (select resident_id from contacts where user_id = auth.uid()));

create policy "supervisor_select" on residents for select
  using (get_user_role() = 'supervisor');

-- RLSポリシー: transactions
create policy "admin_all_tx" on transactions for all
  using (get_user_role() = 'admin');

create policy "family_select_tx" on transactions for select
  using (resident_id in (select resident_id from contacts where user_id = auth.uid()));

-- updated_at トリガー
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger residents_updated_at
  before update on residents
  for each row execute function update_updated_at();
