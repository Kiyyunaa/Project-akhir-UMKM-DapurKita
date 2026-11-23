DapurKita - Flutter Mobile App

1. Deskripsi Project
DapurKita adalah aplikasi mobile untuk pemesanan makanan berupa sayuran dan lauk matang siap santap dari satu UMKM.
Aplikasi ini memiliki dua jenis pengguna:

* User: Pelanggan yang dapat melihat menu, melakukan pemesanan, pembayaran, dan melihat riwayat pesanan.
* Admin: Penjual yang dapat mengelola menu, kategori, pesanan, pembayaran, pengeluaran, dan melihat laporan penjualan.
Aplikasi dibuat menggunakan Flutter dan hanya ditujukan untuk perangkat mobile Android.

2. Teknologi yang Digunakan

* Flutter sebagai framework aplikasi mobile.
* Dart sebagai bahasa pemrograman.
* Express.js + TypeScript sebagai backend API.
* MySQL sebagai database.
* JWT untuk autentikasi.
* Cloudinary untuk penyimpanan gambar produk.

3. Ketentuan Tampilan Aplikasi
Aplikasi DapurKita hanya memiliki tampilan mobile.
Ketentuan:

* Tidak perlu membuat tampilan website.
* Tidak perlu membuat dashboard untuk laptop atau desktop.
* Tampilan User dan Admin sama-sama dioptimalkan untuk handphone.
* Gunakan desain modern, sederhana, dan mudah dipahami.
* Gunakan warna utama hijau, putih, dan cream.
* Gunakan ukuran teks yang nyaman dibaca.
* Tombol harus mudah ditekan.
* Tampilan harus konsisten pada setiap halaman.
Warna Utama
NamaKode WarnaForest Green#244B38Warm Cream#F6F4ECWhite#FFFFFFSage Green#DCE8DCCharcoal#292D29Muted Orange#D69A46

4. Fitur User
5. Registrasi akun pelanggan.
6. Login dan logout.
7. Melihat daftar menu makanan.
8. Melihat detail produk.
9. Mencari dan memfilter produk.
10. Menambahkan produk ke keranjang.
11. Melakukan checkout.
12. Memilih metode pembayaran:

* COD
* Transfer Bank
* QRIS

9. Melihat status pesanan.
10. Melihat riwayat pesanan.
11. Mengelola profil dan alamat.
12. Fitur Admin
13. Login Admin.
14. Melihat dashboard penjualan.
15. Melihat grafik penjualan.
16. Mengelola kategori makanan.
17. Menambahkan, mengubah, dan menghapus produk.
18. Mengatur stok dan ketersediaan menu.
19. Melihat daftar pesanan pelanggan.
20. Mengubah status pesanan.
21. Mengelola status pembayaran.
22. Mengelola pengeluaran.
23. Melihat data pelanggan.
24. Melihat notifikasi.
Admin menggunakan aplikasi mobile yang sama, tetapi halaman dan fitur yang ditampilkan menyesuaikan role akun.
25. Struktur Folder Flutter
Gunakan struktur folder sederhana berikut:
lib/
│
├── main.dart
│
├── models/
│   ├── user_model.dart
│   ├── product_model.dart
│   ├── category_model.dart
│   └── order_model.dart
│
├── services/
│   ├── api_service.dart
│   └── auth_service.dart
│
├── screens/
│   │
│   ├── auth/
│   │   ├── login_screen.dart
│   │   └── register_screen.dart
│   │
│   ├── user/
│   │   ├── home_screen.dart
│   │   ├── product_detail_screen.dart
│   │   ├── cart_screen.dart
│   │   ├── checkout_screen.dart
│   │   ├── order_screen.dart
│   │   └── profile_screen.dart
│   │
│   └── admin/
│       ├── dashboard_screen.dart
│       ├── product_screen.dart
│       ├── category_screen.dart
│       ├── order_screen.dart
│       ├── expense_screen.dart
│       └── user_screen.dart
│
├── widgets/
│   ├── custom_button.dart
│   ├── product_card.dart
│   └── custom_text_field.dart
│
└── utils/
└── app_colors.dart
Struktur folder boleh dikembangkan jika memang dibutuhkan, tetapi jangan menambahkan folder atau file yang tidak memiliki fungsi jelas.
26. Aturan Penulisan Kode Flutter
Kode harus dibuat dengan gaya sederhana, rapi, dan mudah dipahami oleh siswa SMK yang baru belajar Flutter.
Ketentuan penulisan:
27. Gunakan StatefulWidget dan StatelessWidget sesuai kebutuhan.
28. Gunakan nama variabel dan fungsi yang mudah dimengerti.
29. Pisahkan halaman berdasarkan fitur dan role.
30. Gunakan widget sederhana agar kode tidak terlalu panjang.
31. Gunakan kembali widget yang sama jika memiliki fungsi serupa.
32. Hindari kode yang terlalu rumit dan sulit dipahami.
33. Hindari penggunaan arsitektur kompleks yang belum diperlukan.
34. Berikan komentar pada bagian kode yang penting atau sulit dipahami.
35. Jangan menumpuk semua kode aplikasi di dalam main.dart.
36. Pastikan setiap file memiliki fungsi yang jelas.
Contoh gaya kode yang diharapkan:
class HomeScreen extends StatelessWidget {
const HomeScreen({super.key});

@override
Widget build(BuildContext context) {
return Scaffold(
appBar: AppBar(
title: const Text('DapurKita'),
),
body: const Center(
child: Text('Selamat Datang'),
),
);
}
}

