import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import db from "../database/database";
import { generateToken } from "../config/jwt";
import { mapUserRow, roleToDb } from "../database/mappers";

// Ambil alamat utama pengguna (schema menyimpan alamat di tabel terpisah)
async function getPrimaryAddress(userId: number): Promise<string | null> {
  const [rows]: any = await db.execute(
    "SELECT detail_alamat AS address FROM alamat WHERE pengguna_id = ? AND utama = TRUE LIMIT 1",
    [userId]
  );
  return rows[0]?.address ?? null;
}

// 1. Registrasi Akun Pengguna Baru (Role otomatis 'user')
export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, phone, address } = req.body;

    // Cek apakah email sudah terdaftar
    const [existing]: any = await db.execute(
      "SELECT id FROM pengguna WHERE email = ? LIMIT 1",
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "Email sudah terdaftar. Silakan gunakan email lain.",
      });
    }

    // Hash kata sandi
    const hashedPassword = await bcrypt.hash(password, 10);

    // Simpan user ke tabel pengguna
    const [result]: any = await db.execute(
      `INSERT INTO pengguna (nama_pengguna, email, kata_sandi, telepon, peran, aktif)
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      [name, email, hashedPassword, phone || null, roleToDb("user")]
    );

    const userId = result.insertId;

    // Simpan alamat utama bila dikirim
    if (address) {
      await db.execute(
        `INSERT INTO alamat (pengguna_id, nama_penerima, telepon, detail_alamat, utama)
         VALUES (?, ?, ?, ?, TRUE)`,
        [userId, name, phone || "", address]
      );
    }

    // Buat token JWT
    const token = generateToken({
      id: userId,
      role: "user",
      name,
      email,
    });

    return res.status(201).json({
      message: "Registrasi berhasil.",
      data: {
        id: userId,
        name,
        email,
        phone,
        address: address || null,
        role: "user",
      },
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat registrasi.",
    });
  }
}

// 2. Login Akun (User & Admin)
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Cari user berdasarkan email
    const [users]: any = await db.execute(
      `SELECT id, nama_pengguna AS name, email, kata_sandi AS password,
              peran, telepon AS phone
       FROM pengguna WHERE email = ? LIMIT 1`,
      [email]
    );

    const user = mapUserRow(users[0] || {});

    // Jika user tidak ditemukan atau password salah
    if (!user.id || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Email atau kata sandi tidak valid.",
      });
    }

    const address = await getPrimaryAddress(user.id);

    // Buat token JWT
    const token = generateToken({
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    });

    return res.status(200).json({
      message: "Login berhasil.",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat login.",
    });
  }
}

// 3. Mengambil Profil Pengguna yang Sedang Login
export async function getProfile(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    const [users]: any = await db.execute(
      `SELECT p.id, p.nama_pengguna AS name, p.email, p.telepon AS phone,
              p.peran, p.dibuat_pada AS created_at,
              a.detail_alamat AS address
       FROM pengguna p
       LEFT JOIN alamat a ON a.pengguna_id = p.id AND a.utama = TRUE
       WHERE p.id = ? LIMIT 1`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "Pengguna tidak ditemukan.",
      });
    }

    return res.status(200).json({
      message: "Berhasil mengambil profil.",
      data: mapUserRow(users[0]),
    });
  } catch (error) {
    console.error("GetProfile error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server.",
    });
  }
}

// 4. Update Profil Pengguna
export async function updateProfile(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { name, phone, address } = req.body;

    await db.execute(
      `UPDATE pengguna SET
         nama_pengguna = COALESCE(?, nama_pengguna),
         telepon = COALESCE(?, telepon)
       WHERE id = ?`,
      [name || null, phone || null, userId]
    );

    // Alamat ada di tabel terpisah: update bila sudah ada, jika tidak buat baru
    if (address) {
      const [updated]: any = await db.execute(
        `UPDATE alamat SET
           detail_alamat = ?,
           nama_penerima = COALESCE(?, nama_penerima),
           telepon = COALESCE(?, telepon)
         WHERE pengguna_id = ? AND utama = TRUE`,
        [address, name || null, phone || null, userId]
      );

      if (updated.affectedRows === 0) {
        await db.execute(
          `INSERT INTO alamat (pengguna_id, nama_penerima, telepon, detail_alamat, utama)
           VALUES (?, ?, ?, ?, TRUE)`,
          [userId, name || "Pengguna", phone || "", address]
        );
      }
    }

    const [users]: any = await db.execute(
      `SELECT p.id, p.nama_pengguna AS name, p.email, p.telepon AS phone, p.peran,
              a.detail_alamat AS address
       FROM pengguna p
       LEFT JOIN alamat a ON a.pengguna_id = p.id AND a.utama = TRUE
       WHERE p.id = ? LIMIT 1`,
      [userId]
    );

    return res.status(200).json({
      message: "Profil berhasil diperbarui.",
      data: mapUserRow(users[0] || {}),
    });
  } catch (error) {
    console.error("UpdateProfile error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat memperbarui profil.",
    });
  }
}
