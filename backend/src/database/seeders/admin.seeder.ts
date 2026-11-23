import bcrypt from "bcrypt";
import db from "../database";

// Fungsi seeder untuk membuat akun admin DapurKita secara otomatis
export async function seedAdmin() {
  const email = process.env.admin_email || process.env.ADMIN_EMAIL || "admin@dapurkita.com";
  const password = process.env.admin_password || process.env.ADMIN_PASSWORD || "AdminDapurKita2026!";
  const name = process.env.admin_name || process.env.ADMIN_NAME || "Super Admin DapurKita";

  try {
    const [rows]: any = await db.execute(
      "SELECT id FROM pengguna WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length > 0) {
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
      `INSERT INTO pengguna (nama_pengguna, email, kata_sandi, peran, aktif)
       VALUES (?, ?, ?, 'admin', TRUE)`,
      [name, email, hashedPassword]
    );

    console.log(`Akun admin DapurKita berhasil dibuat: ${email}`);
  } catch (error) {
    console.error("Gagal menjalankan seed admin:", error);
    throw error;
  }
}
