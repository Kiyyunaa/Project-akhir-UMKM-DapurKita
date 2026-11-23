import type { Request, Response } from "express";
import crypto from "crypto";
import db from "../database/database";
import { notifyAdminNewOrder, notifyUserOrderStatus } from "../sockets/notification.socket";
import {
  mapOrderRow,
  orderStatusToDb,
  paymentMethodToDb,
} from "../database/mappers";

const ORDER_SELECT = `
  o.id,
  o.nomor_pesanan AS order_code,
  o.pengguna_id AS user_id,
  o.total_jumlah AS total_amount,
  COALESCE((
    SELECT SUM(ii.harga_modal * ii.kuantitas)
    FROM item_pesanan ii WHERE ii.pesanan_id = o.id
  ), 0) AS total_capital,
  o.status,
  o.alamat_pengiriman AS delivery_address,
  o.catatan AS notes,
  o.dibuat_pada AS created_at,
  o.diperbarui_pada AS updated_at,
  p.metode_pembayaran AS payment_method,
  p.status_pembayaran AS payment_status,
  p.bukti_url AS proof_url
`;

// 1. Membuat Pesanan Baru (User) + Snapshot Modal & Harga Jual + Real-time Socket
export async function createOrder(req: Request, res: Response) {
  const connection = await db.getConnection();

  try {
    const userId = req.user!.id;
    const { items, delivery_address, notes, payment_method, recipient_name, recipient_phone } =
      req.body;

    await connection.beginTransaction();

    // Ambil nama & telepon pemesan (dipakai untuk kolom wajib di tabel pesanan)
    const [users]: any = await connection.execute(
      "SELECT nama_pengguna AS name, telepon AS phone FROM pengguna WHERE id = ? LIMIT 1",
      [userId]
    );
    // Nama/telepon penerima bisa diisi di form checkout. Kalau kosong, pakai data akun.
    const userName =
      typeof recipient_name === "string" && recipient_name.trim().length >= 2
        ? recipient_name.trim()
        : users[0]?.name || "Pelanggan";
    const userPhone =
      typeof recipient_phone === "string" && recipient_phone.trim().length >= 8
        ? recipient_phone.trim()
        : users[0]?.phone || "-";

    // Hubungkan pesanan ke alamat utama user bila tersedia.
    const [addresses]: any = await connection.execute(
      "SELECT id FROM alamat WHERE pengguna_id = ? AND utama = TRUE ORDER BY id LIMIT 1",
      [userId]
    );
    const alamatId = addresses[0]?.id || null;

    let totalAmount = 0;
    let totalCapital = 0;
    const itemsData: Array<{
      productId: number;
      productName: string;
      quantity: number;
      capitalPrice: number;
      sellingPrice: number;
      subtotalAmount: number;
      subtotalCapital: number;
    }> = [];

    // Validasi stok & simpan snapshot harga modal (harga_modal) dan jual (harga_jual)
    for (const item of items) {
      const [products]: any = await connection.execute(
        `SELECT id, nama AS name, harga_modal AS capital_price,
                harga_jual AS selling_price, stok AS stock, tersedia AS is_available
         FROM produk WHERE id = ? LIMIT 1`,
        [item.product_id]
      );

      if (products.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          message: `Produk dengan ID ${item.product_id} tidak ditemukan.`,
        });
      }

      const product = products[0];

      if (!product.is_available) {
        await connection.rollback();
        return res.status(400).json({
          message: `Produk ${product.name} saat ini sedang tidak tersedia.`,
        });
      }

      if (product.stock < item.quantity) {
        await connection.rollback();
        return res.status(400).json({
          message: `Stok produk ${product.name} tidak mencukupi (sisa: ${product.stock}).`,
        });
      }

      const capitalPrice = Number(product.capital_price);
      const sellingPrice = Number(product.selling_price);
      const subtotalAmount = sellingPrice * item.quantity;
      const subtotalCapital = capitalPrice * item.quantity;

      totalAmount += subtotalAmount;
      totalCapital += subtotalCapital;

      itemsData.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        capitalPrice,
        sellingPrice,
        subtotalAmount,
        subtotalCapital,
      });

      // Kurangi stok produk. Pakai syarat stok >= jumlah agar aman
      // kalau dua user memesan produk yang sama bersamaan.
      const [stockUpdate]: any = await connection.execute(
        "UPDATE produk SET stok = stok - ? WHERE id = ? AND stok >= ?",
        [item.quantity, product.id, item.quantity]
      );

      if (stockUpdate.affectedRows === 0) {
        await connection.rollback();
        return res.status(400).json({
          message: `Stok produk ${product.name} tidak mencukupi. Silakan kurangi jumlah pesanan.`,
        });
      }
    }

    // Generate kode pesanan sederhana langsung di controller
    const orderCode = `ORD-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    // Simpan ke tabel pesanan
    const [orderResult]: any = await connection.execute(
      `INSERT INTO pesanan
       (nomor_pesanan, pengguna_id, alamat_id, nama_penerima, telepon_penerima,
        subtotal, total_jumlah, status, alamat_pengiriman, catatan)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'tertunda', ?, ?)`,
      [
        orderCode,
        userId,
        alamatId,
        userName,
        userPhone,
        totalAmount,
        totalAmount,
        delivery_address,
        notes || null,
      ]
    );

    const orderId = orderResult.insertId;

    // Simpan item pesanan beserta snapshot modal & jual
    for (const it of itemsData) {
      await connection.execute(
        `INSERT INTO item_pesanan
         (pesanan_id, produk_id, nama_produk, harga_modal, harga_jual, kuantitas, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          it.productId,
          it.productName,
          it.capitalPrice,
          it.sellingPrice,
          it.quantity,
          it.subtotalAmount,
        ]
      );
    }

    // Inisialisasi data pembayaran
    const dbPaymentMethod = paymentMethodToDb[payment_method || "cod"] || "tunai";
    await connection.execute(
      `INSERT INTO pembayaran (pesanan_id, metode_pembayaran, status_pembayaran, jumlah)
       VALUES (?, ?, 'tertunda', ?)`,
      [orderId, dbPaymentMethod, totalAmount]
    );

    // Notifikasi internal untuk admin
    const [admins]: any = await connection.execute(
      "SELECT id FROM pengguna WHERE peran = 'admin'"
    );
    for (const admin of admins) {
      await connection.execute(
        `INSERT INTO notifikasi
         (pengguna_id, pesanan_id, judul, pesan, jenis, peran)
         VALUES (?, ?, ?, ?, 'pesanan_baru', 'admin')`,
        [
          admin.id,
          orderId,
          "Pesanan Baru Masuk!",
          `Pesanan ${orderCode} dari ${userName} menunggu diproses.`,
        ]
      );
    }

    await connection.commit();

    // Kirim notifikasi Socket.io ke Admin
    notifyAdminNewOrder({
      order_code: orderCode,
      user_name: userName,
      total_amount: totalAmount,
    });

    return res.status(201).json({
      message: "Pesanan berhasil dibuat.",
      data: {
        id: orderId,
        order_code: orderCode,
        total_amount: totalAmount,
        status: "pending",
        payment_method,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("CreateOrder error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat memproses pesanan.",
    });
  } finally {
    connection.release();
  }
}

