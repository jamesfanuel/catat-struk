# CatatStruk — Foto Struk, Langsung Tercatat ke Google Sheets

Aplikasi pencatat keuangan **super ringan (~35 KB total)**, tanpa backend, tanpa database ribet, dan 100% gratis di-host di mana saja (GitHub Pages, Vercel, Netlify, atau Cloudflare Pages).

Cocok untuk di-share ke social media karena siapa pun bisa langsung mencoba **Mode Demo** atau menghubungkan ke **Gemini API Key** & **Google Sheets pribadi** masing-masing dalam 1 menit!

## Fitur Utama
- **Foto Struk / Upload Gambar**: Buka kamera langsung dari HP atau drag-and-drop foto struk.
- **AI Receipt Scanner (Gemini Vision)**: Otomatis membaca nama toko, tanggal, kategori, daftar item, metode bayar, dan total belanja.
- **Mode Demo Instan**: Bisa dicoba langsung tanpa API Key dengan tombol *Coba Scan Struk Contoh*.
- **Connect ke Google Sheets Pribadi**: Setiap user menempelkan Web App URL dari Google Apps Script miliknya sendiri — data langsung masuk ke spreadsheet pribadi tanpa login OAuth yang rumit.
- **Ringan & Privat**: Tidak ada server perantara; API Key & riwayat lokal tersimpan aman di browser (`localStorage`), plus gambar struk otomatis dikompresi agar hemat memori.
- **Dashboard & Analitik**: Ringkasan pengeluaran bulanan, progress bar target budget, grafik donat kategori SVG ringan, filter/pencarian, Dark Mode, dan Export CSV.
- **PWA Ready**: Bisa di-install ke layar utama HP (*Add to Home Screen*) dan tetap bisa dibuka saat offline.

## Cara Menjalankan di Lokal
Karena menggunakan ES Modules & Service Worker, jalankan lewat static server sederhana:

```bash
# Menggunakan Python
python -m http.server 8080

# Atau menggunakan Node.js
npx serve .
```

Lalu buka `http://localhost:8080`.

## Cara Menghubungkan Google Sheets Pribadi (Per User)
1. Buat spreadsheet baru di [sheets.new](https://sheets.new).
2. Klik menu **Extensions** -> **Apps Script**.
3. Salin isi file [`google-apps-script/Code.gs`](./google-apps-script/Code.gs) ke editor Apps Script.
4. Klik **Deploy** -> **New deployment** -> pilih **Web app**.
5. Set *Who has access* menjadi **Anyone**, lalu klik **Deploy**.
6. Salin URL Web App (`https://script.google.com/macros/s/.../exec`) dan tempel di menu **Pengaturan** pada aplikasi CatatStruk.

## Cara Deploy Gratis untuk Dibagikan di Social Media
- **GitHub Pages**: Push folder ini ke repository GitHub, aktifkan GitHub Pages di *Settings -> Pages*.
- **Vercel / Netlify / Cloudflare Pages**: Drag-and-drop folder ini atau hubungkan repo GitHub — langsung live tanpa build step!
