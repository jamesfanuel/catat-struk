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
UPDATE users SET is_premium_until = CASE WHEN is_premium = 'N' THEN NULL ELSE '9999-01-01'::date END WHERE is_premium_until IS NULL;
ALTER TABLE users DROP COLUMN IF EXISTS is_premium;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sheet_url TEXT DEFAULT '';
ALTER TABLE users ALTER COLUMN created_at TYPE VARCHAR(19) USING to_char(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS');
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
  payment_method VARCHAR(64) NOT NULL DEFAULT 'QRIS',
  notes TEXT DEFAULT '',
  created_at VARCHAR(19) NOT NULL DEFAULT to_char(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS'),
  CONSTRAINT transactions_user_tx_unique UNIQUE (username, tx_id)
);

-- Migrasi jika tabel transactions versi lama sudah terlanjur dibuat
ALTER TABLE transactions DROP COLUMN IF EXISTS items;
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
  created_at VARCHAR(19) NOT NULL DEFAULT to_char(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_transaction_items_tx_id ON transaction_items(transaction_id);

GRANT ALL ON TABLE public.transactions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.transactions_id_seq TO service_role;
GRANT ALL ON TABLE public.transaction_items TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.transaction_items_id_seq TO service_role;

-- Contoh data awal untuk pengujian:
INSERT INTO users (username, email, password, is_premium_until, sheet_url)
VALUES
  ('premium', 'premium@example.com', '123456', '9999-01-01', ''),
  ('demo', 'demo@example.com', '123456', NULL, '')
ON CONFLICT (username) DO NOTHING;