// 2. Mengambil Riwayat Pesanan Saya (User)
export async function getMyOrders(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    const [rows]: any = await db.execute(
      `SELECT ${ORDER_SELECT}
       FROM pesanan o
       LEFT JOIN pembayaran p ON o.id = p.pesanan_id
       WHERE o.pengguna_id = ?
       ORDER BY o.id DESC`,
      [userId]
    );

    return res.status(200).json({
      message: "Berhasil mengambil riwayat pesanan.",
      data: rows.map(mapOrderRow),
    });
  } catch (error) {
    console.error("GetMyOrders error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat mengambil riwayat pesanan.",
    });
  }
}

// 3. Mengambil Semua Pesanan (Khusus Admin)
export async function getAllOrders(_req: Request, res: Response) {
  try {
    const [rows]: any = await db.execute(
      `SELECT ${ORDER_SELECT},
              u.nama_pengguna AS user_name,
              u.telepon AS user_phone
       FROM pesanan o
       JOIN pengguna u ON o.pengguna_id = u.id
       LEFT JOIN pembayaran p ON o.id = p.pesanan_id
       ORDER BY o.id DESC`
    );

    return res.status(200).json({
      message: "Berhasil mengambil seluruh daftar pesanan.",
      data: rows.map(mapOrderRow),
    });
  } catch (error) {
    console.error("GetAllOrders error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat mengambil seluruh daftar pesanan.",
    });
  }
}

// 4. Detail Pesanan Berdasarkan ID
export async function getOrderById(req: Request, res: Response) {
  try {
    const orderId = Number(req.params.id);
    const userId = req.user!.role === "admin" ? null : req.user!.id;

    let sql = `
      SELECT ${ORDER_SELECT},
             u.nama_pengguna AS user_name,
             u.telepon AS user_phone
      FROM pesanan o
      JOIN pengguna u ON o.pengguna_id = u.id
      LEFT JOIN pembayaran p ON o.id = p.pesanan_id
      WHERE o.id = ?
    `;
    const params: any[] = [orderId];

    if (userId) {
      sql += " AND o.pengguna_id = ?";
      params.push(userId);
    }

    const [orders]: any = await db.execute(sql, params);

    if (orders.length === 0) {
      return res.status(404).json({
        message: "Pesanan tidak ditemukan.",
      });
    }

    const order = mapOrderRow(orders[0]);

    // Ambil daftar item dalam pesanan
    const [items]: any = await db.execute(
      `SELECT oi.id,
              oi.pesanan_id AS order_id,
              oi.produk_id AS product_id,
              oi.nama_produk AS product_name,
              oi.harga_modal AS capital_price,
              oi.harga_jual AS selling_price,
              oi.kuantitas AS quantity,
              oi.subtotal AS subtotal_amount,
              (oi.harga_modal * oi.kuantitas) AS subtotal_capital,
              pr.gambar_url AS image_url
       FROM item_pesanan oi
       LEFT JOIN produk pr ON oi.produk_id = pr.id
       WHERE oi.pesanan_id = ?`,
      [orderId]
    );

    order.items = items;

    return res.status(200).json({
      message: "Berhasil mengambil detail pesanan.",
      data: order,
    });
  } catch (error) {
    console.error("GetOrderById error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server.",
    });
  }
}

