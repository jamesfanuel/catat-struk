# CatatStruk — Riwayat Versi & Fitur

---

## v1.0 — Rilis Awal (Core Expense & Google Sheets Sync)

Fitur unggulan yang menjadi fondasi CatatStruk:

- **Foto Struk & Hybrid AI / OCR Lokal**:
  - Ekstraksi otomatis nama toko, tanggal, kategori, metode pembayaran, rincian item, dan total Rupiah menggunakan **Gemini Vision API** (dengan *auto-fallback* multi-model).
  - Cadangan **OCR Lokal (`Tesseract.js` `ind+eng`)** langsung di browser jika API key tidak tersedia atau kuota limit.
  - Kompresi foto otomatis di browser (`HTML5 Canvas`) sebelum dikirim agar hemat kuota dan cepat diproses.
- **Sinkronisasi 2-Arah Google Sheets Pribadi**:
  - Mendukung mode **Privat / Restricted** (invite email bot Service Account) maupun **Publik / Editor** (Google Apps Script Bridge `Code.gs`).
  - Export rapi 1 item per baris dengan *merge cell* otomatis, format `"Rp "#,##0`, rumus `TOTAL`, serta *mirroring* 1:1 saat klik **Sync**.
- **Autentikasi, Enkripsi & Multi-Database**:
  - Registrasi & Login dengan verifikasi **OTP Email**, hashing `scrypt`, session token **HMAC-SHA256**, dan enkripsi field sensitif (`AES-256-GCM`).
  - Mendukung database **Supabase REST API**, **Neon Postgres**, serta *fallback* lokal (`db/users.json` & `db/transactions.json`) untuk development.
- **Split Bill & Tab Outstanding**:
  - Tag kepemilikan item ke teman (`@username`), hitung otomatis pajak & service charge per orang, dan kirim tagihan ke tab **Outstanding** teman.
- **Dashboard Analitik, Budget & Share Recap**:
  - Grafik pengeluaran per kategori (**Custom SVG Donut Chart**), filter periode bulanan/tahunan, batas anggaran bulanan, export CSV, dan **Share Recap** ke PNG / WhatsApp / X / Threads.
- **Mobile-First & PWA**:
  - Floating bottom navigation bar, Dark/Light Mode, lokasi pembelian (GPS / Google Maps), serta dukungan **PWA** (*Add to Home Screen*).

---

## v1.1 — Multi-Scan, Reimbursement & Planning Itinerary

Pembaruan produktivitas untuk kebutuhan tim, perjalanan dinas, dan pengelolaan klaim kantor:

- **Scan Multiple Struk (Batch Upload)**:
  - Bisa memilih dan mengunggah **beberapa foto struk sekaligus** dari galeri atau drag & drop.
  - Sistem memproses antrean struk satu per satu secara otomatis dengan indikator progres (*Struk 1 dari N*) dan langsung membuka form review tiap struk secara berurutan.
- **Reimbursement Tracker (Pengingat Klaim Kantor)**:
  - Opsi **Reimbursement** pada setiap struk untuk menandai pengeluaran yang akan dimintakan pengembalian dana ke kantor.
  - Status klaim (**Belum Diklaim** / **Sudah Diklaim**), ringkasan total dana siap reimburse, serta tab khusus **Reimburse** di Riwayat Struk agar tidak ada klaim yang terlewat.
- **Planning Itinerary & Timeline Biaya**:
  - Fitur perencanaan perjalanan/kegiatan dengan **timeline terstruktur per hari dan per jam**.
  - Rincian estimasi biaya per aktivitas/agenda yang otomatis dijumlahkan.
  - Pengaturan **Limit Budget Itinerary** dengan **peringatan (warning) otomatis** jika total estimasi biaya sudah mendekati limit (≥ 80%) atau melebihi limit (> 100%).
- **Peningkatan UX Login & Notifikasi**:
  - Animasi loading fullscreen saat verifikasi login/registrasi.
  - Google Sheet bersifat opsional saat login dengan tombol **Link Sheet** di menu bawah kiri untuk membuka panduan kapan saja.
  - Pusat notifikasi **Update Terbaru** yang muncul otomatis hingga user membaca sampai bawah dan menekan **OK**.
- **Social Share & Nearby Menu Finder**:
  - Tampilan feed visual bergaya Tumblr dengan foto tempat & makanan, filter hashtag kategori + menu, lokasi GPS, dan pengurutan berdasarkan rating/harga.
  - Bagikan rekomendasi langsung ke WhatsApp, salin caption ber-hashtag, atau buka di Google Maps.
- **Groups & Members (Eksklusif Maks. 50 Orang)**:
  - Buat grup (misal *Trip Bali*, *Tim Kantor*), beri nama grup, lalu invite anggota via email terdaftar (dibatasi maksimal 50 teman).
  - Aturan **kunci edit 1×24 jam** setelah grup dibentuk agar data Split Bill & Itinerary tetap aman dan konsisten.
  - Terintegrasi ke **Tagih Cepat ke Grup** pada struk dan **Itinerary Split Bill** (memisahkan agenda *Bayar Sendiri* vs *Split Bill* per orang).
- **Dashboard Desktop, Multi-Bahasa (`ID` ↔ `EN`) & Zero-Trust Security**:
  - Hamburger Sidebar/Drawer dengan route terdedikasi (`/`, `/itinerary`, `/social`) beserta animasi transisi halaman, tombol toggle Bahasa Indonesia / Inggris di kanan atas, serta 3 kategori fokus (`Daily Needs`, `Emergency`, `Self Reward`).
  - Middleware modular di `middleware/` dengan Rate Limiting, Progressive Throttling, Zero-Trust HMAC verification, Anti-CSRF, dan Security Headers.
