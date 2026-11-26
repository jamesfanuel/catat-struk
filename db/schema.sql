-- Jalankan SQL ini di Neon Postgres / Supabase SQL Editor (Gratis untuk Vercel)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  is_premium CHAR(1) NOT NULL DEFAULT 'Y' CHECK (is_premium IN ('Y', 'N')),
  sheet_url TEXT DEFAULT '',
  created_at VARCHAR(19) NOT NULL DEFAULT to_char(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS')
);

-- Jika tabel sudah terlanjur dibuat sebelumnya, jalankan ALTER & GRANT ini:
ALTER TABLE users ALTER COLUMN is_premium SET DEFAULT 'Y';
ALTER TABLE users ADD COLUMN IF NOT EXISTS sheet_url TEXT DEFAULT '';
ALTER TABLE users ALTER COLUMN created_at TYPE VARCHAR(19) USING to_char(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS');
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT to_char(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS');
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON TABLE public.users TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.users_id_seq TO service_role;

-- Contoh data awal untuk pengujian:
INSERT INTO users (username, password, is_premium, sheet_url)
VALUES
  ('premium', '123456', 'Y', ''),
  ('demo', '123456', 'N', '')
ON CONFLICT (username) DO NOTHING;
