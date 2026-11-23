import type { Request, Response } from "express";
import db from "../database/database";
import { expenseCategoryToDb, mapExpenseRow } from "../database/mappers";

const EXPENSE_SELECT = `
  e.id,
  e.judul AS title,
  e.kategori_pengeluaran AS category,
  e.jumlah AS amount,
  e.deskripsi AS description,
  e.tanggal_pengeluaran AS expense_date,
  e.pengguna_id AS created_by,
  e.dibuat_pada AS created_at,
  e.diperbarui_pada AS updated_at,
  u.nama_pengguna AS created_by_name
`;

// 1. Ambil Semua Biaya Operasional (Bisa filter tanggal & kategori)
export async function getAllExpenses(req: Request, res: Response) {
  try {
    const { start_date, end_date, category } = req.query;

    let sql = `
      SELECT ${EXPENSE_SELECT}
      FROM pengeluaran e
      LEFT JOIN pengguna u ON e.pengguna_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (start_date) {
      sql += " AND e.tanggal_pengeluaran >= ?";
      params.push(start_date);
    }
    if (end_date) {
      sql += " AND e.tanggal_pengeluaran <= ?";
      params.push(end_date);
    }
    if (category) {
      const dbCategory = expenseCategoryToDb[category as string] || category;
      sql += " AND e.kategori_pengeluaran = ?";
      params.push(dbCategory);
    }

    sql += " ORDER BY e.tanggal_pengeluaran DESC, e.id DESC";

    const [rows]: any = await db.query(sql, params);

    return res.status(200).json({
      message: "Berhasil mengambil data biaya operasional.",
      data: rows.map(mapExpenseRow),
    });
  } catch (error) {
    console.error("GetAllExpenses error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengambil data biaya operasional.",
    });
  }
}

// 2. Ambil Detail Biaya Operasional Berdasarkan ID
export async function getExpenseById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

    const [rows]: any = await db.execute(
      `SELECT ${EXPENSE_SELECT}
       FROM pengeluaran e
       LEFT JOIN pengguna u ON e.pengguna_id = u.id
       WHERE e.id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Data pengeluaran tidak ditemukan.",
      });
    }

    return res.status(200).json({
      message: "Berhasil mengambil detail pengeluaran.",
      data: mapExpenseRow(rows[0]),
    });
  } catch (error) {
    console.error("GetExpenseById error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server.",
    });
  }
}

// 3. Tambah Biaya Operasional Baru (Admin)
export async function createExpense(req: Request, res: Response) {
  try {
    const adminId = req.user!.id;
    const { title, category, amount, description, expense_date } = req.body;
    const dbCategory = expenseCategoryToDb[category] || "lainnya";

    const [result]: any = await db.execute(
      `INSERT INTO pengeluaran
       (judul, kategori_pengeluaran, jumlah, deskripsi, tanggal_pengeluaran, pengguna_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, dbCategory, amount, description || null, expense_date, adminId]
    );

    return res.status(201).json({
      message: "Biaya operasional berhasil dicatat.",
      data: {
        id: result.insertId,
        title,
        category,
        amount,
        description,
        expense_date,
      },
    });
  } catch (error) {
    console.error("CreateExpense error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat mencatat biaya operasional.",
    });
  }
}

// 4. Update Biaya Operasional (Admin)
export async function updateExpense(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const { title, category, amount, description, expense_date } = req.body;
    const dbCategory = category ? expenseCategoryToDb[category] || category : null;

    await db.execute(
      `UPDATE pengeluaran SET
         judul = COALESCE(?, judul),
         kategori_pengeluaran = COALESCE(?, kategori_pengeluaran),
         jumlah = COALESCE(?, jumlah),
         deskripsi = COALESCE(?, deskripsi),
         tanggal_pengeluaran = COALESCE(?, tanggal_pengeluaran)
       WHERE id = ?`,
      [
        title || null,
        dbCategory,
        amount !== undefined ? amount : null,
        description || null,
        expense_date || null,
        id,
      ]
    );

    const [rows]: any = await db.execute(
      `SELECT ${EXPENSE_SELECT}
       FROM pengeluaran e
       LEFT JOIN pengguna u ON e.pengguna_id = u.id
       WHERE e.id = ? LIMIT 1`,
      [id]
    );

    return res.status(200).json({
      message: "Biaya operasional berhasil diperbarui.",
      data: mapExpenseRow(rows[0] || {}),
    });
  } catch (error) {
    console.error("UpdateExpense error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat memperbarui biaya operasional.",
    });
  }
}

// 5. Hapus Biaya Operasional (Admin)
export async function deleteExpense(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

    await db.execute("DELETE FROM pengeluaran WHERE id = ?", [id]);

    return res.status(200).json({
      message: "Biaya operasional berhasil dihapus.",
    });
  } catch (error) {
    console.error("DeleteExpense error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat menghapus biaya operasional.",
    });
  }
}
