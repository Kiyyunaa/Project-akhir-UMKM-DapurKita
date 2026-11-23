import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import db from "../database/database";
import { generateToken } from "../config/jwt";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary";
import { mapUserRow, roleToDb } from "../database/mappers";
import { disconnectUserSockets } from "../sockets/notification.socket";

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
  const connection = await db.getConnection();

  try {
    const { name, email, password, phone, address } = req.body;

    await connection.beginTransaction();

    // Cek apakah email sudah terdaftar
    const [existing]: any = await connection.execute(
      "SELECT id FROM pengguna WHERE email = ? LIMIT 1",
      [email]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        message: "Email sudah terdaftar. Silakan gunakan email lain.",
      });
    }

    // Hash kata sandi
    const hashedPassword = await bcrypt.hash(password, 10);

    // Simpan user ke tabel pengguna
    const [result]: any = await connection.execute(
      `INSERT INTO pengguna (nama_pengguna, email, kata_sandi, telepon, peran, aktif)
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      [name, email, hashedPassword, phone || null, roleToDb("user")]
    );

    const userId = result.insertId;

    // Simpan alamat utama bila dikirim
    if (address) {
      await connection.execute(
        `INSERT INTO alamat (pengguna_id, nama_penerima, telepon, detail_alamat, utama)
         VALUES (?, ?, ?, ?, TRUE)`,
        [userId, name, phone || "", address]
      );
    }

    await connection.commit();

    // Buat token JWT
    const token = generateToken({
      id: userId,
      role: "user",
      name,
      email,
      token_version: 0,
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
        image_url: null,
      },
      token,
    });
  } catch (error: any) {
    await connection.rollback();

    // Kalau dua registrasi bersamaan, UNIQUE index MySQL yang menolak.
    // Tetap kembalikan 409, bukan 500.
    if (error && error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Email sudah terdaftar. Silakan gunakan email lain.",
      });
    }

    console.error("Register error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat registrasi.",
    });
  } finally {
    connection.release();
  }
}

// 2. Login Akun (User & Admin)
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Cari user berdasarkan email
    const [users]: any = await db.execute(
      `SELECT id, nama_pengguna AS name, email, kata_sandi AS password,
              peran, telepon AS phone, aktif, gambar_url AS image_url, token_version
       FROM pengguna WHERE email = ? LIMIT 1`,
      [email]
    );

    const userRow = users[0];

    // Cek dulu user-nya ada. Kalau tidak ada, jangan panggil bcrypt.compare
    // (hash kosong membuat bcrypt error dan respons jadi 500).
    if (
      !userRow ||
      !(await bcrypt.compare(password, userRow.password)) ||
      !userRow.aktif
    ) {
      return res.status(401).json({
        message: "Email atau kata sandi tidak valid.",
      });
    }

    const user = mapUserRow(userRow);

    const address = await getPrimaryAddress(user.id);

    // Buat token JWT
    const token = generateToken({
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      token_version: userRow.token_version ?? 0,
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
        image_url: userRow.image_url || null,
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

// Logout: naikkan token_version supaya token lama tidak bisa dipakai lagi
export async function logout(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    await db.execute(
      "UPDATE pengguna SET token_version = token_version + 1 WHERE id = ?",
      [userId]
    );

    disconnectUserSockets(userId);

    return res.status(200).json({
      message: "Logout berhasil. Token tidak berlaku lagi.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat logout.",
    });
  }
}

// 3. Mengambil Profil Pengguna yang Sedang Login
export async function getProfile(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    const [users]: any = await db.execute(
      `SELECT p.id, p.nama_pengguna AS name, p.email, p.telepon AS phone,
              p.peran, p.dibuat_pada AS created_at, p.gambar_url AS image_url,
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

    const namaBaru = name || null;
    const teleponDikirim = phone !== undefined;
    const alamatDikirim = address !== undefined;

    // String kosong berarti user sengaja menghapus data, bukan "tidak diubah".
    const teleponBaru = teleponDikirim ? phone || null : null;
    const alamatBaru = alamatDikirim ? address || "" : "";

    await db.execute(
      `UPDATE pengguna SET
         nama_pengguna = COALESCE(?, nama_pengguna),
         telepon = ${teleponDikirim ? "?" : "telepon"}
       WHERE id = ?`,
      [namaBaru, ...(teleponDikirim ? [teleponBaru] : []), userId]
    );

    // Cek keberadaan alamat dengan SELECT. affectedRows dari mysql2 menghitung
    // baris yang berubah, bukan baris yang cocok, sehingga tidak bisa dipakai.
    if (alamatDikirim) {
      const [alamatUtama]: any = await db.execute(
        "SELECT id FROM alamat WHERE pengguna_id = ? AND utama = TRUE ORDER BY id LIMIT 1",
        [userId]
      );

      if (alamatUtama.length > 0) {
        await db.execute(
          `UPDATE alamat SET
             detail_alamat = ?,
             nama_penerima = COALESCE(?, nama_penerima),
             telepon = ${teleponDikirim ? "?" : "telepon"}
           WHERE id = ?`,
          [
            alamatBaru,
            namaBaru,
            ...(teleponDikirim ? [teleponBaru] : []),
            alamatUtama[0].id,
          ]
        );
      } else {
        await db.execute(
          `INSERT INTO alamat (pengguna_id, nama_penerima, telepon, detail_alamat, utama)
           VALUES (?, ?, ?, ?, TRUE)`,
          [userId, namaBaru || "Pengguna", teleponBaru || "", alamatBaru]
        );
      }
    }

    const [users]: any = await db.execute(
      `SELECT p.id, p.nama_pengguna AS name, p.email, p.telepon AS phone, p.peran,
              p.dibuat_pada AS created_at, p.gambar_url AS image_url,
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

// 5. Update Foto Profil (User & Admin) + Upload ke Cloudinary
export async function updateProfileImage(req: Request, res: Response) {
  let uploadedPublicId: string | null = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "File gambar wajib diunggah.",
      });
    }

    const userId = req.user!.id;

    const [users]: any = await db.execute(
      "SELECT gambar_public_id FROM pengguna WHERE id = ? LIMIT 1",
      [userId]
    );
    const oldPublicId = users.length > 0 ? users[0].gambar_public_id : null;

    const uploadResult = await uploadToCloudinary(req.file.buffer, "dapurkita/profiles");
    uploadedPublicId = uploadResult.public_id;

    await db.execute(
      "UPDATE pengguna SET gambar_url = ?, gambar_public_id = ? WHERE id = ?",
      [uploadResult.secure_url, uploadResult.public_id, userId]
    );
    uploadedPublicId = null;

    if (oldPublicId) {
      try {
        await deleteFromCloudinary(oldPublicId);
      } catch (error) {
        console.warn("Gagal menghapus foto profil lama:", error);
      }
    }

    return res.status(200).json({
      message: "Foto profil berhasil diperbarui.",
      data: { image_url: uploadResult.secure_url },
    });
  } catch (error) {
    // Kalau database gagal setelah upload, hapus file baru supaya tidak yatim
    if (uploadedPublicId) {
      try {
        await deleteFromCloudinary(uploadedPublicId);
      } catch (cleanupError) {
        console.warn("Gagal membersihkan foto profil baru:", cleanupError);
      }
    }
    console.error("UpdateProfileImage error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat mengunggah foto profil.",
    });
  }
}
