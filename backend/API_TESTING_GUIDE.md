# Panduan Testing API DapurKita — 2 Role (Admin & Pengguna)

Panduan ini dibuat khusus untuk project DapurKita, berdasarkan route yang ada di `src/routes/`,
validasi Zod di `src/validations/`, dan perilaku controller di `src/controllers/`.

---

## 0. Persiapan (wajib sebelum testing)

```powershell
cd C:\DapurKita\backend
npm run dev            # jalan di http://localhost:6000
```

> Migrasi tabel sekarang **dijalankan otomatis** oleh `src/server.ts` lewat `initializeDatabase()`
> sebelum seeder admin. `npm run db:migrate` tetap bisa dipakai manual kalau ingin menyiapkan DB
> tanpa menjalankan server.
>
> Pastikan `.env` sudah berisi `port`, `JWT_SECRET`, `ADMIN_PASSWORD`, dan kredensial database.
> `JWT_SECRET` dan `ADMIN_PASSWORD` **wajib** — server akan berhenti kalau kosong.

**Informasi server**
- Base URL: `http://localhost:6000` (dari `.env`: `port=6000`; default `5000` kalau env kosong)
- Format response: `{ "message": "...", "data": ... }`
- Request validation gagal: `400` + `{ message: "Validasi data gagal.", errors: [{ field, message }] }`
- Login/register dibatasi 20 percobaan per 15 menit per IP (`429` kalau terlalu sering).

**Kredensial admin** (diambil dari `.env`):

| Field | Nilai |
|---|---|
| Email | `ADMIN_EMAIL` (default: `admin@dapurkita.com`) |
| Password | `ADMIN_PASSWORD` (wajib diisi sendiri, tidak ada nilai bawaan) |

**Aturan token (PENTING untuk 2 role)**
- Token didapat dari response `POST /api/auth/login` atau `POST /api/auth/register` (field `token`).
- Semua endpoint yang butuh auth memakai header: `Authorization: Bearer <token>`.
- Token **admin** dan token **user** berbeda. Simpan keduanya terpisah:
  - `TOKEN_ADMIN` → dari login admin
  - `TOKEN_USER` → dari register/login user
- Role dibaca dari payload JWT. Salah role → `403`.
- Endpoint publik (tanpa token): `GET /`, `POST /api/auth/register`, `POST /api/auth/login`,
  `GET /api/categories`, `GET /api/categories/:id`, `GET /api/products`, `GET /api/products/:id`.

### Contoh curl (PowerShell)

```powershell
# Login admin -> simpan token
curl.exe -X POST http://localhost:6000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@dapurkita.com","password":"<ADMIN_PASSWORD dari .env>"}'

# Pakai token (ganti <TOKEN> dengan token hasil login)
curl.exe -X GET http://localhost:6000/api/auth/profile `
  -H "Authorization: Bearer <TOKEN>"
