import type { Request, Response } from "express";
import db from "../database/database";

// 1. Ambil Semua Kategori Sayur
export async function getAllCategories(_req: Request, res: Response) {
  try {
    const [categories]: any = await db.execute(
      `SELECT id, nama AS name, deskripsi AS description, dibuat_pada AS created_at
       FROM kategori ORDER BY nama ASC`
    );

    return res.status(200).json({
      message: "Berhasil mengambil daftar kategori.",
      data: categories,
    });
  } catch (error) {
    console.error("GetAllCategories error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengambil kategori.",
    });
  }
}

// 2. Ambil Kategori Berdasarkan ID
export async function getCategoryById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

    const [categories]: any = await db.execute(
      `SELECT id, nama AS name, deskripsi AS description, dibuat_pada AS created_at
       FROM kategori WHERE id = ? LIMIT 1`,
      [id]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        message: "Kategori tidak ditemukan.",
      });
    }

    return res.status(200).json({
      message: "Berhasil mengambil detail kategori.",
      data: categories[0],
    });
  } catch (error) {
    console.error("GetCategoryById error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server.",
    });
  }
}

// 3. Tambah Kategori Baru (Admin)
export async function createCategory(req: Request, res: Response) {
  try {
    const { name, description } = req.body;

    const [result]: any = await db.execute(
      "INSERT INTO kategori (nama, deskripsi) VALUES (?, ?)",
      [name, description || null]
    );

    return res.status(201).json({
      message: "Kategori berhasil ditambahkan.",
      data: {
        id: result.insertId,
        name,
        description,
      },
    });
  } catch (error) {
    console.error("CreateCategory error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat menambahkan kategori.",
    });
  }
}

// 4. Update Kategori (Admin)
export async function updateCategory(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const { name, description } = req.body;

    await db.execute(
      `UPDATE kategori SET
         nama = COALESCE(?, nama),
         deskripsi = COALESCE(?, deskripsi)
       WHERE id = ?`,
      [name || null, description || null, id]
    );

    const [categories]: any = await db.execute(
      "SELECT id, nama AS name, deskripsi AS description FROM kategori WHERE id = ? LIMIT 1",
      [id]
    );

    return res.status(200).json({
      message: "Kategori berhasil diperbarui.",
      data: categories[0],
    });
  } catch (error) {
    console.error("UpdateCategory error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat memperbarui kategori.",
    });
  }
}

// 5. Hapus Kategori (Admin)
export async function deleteCategory(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

    await db.execute("DELETE FROM kategori WHERE id = ?", [id]);

    return res.status(200).json({
      message: "Kategori berhasil dihapus.",
    });
  } catch (error) {
    console.error("DeleteCategory error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat menghapus kategori.",
    });
  }
}
