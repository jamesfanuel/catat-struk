-- Jalankan SQL ini di Neon Postgres / Supabase SQL Editor (Gratis untuk Vercel)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  is_premium CHAR(1) NOT NULL DEFAULT 'Y' CHECK (is_premium IN ('Y', 'N')),
  sheet_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jika tabel sudah terlanjur dibuat sebelumnya, jalankan ALTER ini:
ALTER TABLE users ALTER COLUMN is_premium SET DEFAULT 'Y';
ALTER TABLE users ADD COLUMN IF NOT EXISTS sheet_url TEXT DEFAULT '';

-- Contoh data awal untuk pengujian:
INSERT INTO users (username, password, is_premium, sheet_url)
VALUES
  ('premium', '123456', 'Y', ''),
  ('demo', '123456', 'N', '')
ON CONFLICT (username) DO NOTHING;
