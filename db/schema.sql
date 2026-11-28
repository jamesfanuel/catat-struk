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

-- Tabel friends (daftar teman dalam grup berdasarkan email terdaftar, maks 50)
CREATE TABLE IF NOT EXISTS friends (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  friend_username VARCHAR(64) NOT NULL,
  friend_email VARCHAR(255) DEFAULT '',
  group_name VARCHAR(100) NOT NULL DEFAULT 'Umum',
  created_at VARCHAR(19) NOT NULL DEFAULT to_char(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS'),
  CONSTRAINT friends_user_friend_unique UNIQUE (username, friend_username)
);

ALTER TABLE friends ADD COLUMN IF NOT EXISTS group_name VARCHAR(100) NOT NULL DEFAULT 'Umum';

CREATE INDEX IF NOT EXISTS idx_friends_username ON friends(username);

GRANT ALL ON TABLE public.friends TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.friends_id_seq TO service_role;

-- Tabel friend_groups (daftar grup eksklusif milik user untuk itinerary & split bill)
CREATE TABLE IF NOT EXISTS friend_groups (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  group_name VARCHAR(100) NOT NULL,
  created_at VARCHAR(19) NOT NULL DEFAULT to_char(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS'),
  CONSTRAINT friend_groups_user_name_unique UNIQUE (username, group_name)
);

CREATE INDEX IF NOT EXISTS idx_friend_groups_username ON friend_groups(username);

GRANT ALL ON TABLE public.friend_groups TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.friend_groups_id_seq TO service_role;

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

-- Tabel version_history (catatan pembaruan & fitur tiap versi aplikasi)
CREATE TABLE IF NOT EXISTS version_history (
  id SERIAL PRIMARY KEY,
  version VARCHAR(32) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  released_at VARCHAR(19) NOT NULL DEFAULT to_char(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS')
);

GRANT ALL ON TABLE public.version_history TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.version_history_id_seq TO service_role;

INSERT INTO version_history (version, title, items)
VALUES
  (
    'v1.1',
    'Multi-Scan, Groups, Itinerary Split Bill & Social Food Journal',
    '[
      {"title": "Scan Multiple Struk (Batch Upload)", "details": ["Pilih atau drag & drop hingga 5 foto struk sekaligus dari galeri/PC.", "Semua struk diekstrak otomatis dan bisa langsung dikonfirmasi & disimpan sekaligus."]},
      {"title": "Merchant Favorit & Statistik Kunjungan", "details": ["Konfirmasi nama merchant saat scan struk dan pantau berapa kali berkunjung serta total pengeluaran per bulan/tahun."]},
      {"title": "Groups & Members (Maks. 50 Orang, Lock 1x24 Jam)", "details": ["Buat grup bernama khusus dan invite anggota via email (maksimal 50 teman eksklusif).", "Grup terkunci otomatis setelah 1x24 jam untuk menjaga integritas Split Bill & Itinerary."]},
      {"title": "Reimbursement Tracker (Pengingat Klaim Kantor)", "details": ["Tandai struk untuk pengembalian dana ke kantor (Belum Diklaim / Sudah Diklaim).", "Cek total dana siap klaim dan daftar pengingat di tab Reimburse."]},
      {"title": "Planning Itinerary (Bayar Sendiri vs Split Bill)", "details": ["Buat rencana perjalanan dengan budget maksimum, rincian biaya per hari/jam, dan pemisahan Bayar Sendiri vs Split Bill grup.", "Struk yang dihubungkan ke itinerary otomatis mengurangi sisa budget dengan warning jika mendekati atau melebihi limit."]},
      {"title": "Social Food Journal (Tumblr-Style Feed)", "details": ["Feed kartu foto makanan & tempat makan berdasarkan hashtag kategori, lokasi GPS, dan sort rating/harga.", "Bagikan rekomendasi ber-hashtag ke WhatsApp atau buka langsung di Google Maps."]},
      {"title": "Multi-Bahasa (ID/EN), Sidebar Routes & Zero-Trust Security", "details": ["Toggle bahasa ID/EN di kanan atas, Hamburger Sidebar (/itinerary, /social) dengan animasi transisi, serta Rate Limit, Throttling & Zero-Trust Middleware."]}
    ]'::jsonb
  ),
  (
    'v1.0',
    'Rilis Awal (Core Expense & Google Sheets Sync)',
    '[
      {"title": "Foto Struk & Hybrid AI / OCR Lokal", "details": ["Ekstraksi otomatis toko, tanggal, kategori, item, dan total Rupiah via Gemini Vision API dengan cadangan OCR Lokal (Tesseract.js)."]},
      {"title": "Sinkronisasi 2-Arah Google Sheets Pribadi", "details": ["Mendukung mode Privat (Invite Bot) maupun Publik (Apps Script Bridge), merge cell otomatis, format Rupiah, dan rumus TOTAL."]},
      {"title": "Autentikasi, Enkripsi & Multi-Database", "details": ["Registrasi & Login OTP Email, scrypt, session HMAC-SHA256, dan enkripsi AES-256-GCM (Supabase / Neon / JSON lokal)."]},
      {"title": "Split Bill, Analitik & PWA", "details": ["Tag teman (@username) & tab Outstanding, grafik SVG Donut Chart, batas anggaran bulanan, dan Share Recap."]}
    ]'::jsonb
  )
ON CONFLICT (version) DO UPDATE SET
  title = EXCLUDED.title,
  items = EXCLUDED.items;

-- Tabel Itinerary Planner per user
CREATE TABLE IF NOT EXISTS itineraries (
  id BIGSERIAL PRIMARY KEY,
  plan_id TEXT NOT NULL,
  username TEXT NOT NULL,
  title TEXT NOT NULL,
  budget_limit BIGINT DEFAULT 0,
  group_name TEXT DEFAULT '',
  items JSONB DEFAULT '[]'::jsonb,
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT '',
  UNIQUE (username, plan_id)
);

CREATE INDEX IF NOT EXISTS idx_itineraries_username ON itineraries(username);
GRANT ALL ON TABLE public.itineraries TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.itineraries_id_seq TO service_role;

-- Tabel Social Journal (ulasan tempat, makanan, hobi, travel, dll.)
CREATE TABLE IF NOT EXISTS social_journal (
  id BIGSERIAL PRIMARY KEY,
  post_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  resto TEXT NOT NULL,
  menu TEXT DEFAULT '',
  category TEXT DEFAULT 'fnb',
  price BIGINT DEFAULT 0,
  rating NUMERIC(3,1) DEFAULT 5.0,
  location TEXT DEFAULT '',
  note TEXT DEFAULT '',
  tags JSONB DEFAULT '[]'::jsonb,
  created_at_ms BIGINT DEFAULT 0,
  created_at TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_social_journal_username ON social_journal(username);
CREATE INDEX IF NOT EXISTS idx_social_journal_category ON social_journal(category);
GRANT ALL ON TABLE public.social_journal TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.social_journal_id_seq TO service_role;

-- Contoh data awal untuk pengujian (di-comment; aktifkan jika butuh user demo):
-- INSERT INTO users (username, email, password, is_premium_until, sheet_url)
-- VALUES
--   ('premium', 'premium@example.com', '123456', '9999-01-01', ''),
--   ('demo', 'demo@example.com', '123456', NULL, '')
-- ON CONFLICT (username) DO NOTHING;