8. Aturan Integrasi Backend
Aplikasi Flutter harus terhubung dengan backend DapurKita melalui REST API.
Ketentuan:

* Gunakan API yang sudah dibuat pada backend.
* Gunakan api_service.dart untuk membantu komunikasi dengan API.
* Gunakan JWT untuk mengakses endpoint yang membutuhkan autentikasi.
* Simpan token login agar tidak perlu login berulang kali.
* Sesuaikan tampilan berdasarkan role User atau Admin.
* Tampilkan pesan jika API mengalami error.
* Gunakan data dari API, bukan data contoh permanen, ketika fitur sudah diintegrasikan.

9. Alur Pengerjaan
Pengerjaan Flutter dilakukan secara bertahap agar mudah diperiksa.
10. Membuat project Flutter.
11. Mengatur struktur folder.
12. Membuat tema warna dan komponen dasar.
13. Membuat halaman Login dan Register.
14. Membuat navigasi berdasarkan role.
15. Membuat halaman User.
16. Membuat halaman Admin.
17. Menghubungkan aplikasi dengan backend API.
18. Melakukan pengujian setiap fitur.
19. Memperbaiki error dan merapikan kode.
Jangan langsung membuat seluruh aplikasi sekaligus. Selesaikan satu bagian, jalankan, dan pastikan tidak ada error sebelum melanjutkan.
20. Target Akhir
Aplikasi DapurKita diharapkan memiliki:

* Tampilan mobile yang modern dan sederhana.
* Fitur User dan Admin yang berjalan dengan baik.
* Kode Flutter yang rapi dan mudah dipelajari.
* Integrasi dengan backend Express + TypeScript.
* Sistem autentikasi dan pembagian role.
* Fitur pemesanan makanan yang dapat digunakan pelanggan.
* Fitur pengelolaan menu dan pesanan yang dapat digunakan Admin.
Catatan penting: Prioritaskan kode yang mudah dipahami dan berfungsi dengan baik. Tidak perlu membuat kode terlihat canggih jika justru membuat proses belajar dan pengembangan menjadi sulit.

11. Fitur Upload Gambar & Ambil Foto (Kamera / Galeri)
Aplikasi mendukung fitur pilih gambar dari galeri dan ambil foto langsung menggunakan kamera (untuk kebutuhan gambar produk/menu, bukti pembayaran, atau foto profil) yang selanjutnya dikirim ke backend Express + TypeScript untuk diunggah ke Cloudinary.
Ketentuan & Cara Setup:

* Tambahkan package yang dibutuhkan di `pubspec.yaml` (seperti `image_picker` dan `http` / `dio`), lalu jalankan `flutter pub get`.
* Atur konfigurasi/izin akses kamera dan galeri pada project Android (`android/app/src/main/AndroidManifest.xml`) sesuai kebutuhan package dan versi Android.
* Gunakan `ImagePicker` untuk memilih gambar dari galeri (`ImageSource.gallery`) atau mengambil foto dari kamera (`ImageSource.camera`), tampilkan preview gambar di UI, lalu kirim file gambar ke endpoint upload backend menggunakan `multipart/form-data` agar diteruskan ke Cloudinary.
* Pelajari dan rujuk catatan serta panduan teknis pada Medium: [https://divdannn.medium.com/](https://divdannn.medium.com/) serta file/materi pembelajaran yang tersedia (seperti referensi `pubspec.yaml` dan package di `#6 Flutter Dependencies.pdf`, serta `Image` widget di `#3 Basic Widget.pdf`).