-- Jalankan SQL ini di Neon Postgres / Supabase SQL Editor
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  email VARCHAR(255) DEFAULT '',
  password VARCHAR(255) NOT NULL,
  is_premium_until DATE DEFAULT '9999-01-01',
  sheet_url TEXT DEFAULT '',
  created_at VARCHAR(19) NOT NULL DEFAULT to_char(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS')
);

-- Jika tabel sudah terlanjur dibuat sebelumnya, jalankan migrasi ini di SQL Editor Supabase:
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium_until DATE DEFAULT '9999-01-01';
ALTER TABLE users ADD COLUMN IF NOT EXISTS sheet_url TEXT DEFAULT '';
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'created_at' AND data_type <> 'character varying'
  ) THEN
    ALTER TABLE users ALTER COLUMN created_at TYPE VARCHAR(19) USING to_char(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS');
  END IF;
END $$;
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT to_char(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS');

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON TABLE public.users TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.users_id_seq TO service_role;

-- Tabel transactions (header/totalan per struk)
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  tx_id TEXT NOT NULL,
  date VARCHAR(10) NOT NULL,
  struk_name VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL,
  total INTEGER NOT NULL DEFAULT 0,
  tax INTEGER NOT NULL DEFAULT 0,
  service INTEGER NOT NULL DEFAULT 0,
  payment_method VARCHAR(64) NOT NULL DEFAULT 'QRIS',
  notes TEXT DEFAULT '',
  status VARCHAR(24) NOT NULL DEFAULT 'expense',
  shared_by VARCHAR(64) DEFAULT '',
  source_tx_id TEXT DEFAULT '',
  created_at VARCHAR(19) NOT NULL DEFAULT to_char(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS'),
  CONSTRAINT transactions_user_tx_unique UNIQUE (username, tx_id)
);

-- Migrasi jika tabel transactions versi lama sudah terlanjur dibuat
ALTER TABLE transactions DROP COLUMN IF EXISTS items;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tax INTEGER NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS service INTEGER NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status VARCHAR(24) NOT NULL DEFAULT 'expense';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS shared_by VARCHAR(64) DEFAULT '';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_tx_id TEXT DEFAULT '';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS split_details TEXT DEFAULT '[]';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS encrypted_payload TEXT DEFAULT '';
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'merchant'
  ) THEN
    ALTER TABLE transactions RENAME COLUMN merchant TO struk_name;
  END IF;
END $$;

-- Tabel transaction_items (detail pecahan per item & amount per item)
CREATE TABLE IF NOT EXISTS transaction_items (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  username VARCHAR(64) NOT NULL,
  tx_id TEXT NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  amount INTEGER NOT NULL DEFAULT 0,
  owner VARCHAR(64) DEFAULT '',
  owner_username VARCHAR(64) DEFAULT '',
  owner_name VARCHAR(64) DEFAULT '',
  created_at VARCHAR(19) NOT NULL DEFAULT to_char(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS')
);

ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS owner VARCHAR(64) DEFAULT '';
ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS owner_username VARCHAR(64) DEFAULT '';
ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS owner_name VARCHAR(64) DEFAULT '';
ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS encrypted_payload TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_transaction_items_tx_id ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_status ON transactions(username, status);

GRANT ALL ON TABLE public.transactions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.transactions_id_seq TO service_role;
GRANT ALL ON TABLE public.transaction_items TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.transaction_items_id_seq TO service_role;

-- Tabel friends (daftar teman berdasarkan email terdaftar)
CREATE TABLE IF NOT EXISTS friends (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  friend_username VARCHAR(64) NOT NULL,
  friend_email VARCHAR(255) DEFAULT '',
  created_at VARCHAR(19) NOT NULL DEFAULT to_char(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS'),
  CONSTRAINT friends_user_friend_unique UNIQUE (username, friend_username)
);

CREATE INDEX IF NOT EXISTS idx_friends_username ON friends(username);

GRANT ALL ON TABLE public.friends TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.friends_id_seq TO service_role;

-- Tabel audit_logs (catatan aktivitas / audit trail)
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  actor VARCHAR(64) NOT NULL DEFAULT '',
  action VARCHAR(64) NOT NULL,
  target VARCHAR(128) DEFAULT '',
  status VARCHAR(24) NOT NULL DEFAULT 'success',
  details TEXT DEFAULT '',
  ip_address VARCHAR(64) DEFAULT '',
  user_agent TEXT DEFAULT '',
  created_at VARCHAR(19) NOT NULL DEFAULT to_char(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

GRANT ALL ON TABLE public.audit_logs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.audit_logs_id_seq TO service_role;

-- Contoh data awal untuk pengujian:
INSERT INTO users (username, email, password, is_premium_until, sheet_url)
VALUES
  ('premium', 'premium@example.com', '123456', '9999-01-01', ''),
  ('demo', 'demo@example.com', '123456', NULL, '')
ON CONFLICT (username) DO NOTHING;