```

---

## 1. ALUR ROLE ADMIN

### A1. Login & cek identitas

| # | Method | Endpoint | Body | Expect |
|---|---|---|---|---|
| 1 | POST | `/api/auth/login` | `{"email":"<ADMIN_EMAIL>","password":"<ADMIN_PASSWORD dari .env>"}` | `200`, simpan `token` → `TOKEN_ADMIN` |
| 2 | GET | `/api/auth/profile` | — | `200`, `data.role` harus `"admin"` |

### A2. Siapkan data master (kategori & produk)

| # | Method | Endpoint | Body | Expect |
|---|---|---|---|---|
| 3 | POST | `/api/categories` | `{"name":"Sayur Segar","description":"Sayur harian"}` | `201`, catat `id` → `CAT_ID` |
| 4 | GET | `/api/categories` | — | `200`, kategori baru muncul |
| 5 | POST | `/api/products` | `multipart/form-data`: `category_id=<CAT_ID>`, `name=Bayam Segar`, `capital_price=5000`, `selling_price=8000`, `stock=50`, `is_available=true`, `image?` (opsional) | `201`, catat `id` → `PROD_ID` |
| 6 | GET | `/api/products?search=Bayam&category_id=<CAT_ID>` | — | `200`, filter nama & kategori jalan |
| 7 | PUT | `/api/products/<PROD_ID>` | `{"selling_price":9000,"stock":40}` | `200`, harga & stok berubah |

> Upload `image` hanya JPG/JPEG/PNG/WEBP, maks 5MB, dan butuh kredensial Cloudinary di `.env`.
> Tanpa file gambar endpoint ini tetap bisa dipakai.

### A3. Kelola pesanan masuk (lakukan setelah user memesan)

| # | Method | Endpoint | Body | Expect |
|---|---|---|---|---|
| 8 | GET | `/api/orders` | — | `200`, semua pesanan (termasuk punya user) muncul |
| 9 | GET | `/api/orders/<ORDER_ID>` | — | `200`, ada `data.items[]` berisi snapshot harga & modal |
| 10 | PATCH | `/api/orders/<ORDER_ID>/status` | `{"status":"processing"}` | `200`; lanjutkan `ready_to_deliver` → `delivering` → `completed` |
| 11 | GET | `/api/notifications` | — | `200`, ada notifikasi `pesanan_baru` untuk admin |

Status order yang diterima: `pending`, `processing`, `ready_to_deliver`, `delivering`,
`completed`, `cancelled` (disimpan ke DB dalam Bahasa Indonesia oleh mapper).

### A4. Verifikasi pembayaran

| # | Method | Endpoint | Body | Expect |
|---|---|---|---|---|
| 12 | GET | `/api/payments/<ORDER_ID>` | — | `200`, `proof_url` terisi kalau user sudah upload bukti |
| 13 | PATCH | `/api/payments/<ORDER_ID>/status` | `{"payment_status":"paid"}` | `200`, `paid_at` ikut terisi |

`payment_status` yang diterima: `unpaid`, `paid`, `failed`.

### A5. Keuangan, operasional & dashboard

| # | Method | Endpoint | Body / Query | Expect |
|---|---|---|---|---|
| 14 | POST | `/api/expenses` | `{"title":"Beli bensin","category":"fuel","amount":50000,"expense_date":"2026-11-19"}` | `201` |
| 15 | GET | `/api/expenses?start_date=2026-11-01&end_date=2026-11-30&category=fuel` | — | `200` |
| 16 | PUT | `/api/expenses/<EXPENSE_ID>` | `{"amount":60000}` | `200` |
| 17 | GET | `/api/dashboard/analytics?start_date=2026-11-01&end_date=2026-11-30` | — | `200`, cek `data.summary.net_profit` |
| 18 | GET | `/api/dashboard/chart?type=monthly` | — | `200`; coba juga `type=daily` |
| 19 | GET | `/api/users` | — | `200`, akun user terdaftar |
| 20 | GET | `/api/users/<USER_ID>` | — | `200` |
| 21 | PATCH | `/api/notifications/<NOTIF_ID>/read` | — | `200` |

Kategori expense yang diterima: `raw_material`, `packaging`, `fuel`, `utility`, `other`.

### A6. Negative test admin

| Percobaan | Expect |
|---|---|
| `DELETE /api/categories/<CAT_ID>` saat kategori masih dipakai produk | `500` (FK `ON DELETE RESTRICT`). Hapus produk dulu / pakai kategori baru |
| `POST /api/orders` pakai `TOKEN_ADMIN` | `403` — endpoint ini khusus user |
| Endpoint apa pun tanpa header Authorization | `401` |
| `PUT`/`DELETE` dengan ID yang tidak ada (kategori/produk/expense/pembayaran) | `404` |
| `POST /api/auth/login` dengan email tidak terdaftar | `401` |
| Lebih dari 20 login/register dalam 15 menit dari IP yang sama | `429` |

---

## 2. ALUR ROLE PENGGUNA (USER)

### B1. Daftar / login & profil

| # | Method | Endpoint | Body | Expect |
|---|---|---|---|---|
| 1 | POST | `/api/auth/register` | `{"name":"Pelanggan Satu","email":"user1@gmail.com","password":"rahasia123","phone":"081234567890","address":"Jl. Melati No. 5"}` | `201`, `data.role` = `"user"`, simpan `token` → `TOKEN_USER` |
| 2 | POST | `/api/auth/login` | `{"email":"user1@gmail.com","password":"rahasia123"}` | `200` (pakai ini kalau sudah terdaftar) |
| 3 | GET | `/api/auth/profile` | — | `200`, alamat utama ikut terisi |
| 4 | PUT | `/api/auth/profile` | `{"name":"Pelanggan Update","phone":"081234567891","address":"Jl. Mawar No. 7"}` | `200` |

Email duplikat saat register → `409`.

### B2. Lihat katalog (publik, tanpa token)

| # | Method | Endpoint | Expect |
|---|---|---|---|
| 5 | GET | `/api/categories` | `200` |
| 6 | GET | `/api/products` | `200` |
| 7 | GET | `/api/products?search=Bayam` | `200` |
| 8 | GET | `/api/products/<PROD_ID>` | `200` |

### B3. Pesan & bayar

| # | Method | Endpoint | Body | Expect |
|---|---|---|---|---|
| 9 | POST | `/api/orders` | `{"items":[{"product_id":<PROD_ID>,"quantity":2}],"delivery_address":"Jl. Mawar No. 7, Bandung","notes":"Tolong dibungkus rapi","payment_method":"transfer"}` | `201`, catat `id` → `ORDER_ID`; stok produk otomatis berkurang |
| 10 | GET | `/api/orders/my-orders` | — | `200`, hanya pesanan sendiri |
| 11 | GET | `/api/orders/<ORDER_ID>` | — | `200`, lengkap dengan `items[]` |
| 12 | POST | `/api/payments/<ORDER_ID>/proof` | `multipart/form-data`, field **`proof`** = file gambar | `200`, `proof_url` terisi |
| 13 | GET | `/api/payments/<ORDER_ID>` | — | `200`, sebelum diverifikasi admin: `payment_status = "unpaid"` |
| 14 | GET | `/api/notifications` | — | `200`, notifikasi perubahan status muncul setelah admin update |
| 15 | PATCH | `/api/notifications/<NOTIF_ID>/read` | — | `200` |

`payment_method` yang diterima: `cod` (default), `transfer`, `qris`.

### B4. Negative test user (wajib dicek)

| Percobaan | Expect |
|---|---|
| `GET /api/users` pakai `TOKEN_USER` | `403` |
| `GET /api/dashboard/analytics` pakai `TOKEN_USER` | `403` |
| `POST /api/expenses` pakai `TOKEN_USER` | `403` |
| `PATCH /api/orders/<ORDER_ID>/status` pakai `TOKEN_USER` | `403` |
| `GET /api/orders/<ORDER_ID_ORANG_LAIN>` | `404` |
| `POST /api/payments/<ORDER_ID_ORANG_LAIN>/proof` | `403` |
| `GET /api/payments/<ORDER_ID_ORANG_LAIN>` | `403` |
| `PATCH /api/notifications/<ID_ORANG_LAIN>/read` | `403` |
| Endpoint butuh auth tanpa header Authorization | `401` |
| `POST /api/orders` dengan `quantity` melebihi stok | `400`, stok tidak berubah (transaksi di-rollback) |
| `POST /api/orders` tanpa `items` | `400` (validasi Zod) |
| Kirim file bukan gambar ke `/proof` | `400/500` (multer menolak selain JPG/PNG/WEBP) |

---

## 3. ALUR GABUNGAN END-TO-END (urutan paling realistis)

1. **Setup**: isi `.env` → `npm run dev` (migrasi berjalan otomatis; `npm run db:migrate` opsional)
2. **Admin**: login → buat kategori → buat produk
3. **User**: register → lihat katalog → buat pesanan → upload bukti transfer
4. **Admin**: `GET /api/orders` → lihat pesanan → `PATCH status` → cek bukti di
   `GET /api/payments/<ORDER_ID>` → `PATCH payment_status: paid`
5. **User**: `GET /api/notifications` → status pesanan berubah → tandai sudah dibaca
6. **Admin**: `POST /api/expenses` → `GET /api/dashboard/analytics` → angka laba berubah
7. **Verifikasi silang**: `total_amount` di order = `gross_revenue` di dashboard
   (dengan asumsi tidak ada pesanan berstatus `cancelled`)

---

## 4. Ringkasan endpoint per role

| Group | Publik | Token (user & admin) | Khusus Admin | Khusus User |
|---|---|---|---|---|
| Auth | register, login | POST `/api/auth/logout`, GET/PUT `/api/auth/profile`, PUT `/api/auth/profile/image` | — | — |
| Users | — | — | GET `/`, GET `/:id` | — |
| Categories | GET `/`, GET `/:id` | — | POST `/`, PUT `/:id`, DELETE `/:id` | — |
| Products | GET `/`, GET `/:id` | — | POST `/`, PUT `/:id`, DELETE `/:id` | — |
| Orders | — | GET `/:id` | GET `/`, PATCH `/:id/status` | POST `/`, GET `/my-orders` |
| Payments | — | GET `/:orderId`** | PATCH `/:orderId/status` | POST `/:orderId/proof`* |
| Expenses | — | — | semua endpoint | — |
| Dashboard | — | — | GET `/analytics`, GET `/chart` | — |
| Notifications | — | GET `/`, PATCH `/:id/read` | — | — |

\*) Upload bukti hanya untuk pemilik pesanan: user lain **dan admin** mendapat `403`.
\*\*) Detail pembayaran mengecek kepemilikan pesanan: user lain mendapat `403`. Admin tetap bisa melihat semua pembayaran.

---

## 5. Tabel status code yang diharapkan

| Code | Arti | Contoh |
|---|---|---|
| 200 | OK | GET, PUT, PATCH sukses |
| 201 | Created | register, create category/product/order/expense |
| 400 | Validasi gagal / stok kurang / file tidak valid / transisi status tidak boleh | `completed → pending`, cancel setelah dikirim |
| 401 | Token tidak ada / expired / akun nonaktif / sudah logout / login salah | lupa `Bearer`, token lama setelah logout |
| 403 | Role salah / bukan pemilik data | user akses endpoint admin, order/payment/notifikasi orang lain |
| 404 | Data tidak ada | ID salah |
| 409 | Email duplikat | register email yang sudah ada |
| 429 | Terlalu banyak percobaan | login/register >20 kali, atau endpoint tulis/upload >100 kali per 15 menit |
| 500 | Server / DB / Cloudinary error | FK restrict, kredensial Cloudinary salah |

---

## 6. Catatan penting buat tester

- `payment_status`: `unpaid` → DB `tertunda`, `paid` → `dibayar`, `failed` → `gagal`.
- Status order: `pending` → `tertunda`, `processing` → `diproses`,
  `ready_to_deliver` → `siap`, `delivering` → `dikirim`, `completed` → `selesai`,
  `cancelled` → `dibatalkan`.
- `expenseCategoryToDb`: `raw_material` → `peralatan`, `packaging` → `pengemasan`,
  `fuel` → `bensin`, `utility` → `utilitas`, `other` → `lainnya`.
- `is_available` bisa dikirim sebagai boolean `true` atau string `"true"` / `"1"` — dua-duanya diterima.
- **Keamanan yang sudah diterapkan**:
  - `POST /api/payments/:orderId/proof` dan `GET /api/payments/:orderId` mengecek kepemilikan pesanan.
  - Stok pesanan dikurangi dengan syarat `stok >= jumlah`; kalau stok habis bersamaan, pesanan ditolak `400`.
  - `PATCH /api/notifications/:id/read` hanya bisa untuk notifikasi milik sendiri.
  - `join_room` Socket.io memerlukan token JWT yang valid **dan** status akun masih aktif di database.
  - Akun yang dinonaktifkan (`aktif = false`) tidak bisa login dan tidak bisa memakai token lama.
  - `POST /api/auth/logout` menaikkan `token_version`, sehingga token lama langsung ditolak (`401`).
  - Socket.io diputus saat logout; koneksi akun yang dinonaktifkan juga dibersihkan sebelum emit.
  - CORS HTTP **dan** Socket.io diatur dari `CLIENT_URL` (default `http://localhost:3000` kalau kosong);
    login/register dibatasi 20 percobaan, endpoint tulis/upload 100 permintaan per 15 menit.
  - Error `500` hanya mengembalikan pesan umum; detail tetap ada di log server.
  - Gambar lama di Cloudinary ikut dihapus saat produk/gambar profil diganti atau dihapus, dan saat bukti bayar diganti.
  - SSL database bersifat opt-in: set `db_ssl=true` untuk verifikasi sertifikat; isi `db_ca_cert`
    dengan PATH file CA bila diperlukan. Tanpa itu koneksi memakai mode bawaan yang sedang berjalan.
  - Seeder tidak akan otomatis menjadikan user biasa sebagai admin; server berhenti dengan pesan jelas
    kalau `ADMIN_EMAIL` sudah dipakai akun lain.
