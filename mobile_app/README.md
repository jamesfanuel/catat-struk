# CatatStruk Mobile (Android & iOS)

Aplikasi mobile **CatatStruk** berbasis Flutter untuk **Android** dan **iOS** dengan fokus fungsi dasar: **foto struk belanja -> catat ke aplikasi**. *(Koneksi Google Sheet disiapkan untuk update berikutnya.)*

## Fitur Utama
- **Foto Struk & Pilih Galeri** (`image_picker` native Android & iOS).
- **Ekstrak Otomatis dengan Gemini AI** (opsional lewat Pengaturan; tersedia juga **Mode Coba / Demo** dan **Catat Manual**).
- **Format Rupiah & Anti-Minus** otomatis pada total, budget, dan harga item.
- **Daftar Item Terpisah**: Nama Item, Qty (min 1), Harga (`Rp`), dan tombol **+ Tambah**.
- **Ramah Semua Usia**: Tombol besar, teks jelas, dan menu navigasi bawah (*Beranda*, *Foto Struk*, *Pengaturan*).
- **Penyimpanan Lokal** aman di perangkat (`shared_preferences`).

## Cara Menjalankan & Build (Android & iOS)
Jalankan perintah berikut di folder `d:\Menuju Milyader\mobile_app`:

```bash
# 1. Lengkapi file runner native (Gradle/Xcode) jika belum ada
flutter create --org com.catatstruk --project-name catatstruk_mobile .

# 2. Unduh dependencies
flutter pub get

# 3. Jalankan di emulator atau HP Android/iOS
flutter run

# 4. Build APK Android siap install
flutter build apk --release
```

Untuk build iOS (`.ipa`), jalankan `flutter build ios --release` di macOS dengan Xcode.
