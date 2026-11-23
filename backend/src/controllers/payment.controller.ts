import type { Request, Response } from "express";
import db from "../database/database";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary";
import { mapPaymentRow, paymentStatusToDb } from "../database/mappers";
import { notifyUserOrderStatus } from "../sockets/notification.socket";

const PAYMENT_SELECT = `
  id,
  pesanan_id AS order_id,
  metode_pembayaran AS payment_method,
  status_pembayaran AS payment_status,
  jumlah AS amount,
  referensi_transaksi AS reference,
  bukti_url AS proof_url,
  bukti_public_id AS proof_public_id,
  dibayar_pada AS paid_at,
  dibuat_pada AS created_at,
  diperbarui_pada AS updated_at
`;

// 1. Unggah Bukti Pembayaran (User)
export async function uploadPaymentProof(req: Request, res: Response) {
  let uploadedPublicId: string | null = null;

  try {
    const orderId = Number(req.params.orderId);

    if (!req.file) {
      return res.status(400).json({
        message: "File bukti pembayaran wajib diunggah.",
      });
    }

    // Cek pesanan dan pastikan bukti ini milik user yang login
    const [orders]: any = await db.execute(
      `SELECT o.pengguna_id AS user_id, o.status AS order_status,
              p.status_pembayaran AS payment_status
       FROM pesanan o
       LEFT JOIN pembayaran p ON p.pesanan_id = o.id
       WHERE o.id = ? LIMIT 1`,
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        message: "Pesanan tidak ditemukan.",
      });
    }

    if (orders[0].user_id !== req.user!.id) {
      return res.status(403).json({
        message: "Akses ditolak. Bukti pembayaran ini bukan milik Anda.",
      });
    }

    // Bukti yang sudah diverifikasi tidak boleh ditimpa (jejak audit hilang).
    const statusPesanan = orders[0].order_status;
    const statusBayar = orders[0].payment_status;
    if (
      statusBayar === "dibayar" ||
      statusPesanan === "selesai" ||
      statusPesanan === "dibatalkan"
    ) {
      return res.status(400).json({
        message: "Pembayaran sudah diverifikasi atau pesanan sudah selesai/dibatalkan, bukti tidak dapat diubah.",
      });
    }

    // Ambil public_id bukti lama supaya bisa dihapus setelah upload baru
    const [oldProofs]: any = await db.execute(
      "SELECT bukti_public_id FROM pembayaran WHERE pesanan_id = ? LIMIT 1",
      [orderId]
    );
    const oldPublicId = oldProofs.length > 0 ? oldProofs[0].bukti_public_id : null;

    // Upload ke Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer, "dapurkita/payments");
    uploadedPublicId = uploadResult.public_id;

    await db.execute(
      "UPDATE pembayaran SET bukti_url = ?, bukti_public_id = ? WHERE pesanan_id = ?",
      [uploadResult.secure_url, uploadResult.public_id, orderId]
    );
    uploadedPublicId = null;

    if (oldPublicId) {
      try {
        await deleteFromCloudinary(oldPublicId);
      } catch (error) {
        console.warn("Gagal menghapus bukti lama:", error);
      }
    }

    return res.status(200).json({
      message: "Bukti pembayaran berhasil diunggah.",
      data: {
        order_id: orderId,
        proof_url: uploadResult.secure_url,
      },
    });
  } catch (error) {
    if (uploadedPublicId) {
      try {
        await deleteFromCloudinary(uploadedPublicId);
      } catch (cleanupError) {
        console.warn("Gagal membersihkan bukti baru:", cleanupError);
      }
    }
    console.error("UploadPaymentProof error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat mengunggah bukti pembayaran.",
    });
  }
}

// 2. Update Status Pembayaran (Admin)
export async function updatePaymentStatus(req: Request, res: Response) {
  try {
    const orderId = Number(req.params.orderId);
    const { payment_status } = req.body;

    const [payments]: any = await db.execute(
      "SELECT id, dibayar_pada FROM pembayaran WHERE pesanan_id = ? LIMIT 1",
      [orderId]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        message: "Data pembayaran tidak ditemukan.",
      });
    }

    const dbStatus = paymentStatusToDb[payment_status] || payment_status;
    // Simpan waktu bayar pertama; jangan hapus saat status dikoreksi
    const paidAt =
      dbStatus === "dibayar"
        ? payments[0].dibayar_pada || new Date()
        : payments[0].dibayar_pada;

    await db.execute(
      "UPDATE pembayaran SET status_pembayaran = ?, dibayar_pada = ? WHERE pesanan_id = ?",
      [dbStatus, paidAt, orderId]
    );

    // User perlu tahu pembayarannya sudah diverifikasi/ditolak tanpa harus refresh.
    const [orders]: any = await db.execute(
      "SELECT pengguna_id AS user_id, nomor_pesanan AS order_code FROM pesanan WHERE id = ? LIMIT 1",
      [orderId]
    );
    if (orders.length > 0) {
      const labelBayar = dbStatus === "dibayar" ? "terverifikasi" : "ditolak";
      await db.execute(
        `INSERT INTO notifikasi
         (pengguna_id, pesanan_id, judul, pesan, jenis, peran)
         VALUES (?, ?, ?, ?, 'status_pembayaran', 'user')`,
        [
          orders[0].user_id,
          orderId,
          "Status Pembayaran Diperbarui",
          `Pembayaran pesanan ${orders[0].order_code} ${labelBayar}.`,
        ]
      );
      notifyUserOrderStatus(orders[0].user_id, {
        order_code: orders[0].order_code,
        status: `pembayaran ${labelBayar}`,
      });
    }

    return res.status(200).json({
      message: "Status pembayaran berhasil diperbarui.",
      data: {
        order_id: orderId,
        payment_status,
      },
    });
  } catch (error) {
    console.error("UpdatePaymentStatus error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat memperbarui status pembayaran.",
    });
  }
}

// 3. Ambil Detail Pembayaran Berdasarkan Order ID
export async function getPaymentByOrderId(req: Request, res: Response) {
  try {
    const orderId = Number(req.params.orderId);

    // Cek pesanan dan pastikan data pembayaran ini milik user yang login
    const [orders]: any = await db.execute(
      "SELECT pengguna_id AS user_id FROM pesanan WHERE id = ? LIMIT 1",
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        message: "Pesanan tidak ditemukan.",
      });
    }

    if (req.user!.role !== "admin" && orders[0].user_id !== req.user!.id) {
      return res.status(403).json({
        message: "Akses ditolak. Data pembayaran ini bukan milik Anda.",
      });
    }

    const [payments]: any = await db.execute(
      `SELECT ${PAYMENT_SELECT} FROM pembayaran WHERE pesanan_id = ? LIMIT 1`,
      [orderId]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        message: "Data pembayaran tidak ditemukan.",
      });
    }

    return res.status(200).json({
      message: "Berhasil mengambil data pembayaran.",
      data: mapPaymentRow(payments[0]),
    });
  } catch (error) {
    console.error("GetPaymentByOrderId error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server.",
    });
  }
}