- Port server mengikuti `port` (huruf kecil) di `.env` = `6000` (sama seperti `.env.example`).
  Jika API diakses dari browser/web, isi `CLIENT_URL` dengan alamat aplikasi tersebut.
- `PUT /api/auth/profile/image` menerima multipart dengan field **`image`** (JPG/PNG/WEBP, maks 5MB)
  untuk mengganti foto profil; respons berisi `data.image_url`.
- `PATCH /api/orders/:id/status` menolak status yang mundur, status yang sama (tidak ada notifikasi dobel),
  serta pembatalan setelah status `dikirim`/`selesai`. Pembatalan hanya dari `tertunda`/`diproses`/`siap`.
  Saat dibatalkan, stok produk dikembalikan sekali saja (baris pesanan dikunci selama transaksi).
- `dibayar_pada` tidak dihapus saat status pembayaran dikoreksi dari `paid` ke `unpaid`/`failed`.
- `GET /api/dashboard/chart?type=daily` selalu mengembalikan 14 hari terakhir (WIB) berformat `YYYY-MM-DD`;
  hari tanpa transaksi tetap muncul dengan nilai `0`. `type=monthly` selalu 12 bulan terakhir berformat `YYYY-MM`.
- Respons login, `GET /api/auth/profile`, dan `PUT /api/auth/profile` menyertakan `image_url` (foto profil).
- Semua query tanggal memakai timezone WIB (`+07:00`), termasuk label grafik dan filter.
- Notifikasi real-time via Socket.io juga ikut terpicu saat: produk baru dibuat, order baru dibuat,
  status order diubah. Kalau testing lewat HTTP saja, cukup cek endpoint `GET /api/notifications`.
