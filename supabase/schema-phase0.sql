-- Phase 0: RSW金銭管理プロトタイプ — DB定義
-- Supabase SQL Editorに貼り付けて実行

create table residents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_kana text,
  status text default 'active',
  created_at timestamptz default now()
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid references residents(id) not null,
  account_type text not null check (account_type in ('bank', 'debit_card')),
  label text not null,
  current_balance integer default 0,
  last_updated timestamptz,
  created_at timestamptz default now()
);

create table receipts (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  memo text,
  uploaded_at timestamptz default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid references residents(id) not null,
  account_id uuid references accounts(id) not null,
  transaction_date date not null,
  description text,
  amount integer not null,
  balance_after integer,
  category text,
  receipt_id uuid references receipts(id),
  raw_csv_line text,
  created_at timestamptz default now()
);

create table csv_imports (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid references residents(id) not null,
  account_id uuid references accounts(id) not null,
  file_name text,
  row_count integer,
  imported_at timestamptz default now()
);

create index idx_transactions_resident on transactions(resident_id);
create index idx_transactions_account on transactions(account_id);
create index idx_transactions_date on transactions(transaction_date desc);
create index idx_transactions_category on transactions(category);
