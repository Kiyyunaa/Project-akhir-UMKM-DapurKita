import type { Request, Response } from "express";
import db from "../database/database";
import { uploadToCloudinary } from "../config/cloudinary";
import { mapPaymentRow, paymentStatusToDb } from "../database/mappers";

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
  try {
    const orderId = Number(req.params.orderId);

    if (!req.file) {
      return res.status(400).json({
        message: "File bukti pembayaran wajib diunggah.",
      });
    }

    // Upload ke Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer, "dapurkita/payments");

    await db.execute(
      "UPDATE pembayaran SET bukti_url = ?, bukti_public_id = ? WHERE pesanan_id = ?",
      [uploadResult.secure_url, uploadResult.public_id, orderId]
    );

    return res.status(200).json({
      message: "Bukti pembayaran berhasil diunggah.",
      data: {
        order_id: orderId,
        proof_url: uploadResult.secure_url,
      },
    });
  } catch (error) {
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

    const dbStatus = paymentStatusToDb[payment_status] || payment_status;
    const paidAt = dbStatus === "dibayar" ? new Date() : null;

    await db.execute(
      "UPDATE pembayaran SET status_pembayaran = ?, dibayar_pada = ? WHERE pesanan_id = ?",
      [dbStatus, paidAt, orderId]
    );

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
