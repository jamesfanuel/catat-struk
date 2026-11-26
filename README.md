# CatatStruk — Foto Struk, Langsung Tercatat ke Google Sheets

Aplikasi pencatat keuangan **super ringan, zero-build, tanpa `node_modules`**, yang mengubah foto struk belanja (termasuk nota tulisan tangan) menjadi catatan keuangan rapi dan tersinkron langsung (2 arah) ke **Google Sheets pribadi** masing-masing pengguna.

---

## 1. Fitur Utama
- **Login & Registrasi Otomatis**: Akun tersimpan aman di database PostgreSQL (Supabase/Neon) dengan hashing `scrypt`, mendukung mode **Premium** (sync Google Sheet) dan **Demo**.
- **Foto Struk & AI / OCR Hybrid**: Ambil foto langsung dari kamera HP atau galeri; data toko, tanggal, kategori, metode bayar, rincian item, dan total Rupiah otomatis terisi.
- **Ramah Mobile & Semua Usia**: Floating rounded bottom nav bar (`Sync`, tombol kamera bulat di tengah, `Setting`), font jelas, format angka Rupiah otomatis (`tabular-nums`, anti-minus), serta daftar item terpisah (**Nama Item**, **Qty**, **Harga `Rp`** + tombol **`+ Tambah`**).
- **Sinkronisasi 2-Arah Google Sheets Pribadi**: Setiap user cukup menempelkan link Google Sheet kosong (*Anyone with the link → Editor*); data di-export 1 item per baris dengan *merge cell* otomatis, format `"Rp "#,##0`, rumus `TOTAL`, `Synced At` jam lokal, serta *mirroring* 1:1 saat klik **Sync**.

---

## 2. Teknologi di Balik Project Ini

### Frontend & PWA
- **Vanilla HTML5, CSS3, & ES Modules JS** ([index.html](./index.html), [styles.css](./styles.css), [app.js](./app.js)) — Tanpa framework berat atau bundler sehingga sangat cepat dimuat.
- **HTML5 Canvas Image Compression** — Foto struk dikompresi di browser (`maxWidth: 1024px`) sebelum dikirim agar hemat kuota dan cepat diproses.
- **Custom SVG Donut Chart** — Grafik pengeluaran per kategori ringan tanpa library eksternal.
- **PWA** ([manifest.json](./manifest.json), [sw.js](./sw.js)) — Mendukung *Add to Home Screen* dengan strategi caching **Network-First** (`catatstruk-v2`).

### Hybrid AI & Local OCR (`/api/scan`)
- **Gemini Vision API** ([api/scan.js](./api/scan.js)) — Membaca struk cetak dan nota tulisan tangan (termasuk singkatan `350K` → `350000`). Dilengkapi *auto-fallback* saat `404`/`429`/`503` antar model:
  `gemini-flash-lite-latest` → `gemini-flash-latest` → `gemini-3.8-flash` → `gemini-3.5-flash-lite` → `gemini-3.5-flash`.
- **OCR Lokal (`Tesseract.js` `ind+eng`)** — Otomatis aktif di browser sebagai cadangan 100% tanpa API key jika server/AI sedang limit atau sibuk.

### Sinkronisasi Google Sheets (`/api/sheets` & `Code.gs`)
- **Vercel Serverless Bridge** ([api/sheets.js](./api/sheets.js)) & **Google Apps Script** ([google-apps-script/Code.gs](./google-apps-script/Code.gs)) — Menggunakan `SpreadsheetApp.openByUrl(sheetUrl)` agar 1 bridge bisa melayani Google Sheet publik milik masing-masing user (mendukung juga Google Service Account JWT RS256).
- **Validasi Header Otomatis** — Mengecek baris pertama (`ID, Tanggal, Toko, Kategori, Item, Total (Rp), Metode Bayar, Catatan, Synced At`); menolak sheet yang berisi format tabel lain.

### Autentikasi, Database, & Keamanan (`/api/auth`)
- **Auth Serverless** ([api/auth.js](./api/auth.js)) — Tanpa library eksternal, memakai `node:crypto`:
  - **Password Hashing**: `scryptSync` + 16-byte random salt (`scrypt$<salt>$<hash>`) dan verifikasi `timingSafeEqual`.
  - **Session Token**: Token bertanda tangan **HMAC-SHA256** (`AUTH_SECRET`) berlaku 24 jam.
  - **Waktu WIB**: Kolom `created_at` memakai format `YYYY-MM-DD HH:mm:ss` zona waktu `Asia/Jakarta`.
  - **Safe Production Errors**: Detail error database dicatat hanya di log server; user hanya menerima pesan umum yang aman.
- **Database PostgreSQL** ([db/schema.sql](./db/schema.sql)) — Mendukung **Supabase REST API** dan **Neon Postgres** (serta fallback lokal `db/users.json` saat development).
- **Security Headers** ([vercel.json](./vercel.json)) — `HSTS`, `CSP`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, dan `Permissions-Policy: camera=(self)`.

---

