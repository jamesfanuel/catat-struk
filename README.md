# CatatStruk — Foto Struk, Langsung Tercatat ke Google Sheets

Aplikasi pencatat keuangan **super ringan, zero-build, tanpa `node_modules`**, yang mengubah foto struk belanja (termasuk nota tulisan tangan) menjadi catatan keuangan rapi dan tersinkron langsung (2 arah) ke **Google Sheets pribadi** masing-masing pengguna.

---

## Teknologi di Balik Project Ini

### 1. Frontend Web & PWA (Ultra-Lightweight)
- **Vanilla HTML5, CSS3, & ES Modules JavaScript** ([index.html](./index.html), [styles.css](./styles.css), [app.js](./app.js)) — Tanpa framework berat atau bundler sehingga waktu muat instan di HP maupun desktop.
- **UI Mobile-First & Ramah Semua Usia** — Floating rounded bottom nav bar, tombol sentuh besar, input angka Rupiah otomatis (`tabular-nums`, anti-minus), daftar item dinamis, Dark/Light Mode, dan grafik donat kategori SVG kustom.
- **Kompresi Gambar Client-Side (HTML5 Canvas)** — Foto struk otomatis dikompresi di browser sebelum dikirim agar hemat kuota dan cepat diproses.
- **Progressive Web App (PWA)** ([manifest.json](./manifest.json), [sw.js](./sw.js)) — Mendukung *Add to Home Screen* di Android/iOS dengan strategi caching *Network-First*.

### 2. Hybrid AI & Local OCR Scanner
- **Gemini Vision API (`/api/scan`)** ([api/scan.js](./api/scan.js)) — Mengekstrak toko, tanggal, kategori, metode bayar, rincian item, dan total Rupiah (termasuk nota tulisan tangan & singkatan `350K` → `350000`). Dilengkapi *auto-fallback* antar model (`gemini-flash-lite-latest` → `gemini-flash-latest` → `gemini-3.8-flash` → `gemini-3.5-flash-lite` → `gemini-3.5-flash`).
- **OCR Lokal di Browser (`Tesseract.js`)** — Berjalan otomatis sebagai cadangan 100% tanpa API key jika server sedang limit/sibuk, dipadukan dengan parser struk Indonesia di `app.js`.

### 3. Sinkronisasi 2-Arah Google Sheets
- **Vercel Serverless Bridge (`/api/sheets`)** ([api/sheets.js](./api/sheets.js)) & **Google Apps Script** ([google-apps-script/Code.gs](./google-apps-script/Code.gs)) — Pengguna cukup menempelkan link Google Sheet kosong (*Anyone with the link → Editor*), tanpa perlu konfigurasi script sendiri.
- **Format Rapi Otomatis**: Validasi header sheet (`A1:I1`), 1 item per baris dengan *vertical cell merge* per `ID` struk, format currency `"Rp "#,##0`, baris `TOTAL =SUM(F2:F...)`, `Synced At` sesuai jam lokal PC/browser, serta *mirroring* 1:1 saat *Sync*.

### 4. Autentikasi & Database Serverless
- **Auth API (`/api/auth`)** ([api/auth.js](./api/auth.js)) — Login & Registrasi dengan token sesi bertanda tangan **HMAC-SHA256** (Node.js `node:crypto` bawaan, tanpa library eksternal).
- **Database PostgreSQL** ([db/schema.sql](./db/schema.sql)) — Mendukung **Supabase REST API** dan **Neon Postgres** untuk menyimpan `username`, `password`, `is_premium`, dan `sheet_url` per pengguna (dengan fallback lokal `db/users.json` saat development).

### 5. Hosting, Keamanan, & Bonus Modul
- **Vercel Hosting & Security Headers** ([vercel.json](./vercel.json), [.vercelignore](./.vercelignore)) — Dilengkapi header `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, dan `Permissions-Policy: camera=(self)`.
- **Aplikasi Mobile Native (`mobile_app/`)** — Versi **Flutter (Android & iOS)** dengan `image_picker` dan `shared_preferences`.
- **Marketing Video Studio (`marketing/`)** — Generator video vertikal `1080×1920` (HTML5 Canvas & Python OpenCV/Pillow `.mp4` / `.gif`).

---

## Cara Menjalankan di Lokal
```bash
# 1. Salin .env.example menjadi .env dan isi konfigurasi yang diperlukan
# 2. Jalankan dev server atau deploy langsung ke Vercel
npx vercel dev
```

## Cara Deploy ke Vercel
1. Jalankan [db/schema.sql](./db/schema.sql) di **SQL Editor** Supabase atau Neon Postgres.
2. Push repository ini ke GitHub dan **Import** di [vercel.com/new](https://vercel.com/new) (*Framework Preset: Other*).
3. Tambahkan Environment Variables (`GEMINI_API_KEY`, `APPS_SCRIPT_BRIDGE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET`) di **Vercel Settings → Environment Variables**, lalu **Redeploy**.
