import bcrypt from "bcrypt";
import db from "../database";

// Fungsi seeder untuk membuat akun admin DapurKita secara otomatis
export async function seedAdmin() {
  const email = process.env.admin_email || process.env.ADMIN_EMAIL || "admin@dapurkita.com";
  const password = process.env.admin_password || process.env.ADMIN_PASSWORD;
  const name = process.env.admin_name || process.env.ADMIN_NAME || "Super Admin DapurKita";

  try {
    const [rows]: any = await db.execute(
      "SELECT id, peran, aktif FROM pengguna WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length > 0) {
      // Jangan otomatis mempromosikan user biasa menjadi admin.
      // Kalau email admin sudah dipakai pihak lain, hentikan server dengan pesan jelas.
      if (rows[0].peran === "admin" && rows[0].aktif) {
        return;
      }

      // Jangan menghentikan seluruh server hanya karena email admin bentrok.
      // Aplikasi tetap berjalan; admin perlu diperbaiki manual dari database.
      console.warn(
        "Seeder admin dilewati: email ADMIN_EMAIL sudah dipakai akun non-admin/nonaktif."
      );
      return;
    }

    if (!password) {
      throw new Error("ADMIN_PASSWORD wajib diisi di file .env.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
      `INSERT INTO pengguna (nama_pengguna, email, kata_sandi, peran, aktif)
       VALUES (?, ?, ?, 'admin', TRUE)`,
      [name, email, hashedPassword]
    );

    console.log("Akun admin DapurKita berhasil dibuat.");
  } catch (error) {
    console.error("Gagal menjalankan seed admin:", error);
    throw error;
  }
}
