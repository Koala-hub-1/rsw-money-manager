-- シードデータ（Phase 0: 入居者2名 + 口座4つ）

insert into residents (name, name_kana) values
  ('田中 太郎', 'タナカ タロウ'),
  ('鈴木 花子', 'スズキ ハナコ');

insert into accounts (resident_id, account_type, label) values
  ((select id from residents where name='田中 太郎'), 'bank', '住信SBI 普通預金'),
  ((select id from residents where name='田中 太郎'), 'debit_card', '住信SBI デビット'),
  ((select id from residents where name='鈴木 花子'), 'bank', '住信SBI 普通預金'),
  ((select id from residents where name='鈴木 花子'), 'debit_card', '住信SBI デビット');

-- Supabase Storage: receiptsバケットを手動作成
-- Dashboard > Storage > New Bucket > Name: receipts, Public: false