## 3. Struktur Folder Project
```text
├── index.html                   # UI utama aplikasi web & modal
├── styles.css                   # Desain mobile-first, dark/light mode, animasi
├── app.js                       # Logika frontend, auth, scan, & mirroring Sheet
├── manifest.json & sw.js        # Konfigurasi PWA & Service Worker
├── vercel.json & .vercelignore  # Security headers & filter file deploy Vercel
├── .env.example                 # Template environment variables
├── api/
│   ├── auth.js                  # Login, register, verify token, & save_sheet
│   ├── scan.js                  # Proxy Gemini Vision + multi-model fallback
│   └── sheets.js                # Bridge Export/Import ke Google Sheets
├── db/
│   ├── schema.sql               # Skema tabel users + GRANT Supabase
│   └── users.json               # Database dummy khusus development lokal
├── google-apps-script/
│   └── Code.gs                  # Script Google Apps Script (merge, Rp, TOTAL)
├── mobile_app/                  # Project Flutter (Android & iOS) - tidak di-deploy ke Vercel
└── marketing/                   # Video promo HTML5 Canvas, MP4, GIF, & script caption
```

---

## 4. Cara Manage Database Supabase

### Setup Awal
1. Buat Organization & Project baru di [supabase.com](https://supabase.com) (pilih plan **Free** dan region terdekat, misal *Singapore*).
2. Buka **SQL Editor** → salin & jalankan seluruh isi [db/schema.sql](./db/schema.sql) (sudah termasuk `GRANT USAGE` & `GRANT ALL` untuk `service_role` serta format `created_at` WIB).
3. Ambil kredensial untuk Vercel:
   - **`SUPABASE_URL`**: menu **Project Settings → Data API → Project URL** (`https://xxxx.supabase.co`).
   - **`SUPABASE_SERVICE_ROLE_KEY`**: menu **Project Settings → API Keys → Secret keys (`default`)**. *(Tidak perlu password database karena koneksi memakai REST API.)*

### Query Manajemen Harian (SQL Editor Supabase)
```sql
-- Lihat semua user terdaftar
SELECT id, username, is_premium, sheet_url, created_at FROM public.users ORDER BY id DESC;

-- Ubah user tertentu menjadi Mode Demo ('N') atau Premium ('Y')
UPDATE public.users SET is_premium = 'N' WHERE username = 'nama_user';

-- Kosongkan seluruh data tabel users dan reset ID ke 1
TRUNCATE TABLE public.users RESTART IDENTITY;
```

---

## 5. Cara Setup & Update Google Apps Script (`Code.gs`)
1. Buka [script.google.com](https://script.google.com) → **New project**.
2. Tempel seluruh isi [google-apps-script/Code.gs](./google-apps-script/Code.gs) → **Save (`Ctrl + S`)**.
3. Klik **Deploy → New deployment → Web app**:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
4. Salin **Web app URL** (`https://script.google.com/macros/s/.../exec`) untuk diisi ke `APPS_SCRIPT_BRIDGE_URL`.
5. **Jika suatu saat mengubah `Code.gs`**: wajib klik **Deploy → Manage deployments → ikon pensil (✏️ Edit) → Version: pilih `New version` → Deploy** agar perubahan aktif (URL `/exec` tetap sama).

---

## 6. Cara Deploy Otomatis ke Vercel via Git

### Setup Pertama Kali (Sekali Saja)
1. Buat repository baru di GitHub, lalu push kode ini:
   ```powershell
   cd "d:\Menuju Milyader"
   git add .
   git commit -m "Initial CatatStruk Beta"
   git branch -M main
   git remote add origin https://github.com/USERNAME/NAMA-REPO.git
   git push -u origin main
   ```
2. Buka [vercel.com/new](https://vercel.com/new) → login dengan GitHub → klik **Import** pada repository Anda.
3. Biarkan pengaturan build default:
   - **Framework Preset**: `Other`
   - **Build Command**: *(kosong)*
   - **Output Directory**: *(kosong)*
4. Buka bagian **Environment Variables** (bisa klik **Import `.env`**) dan pastikan variabel berikut terisi:
   - `GEMINI_API_KEY`
   - `APPS_SCRIPT_BRIDGE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `AUTH_SECRET` *(string acak minimal 32 karakter)*
5. Klik **Deploy**.

### Update Otomatis Selanjutnya (Cukup `git push`)
Setelah terhubung ke GitHub, setiap kali ada perubahan kode di lokal Anda cukup jalankan:
```powershell
cd "d:\Menuju Milyader"
git add .
git commit -m "Deskripsi perubahan"
git push
```
Vercel otomatis mendeteksi push baru di branch `main` dan langsung men-deploy ulang dalam hitungan detik!

*(Catatan: Jika hanya mengubah nilai Environment Variables di dashboard Vercel tanpa mengubah kode, klik tab **Deployments → `•••` → Redeploy** agar nilai baru aktif.)*

---

## 7. Menjalankan di Lokal & Troubleshooting
- **Menjalankan di lokal**: Gunakan `npx vercel dev` (atau dev server Node.js yang memuat `.env` untuk `/api/*`).
- **Tampilan tidak berubah setelah update**: Lakukan **Hard Refresh (`Ctrl + Shift + R`)** agar Service Worker memuat versi terbaru.
- **Error `42501 permission denied` di Supabase**: Pastikan bagian `GRANT` di [db/schema.sql](./db/schema.sql) sudah dijalankan di SQL Editor Supabase.
