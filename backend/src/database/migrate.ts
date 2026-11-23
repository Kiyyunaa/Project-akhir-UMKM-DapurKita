import bcrypt from "bcrypt";
import db from "./database";

// Schema mengikuti database `db_DapurKita` yang dipakai di Aiven.
// Semua statement bersifat idempoten sehingga aman dijalankan berulang kali.
const schemaStatements: string[] = [
  `CREATE TABLE IF NOT EXISTS pengguna (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_pengguna VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    kata_sandi VARCHAR(255) NOT NULL,
    telepon VARCHAR(20),
    peran ENUM('admin', 'pengguna') NOT NULL DEFAULT 'pengguna',
    gambar_url VARCHAR(255),
    gambar_public_id VARCHAR(150),
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_peran (peran)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS kategori (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    gambar_url VARCHAR(255),
    gambar_public_id VARCHAR(150),
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS produk (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kategori_id INT NOT NULL,
    nama VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    harga_modal DECIMAL(12, 2) NOT NULL,
    harga_jual DECIMAL(12, 2) NOT NULL,
    stok INT NOT NULL DEFAULT 0,
    gambar_url VARCHAR(255),
    gambar_public_id VARCHAR(150),
    tersedia BOOLEAN DEFAULT TRUE,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (kategori_id) REFERENCES kategori(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_kategori (kategori_id),
    INDEX idx_tersedia (tersedia)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS alamat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pengguna_id INT NOT NULL,
    nama_penerima VARCHAR(100) NOT NULL,
    telepon VARCHAR(20) NOT NULL,
    detail_alamat TEXT NOT NULL,
    provinsi VARCHAR(100),
    kota VARCHAR(100),
    kecamatan VARCHAR(100),
    kode_pos VARCHAR(10),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    utama BOOLEAN NOT NULL DEFAULT FALSE,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pengguna_id) REFERENCES pengguna(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_pengguna_alamat (pengguna_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS pesanan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pengguna_id INT NOT NULL,
    alamat_id INT,
    nomor_pesanan VARCHAR(50) NOT NULL UNIQUE,
    nama_penerima VARCHAR(100) NOT NULL,
    telepon_penerima VARCHAR(20) NOT NULL,
    alamat_pengiriman TEXT NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    biaya_pengiriman DECIMAL(12, 2) NOT NULL DEFAULT 0,
    diskon DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_jumlah DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status ENUM('tertunda', 'dikonfirmasi', 'diproses', 'siap', 'dikirim', 'selesai', 'dibatalkan')
      NOT NULL DEFAULT 'tertunda',
    catatan TEXT,
    selesai_pada DATETIME,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pengguna_id) REFERENCES pengguna(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (alamat_id) REFERENCES alamat(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_nomor_pesanan (nomor_pesanan),
    INDEX idx_status (status),
    INDEX idx_pengguna_pesanan (pengguna_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS item_pesanan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pesanan_id INT NOT NULL,
    produk_id INT,
    nama_produk VARCHAR(100) NOT NULL,
    harga_modal DECIMAL(12, 2) NOT NULL,
    harga_jual DECIMAL(12, 2) NOT NULL,
    kuantitas INT NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pesanan_id) REFERENCES pesanan(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (produk_id) REFERENCES produk(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_pesanan_item (pesanan_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS pembayaran (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pesanan_id INT NOT NULL UNIQUE,
    metode_pembayaran ENUM('tunai', 'transfer_bank', 'dompet_digital', 'qris') NOT NULL,
    status_pembayaran ENUM('tertunda', 'dibayar', 'gagal', 'dikembalikan')
      NOT NULL DEFAULT 'tertunda',
    jumlah DECIMAL(12, 2) NOT NULL,
    referensi_transaksi VARCHAR(150),
    bukti_url TEXT NULL,
    bukti_public_id VARCHAR(150) NULL,
    dibayar_pada DATETIME,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pesanan_id) REFERENCES pesanan(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_status_pembayaran (status_pembayaran)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS pengeluaran (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pengguna_id INT NOT NULL,
    judul VARCHAR(150) NOT NULL,
    kategori_pengeluaran ENUM('bensin', 'pengemasan', 'pengiriman', 'utilitas', 'peralatan', 'lainnya')
      NOT NULL DEFAULT 'lainnya',
    jumlah DECIMAL(12, 2) NOT NULL,
    deskripsi TEXT,
    tanggal_pengeluaran DATE NOT NULL,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pengguna_id) REFERENCES pengguna(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_tanggal (tanggal_pengeluaran)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS notifikasi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pengguna_id INT NOT NULL,
    pesanan_id INT,
    judul VARCHAR(150) NOT NULL,
    pesan TEXT NOT NULL,
    jenis ENUM('pesanan_baru', 'status_pesanan', 'produk', 'pembayaran', 'umum')
      NOT NULL DEFAULT 'umum',
    peran ENUM('user', 'admin', 'all') NOT NULL DEFAULT 'all',
    data JSON NULL,
    dibaca BOOLEAN NOT NULL DEFAULT FALSE,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pengguna_id) REFERENCES pengguna(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (pesanan_id) REFERENCES pesanan(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_pengguna_dibaca (pengguna_id, dibaca)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

// Kolom tambahan yang dibutuhkan API bila tabel sudah dibuat sebelumnya
// (MySQL tidak mendukung ADD COLUMN IF NOT EXISTS, jadi dicek dulu).
const additionalColumns: Array<{ table: string; column: string; definition: string }> = [
  { table: "pembayaran", column: "bukti_url", definition: "TEXT NULL" },
  { table: "pembayaran", column: "bukti_public_id", definition: "VARCHAR(150) NULL" },
  {
    table: "notifikasi",
    column: "peran",
    definition: "ENUM('user', 'admin', 'all') NOT NULL DEFAULT 'all'",
  },
  { table: "notifikasi", column: "data", definition: "JSON NULL" },
];

async function ensureColumn(table: string, column: string, definition: string): Promise<void> {
  const [rows]: any = await db.execute(
    `SELECT COUNT(*) AS total FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );

  if (rows[0].total === 0) {
    // db.query (bukan execute) dipakai karena `??` butuh escaping identifier,
    // sedangkan prepared statement tidak bisa mengganti nama tabel/kolom.
    await db.query(`ALTER TABLE ?? ADD COLUMN ?? ${definition}`, [table, column]);
    console.log(`Kolom ${table}.${column} ditambahkan.`);
  }
}

