# Panduan Testing API DapurKita — 2 Role (Admin & Pengguna)

Panduan ini dibuat khusus untuk project DapurKita, berdasarkan route yang ada di `src/routes/`,
validasi Zod di `src/validations/`, dan perilaku controller di `src/controllers/`.

---

## 0. Persiapan (wajib sebelum testing)

```powershell
cd C:\DapurKita
npm run db:migrate     # bikin / ensure tabel — PENTING
npm run dev            # jalan di http://localhost:6000
```

> **Kenapa `db:migrate` wajib manual?** Di `src/server.ts`, `initializeDatabase()` di-import tapi
> **tidak dipanggil**. Yang dipanggil saat start hanya `seedAdmin()`. Kalau tabel belum ada,
> seeder akan error. Jalankan `npm run db:migrate` dulu.

**Informasi server**
- Base URL: `http://localhost:6000` (dari `.env`: `port=6000`; default `5000` kalau env kosong)
- Format response: `{ "message": "...", "data": ... }`
- Request validation gagal: `400` + `{ message: "Validasi data gagal.", errors: [{ field, message }] }`

**Kredensial default admin** (karena `ADMIN_EMAIL` / `ADMIN_PASSWORD` tidak ada di `.env`):

| Field | Nilai |
|---|---|
| Email | `admin@dapurkita.com` |
| Password | `AdminDapurKita2026!` |

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
  -d '{"email":"admin@dapurkita.com","password":"AdminDapurKita2026!"}'

# Pakai token (ganti <TOKEN> dengan token hasil login)
curl.exe -X GET http://localhost:6000/api/auth/profile `
  -H "Authorization: Bearer <TOKEN>"
```

---

## 1. ALUR ROLE ADMIN

### A1. Login & cek identitas

| # | Method | Endpoint | Body | Expect |
|---|---|---|---|---|
| 1 | POST | `/api/auth/login` | `{"email":"admin@dapurkita.com","password":"AdminDapurKita2026!"}` | `200`, simpan `token` → `TOKEN_ADMIN` |
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
| Endpoint butuh auth tanpa header Authorization | `401` |
| `POST /api/orders` dengan `quantity` melebihi stok | `400`, stok tidak berubah (transaksi di-rollback) |
| `POST /api/orders` tanpa `items` | `400` (validasi Zod) |
| Kirim file bukan gambar ke `/proof` | `400/500` (multer menolak selain JPG/PNG/WEBP) |

---

## 3. ALUR GABUNGAN END-TO-END (urutan paling realistis)

1. **Setup**: `npm run db:migrate` → `npm run dev`
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
| Auth | register, login | GET/PUT `/api/auth/profile` | — | — |
| Users | — | — | GET `/`, GET `/:id` | — |
| Categories | GET `/`, GET `/:id` | — | POST `/`, PUT `/:id`, DELETE `/:id` | — |
| Products | GET `/`, GET `/:id` | — | POST `/`, PUT `/:id`, DELETE `/:id` | — |
| Orders | — | GET `/:id` | GET `/`, PATCH `/:id/status` | POST `/`, GET `/my-orders` |
| Payments | — | GET `/:orderId` | PATCH `/:orderId/status` | POST `/:orderId/proof`* |
| Expenses | — | — | semua endpoint | — |
| Dashboard | — | — | GET `/analytics`, GET `/chart` | — |
| Notifications | — | GET `/`, PATCH `/:id/read` | — | — |

\*) Route upload bukti tidak memakai `userMiddleware`, jadi secara teknis akun dengan token apa pun bisa memanggilnya.

---

## 5. Tabel status code yang diharapkan

| Code | Arti | Contoh |
|---|---|---|
| 200 | OK | GET, PUT, PATCH sukses |
| 201 | Created | register, create category/product/order/expense |
| 400 | Validasi gagal / stok kurang | body tidak sesuai Zod |
| 401 | Token tidak ada / expired | lupa `Bearer` |
| 403 | Role salah | user akses endpoint admin |
| 404 | Data tidak ada / bukan milik user | ID salah |
| 409 | Email duplikat | register email yang sudah ada |
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
- **Celah akses yang bisa jadi temuan bug**:
  - `POST /api/payments/:orderId/proof` tidak mengecek role/ownership.
  - `GET /api/payments/:orderId` tidak mengecek ownership.
  - `PATCH /api/notifications/:id/read` tidak mengecek ownership.
  Artinya user bisa mengakses/mengubah data orang lain kalau tahu ID-nya.
- Port server mengikuti `port` (huruf kecil) di `.env` = `6000`; `.env.example` memakai `PORT`
  uppercase dan itu juga didukung oleh kode.
- Notifikasi real-time via Socket.io juga ikut terpicu saat: produk baru dibuat, order baru dibuat,
  status order diubah. Kalau testing lewat HTTP saja, cukup cek endpoint `GET /api/notifications`.