// 5. Update Status Pesanan (Admin) + Kirim Notifikasi Socket ke User
export async function updateOrderStatus(req: Request, res: Response) {
  const connection = await db.getConnection();

  try {
    const orderId = Number(req.params.id);
    const { status } = req.body;

    await connection.beginTransaction();

    const [rows]: any = await connection.execute(
      `SELECT o.id, o.nomor_pesanan AS order_code, o.pengguna_id AS user_id, o.status,
              p.status_pembayaran AS payment_status,
              p.metode_pembayaran AS payment_method
       FROM pesanan o
       LEFT JOIN pembayaran p ON p.pesanan_id = o.id
       WHERE o.id = ? LIMIT 1 FOR UPDATE`,
      [orderId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: "Pesanan tidak ditemukan.",
      });
    }

    const order = rows[0];
    const dbStatus = orderStatusToDb[status] || status;

    // Kalau statusnya sama, jangan buat notifikasi dobel
    if (order.status === dbStatus) {
      await connection.rollback();
      return res.status(200).json({
        message: "Status tidak berubah.",
        data: {
          order_id: orderId,
          order_code: order.order_code,
          status,
        },
      });
    }

    // Pesanan yang sudah dibatalkan tidak bisa diubah lagi
    if (order.status === "dibatalkan") {
      await connection.rollback();
      return res.status(400).json({
        message: "Pesanan yang sudah dibatalkan tidak bisa diubah lagi.",
      });
    }

    // Transfer/QRIS belum boleh dikirim atau selesai sebelum admin verifikasi bayar.
    // COD tidak diblokir karena pembayarannya memang dilakukan saat pengiriman.
    const butuhVerifikasi =
      dbStatus === "dikirim" || dbStatus === "selesai" || status === "delivering" || status === "completed";
    const metodeCod = order.payment_method === "tunai" || order.payment_method === "cod";
    if (butuhVerifikasi && !metodeCod && order.payment_status !== "dibayar") {
      await connection.rollback();
      return res.status(400).json({
        message: "Verifikasi pembayaran terlebih dahulu sebelum pesanan dikirim atau diselesaikan.",
      });
    }

    // Pembatalan hanya boleh sebelum barang dikirim
    const statusBisaDibatalkan = ["tertunda", "dikonfirmasi", "diproses", "siap"];
    if (dbStatus === "dibatalkan" && !statusBisaDibatalkan.includes(order.status)) {
      await connection.rollback();
      return res.status(400).json({
        message: "Pesanan sudah dikirim/selesai sehingga tidak bisa dibatalkan.",
      });
    }

    // Urutan status agar tidak bisa mundur (misal selesai -> pending)
    if (dbStatus !== "dibatalkan") {
      const urutanStatus: Record<string, number> = {
        tertunda: 1,
        dikonfirmasi: 2,
        diproses: 2,
        siap: 3,
        dikirim: 4,
        selesai: 5,
      };

      const statusSekarang = urutanStatus[order.status] ?? 0;
      const statusBaru = urutanStatus[dbStatus] ?? 0;

      if (statusBaru < statusSekarang) {
        await connection.rollback();
        return res.status(400).json({
          message: "Status pesanan tidak bisa dikembalikan ke tahap sebelumnya.",
        });
      }
    }

    // Kalau pesanan dibatalkan, kembalikan stok produk yang sudah dipotong
    if (dbStatus === "dibatalkan") {
      const [items]: any = await connection.execute(
        "SELECT produk_id, kuantitas FROM item_pesanan WHERE pesanan_id = ?",
        [orderId]
      );

      for (const item of items) {
        await connection.execute(
          "UPDATE produk SET stok = stok + ? WHERE id = ?",
          [item.kuantitas, item.produk_id]
        );
      }
    }

    const completedAt = dbStatus === "selesai" ? ", selesai_pada = NOW()" : "";

    await connection.execute(
      `UPDATE pesanan SET status = ?${completedAt} WHERE id = ?`,
      [dbStatus, orderId]
    );

    await connection.execute(
      `INSERT INTO notifikasi
       (pengguna_id, pesanan_id, judul, pesan, jenis, peran)
       VALUES (?, ?, ?, ?, 'status_pesanan', 'user')`,
      [
        order.user_id,
        orderId,
        "Status Pesanan Diperbarui",
        `Pesanan ${order.order_code} berstatus: ${status}.`,
      ]
    );

    await connection.commit();

    // Kirim notifikasi real-time via Socket.io ke User pemesan
    notifyUserOrderStatus(order.user_id, {
      order_code: order.order_code,
      status,
    });

    return res.status(200).json({
      message: "Status pesanan berhasil diperbarui.",
      data: {
        order_id: orderId,
        order_code: order.order_code,
        status,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("UpdateOrderStatus error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat memperbarui status pesanan.",
    });
  } finally {
    connection.release();
  }
}
