import type { Request, Response } from "express";
import db from "../database/database";
import { mapUserRow } from "../database/mappers";

const USER_SELECT = `
  p.id,
  p.nama_pengguna AS name,
  p.email,
  p.telepon AS phone,
  a.detail_alamat AS address,
  p.peran,
  p.dibuat_pada AS created_at
`;

// Mengambil seluruh daftar pengguna (Khusus Admin)
export async function getAllUsers(_req: Request, res: Response) {
  try {
    const [rows]: any = await db.execute(
      `SELECT ${USER_SELECT}
       FROM pengguna p
       LEFT JOIN alamat a ON a.pengguna_id = p.id AND a.utama = TRUE
       ORDER BY p.id DESC`
    );

    return res.status(200).json({
      message: "Berhasil mengambil data pengguna.",
      data: rows.map(mapUserRow),
    });
  } catch (error) {
    console.error("GetAllUsers error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengambil data pengguna.",
    });
  }
}

// Mengambil detail pengguna berdasarkan ID (Khusus Admin)
export async function getUserById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

    const [rows]: any = await db.execute(
      `SELECT ${USER_SELECT}
       FROM pengguna p
       LEFT JOIN alamat a ON a.pengguna_id = p.id AND a.utama = TRUE
       WHERE p.id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Pengguna tidak ditemukan.",
      });
    }

    return res.status(200).json({
      message: "Berhasil mengambil detail pengguna.",
      data: mapUserRow(rows[0]),
    });
  } catch (error) {
    console.error("GetUserById error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server.",
    });
  }
}
