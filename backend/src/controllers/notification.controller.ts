import type { Request, Response } from "express";
import db from "../database/database";
import { mapNotificationRow } from "../database/mappers";

const NOTIFICATION_SELECT = `
  id,
  pengguna_id AS user_id,
  pesanan_id AS order_id,
  judul AS title,
  pesan AS message,
  jenis AS type,
  peran AS role,
  data,
  dibaca AS is_read,
  dibuat_pada AS created_at
`;

// 1. Ambil Notifikasi Saya
export async function getMyNotifications(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    let sql = "";
    let params: any[] = [];

    if (role === "admin") {
      sql = `SELECT ${NOTIFICATION_SELECT}
             FROM notifikasi
             WHERE peran IN ('admin', 'all')
             ORDER BY id DESC LIMIT 50`;
    } else {
      sql = `SELECT ${NOTIFICATION_SELECT}
             FROM notifikasi
             WHERE pengguna_id = ? OR (pengguna_id IS NULL AND peran IN ('user', 'all'))
             ORDER BY id DESC LIMIT 50`;
      params = [userId];
    }

    const [rows]: any = await db.query(sql, params);

    return res.status(200).json({
      message: "Berhasil mengambil notifikasi.",
      data: rows.map(mapNotificationRow),
    });
  } catch (error) {
    console.error("GetMyNotifications error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat mengambil notifikasi.",
    });
  }
}

// 2. Tandai Notifikasi Sudah Dibaca
export async function markAsRead(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

    await db.execute("UPDATE notifikasi SET dibaca = TRUE WHERE id = ?", [id]);

    return res.status(200).json({
      message: "Notifikasi telah ditandai sudah dibaca.",
    });
  } catch (error) {
    console.error("MarkAsRead error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server.",
    });
  }
}