// Data contoh awal memakai password plaintext. Ubah ke bcrypt sekali saja
// supaya login melalui API bisa memakai bcrypt.compare.
async function hashPlainTextPasswords(): Promise<void> {
  const [rows]: any = await db.execute(
    `SELECT id, kata_sandi FROM pengguna
     WHERE kata_sandi IS NOT NULL
       AND kata_sandi NOT LIKE '$2a$%'
       AND kata_sandi NOT LIKE '$2b$%'
       AND kata_sandi NOT LIKE '$2y$%'`
  );

  for (const row of rows) {
    const hashed = await bcrypt.hash(row.kata_sandi, 10);
    await db.execute("UPDATE pengguna SET kata_sandi = ? WHERE id = ?", [hashed, row.id]);
  }

  if (rows.length > 0) {
    console.log(`${rows.length} kata sandi plaintext berhasil diubah ke bcrypt.`);
  }
}

// Dipanggil saat server start sebelum seeder.
export async function initializeDatabase(): Promise<void> {
  for (const statement of schemaStatements) {
    await db.execute(statement);
  }

  for (const column of additionalColumns) {
    await ensureColumn(column.table, column.column, column.definition);
  }

  await hashPlainTextPasswords();
}

// Mendukung menjalankan langsung: npx tsx src/database/migrate.ts
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log("Inisialisasi skema database berhasil.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Gagal inisialisasi skema database:", error);
      process.exit(1);
    });
}
