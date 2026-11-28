import type { Request, Response } from "express";
import db from "../database/database";
import {uploadToCloudinary,deleteFromCloudinary,} from "../config/cloudinary";

const CATEGORY_SELECT = `
  id,
  nama AS name,
  deskripsi AS description,
  gambar_url AS image_url,
  gambar_public_id AS image_public_id,
  dibuat_pada AS created_at,
  diperbarui_pada AS updated_at
`;

function getValidId(value: string | string[]): number | null {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (typeof rawValue !== "string") {
    return null;
  }

  const id = Number(rawValue);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function isDuplicateError(error: any): boolean {
  return error?.code === "ER_DUP_ENTRY";
}

// 1. Ambil semua kategori
export async function getAllCategories(_req: Request, res: Response) {
  try {
    const [categories]: any = await db.execute(
      `SELECT ${CATEGORY_SELECT}
       FROM kategori
       ORDER BY nama ASC`
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

// 2. Ambil detail kategori
export async function getCategoryById(req: Request, res: Response) {
  try {
    const id = getValidId(req.params.id);

    if (id === null) {
      return res.status(400).json({
        message: "ID kategori tidak valid.",
      });
    }

    const [categories]: any = await db.execute(
      `SELECT ${CATEGORY_SELECT}
       FROM kategori
       WHERE id = ?
       LIMIT 1`,
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

// 3. Tambah kategori
export async function createCategory(req: Request, res: Response) {
  let uploadedPublicId: string | null = null;
  let categoryCreated = false;

  try {
    const { name, description } = req.body;

    let imageUrl: string | null = null;

    if (req.file) {
      const uploadResult = await uploadToCloudinary(
        req.file.buffer,
        "dapurkita/categories"
      );

      imageUrl = uploadResult.secure_url;
      uploadedPublicId = uploadResult.public_id;
    }

    const [result]: any = await db.execute(
      `INSERT INTO kategori
       (nama, deskripsi, gambar_url, gambar_public_id)
       VALUES (?, ?, ?, ?)`,
      [name, description ?? null, imageUrl, uploadedPublicId]
    );

    categoryCreated = true;

    const [categories]: any = await db.execute(
      `SELECT ${CATEGORY_SELECT}
       FROM kategori
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({
      message: "Kategori berhasil ditambahkan.",
      data: categories[0],
    });
  } catch (error) {
    console.error("CreateCategory error:", error);

    if (uploadedPublicId && !categoryCreated) {
      try {
        await deleteFromCloudinary(uploadedPublicId);
      } catch (cleanupError) {
        console.error("Category image cleanup error:", cleanupError);
      }
    }

    if (isDuplicateError(error)) {
      return res.status(409).json({
        message: "Nama kategori sudah digunakan.",
      });
    }

    return res.status(500).json({
      message: "Terjadi kesalahan saat menambahkan kategori.",
    });
  }
}

// 4. Update kategori
export async function updateCategory(req: Request, res: Response) {
  let uploadedPublicId: string | null = null;
  let updateCompleted = false;

  try {
    const id = getValidId(req.params.id);

    if (id === null) {
      return res.status(400).json({
        message: "ID kategori tidak valid.",
      });
    }

    const { name, description } = req.body;

    const [existing]: any = await db.execute(
      `SELECT gambar_url, gambar_public_id
       FROM kategori
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Kategori tidak ditemukan.",
      });
    }

    const oldImagePublicId = existing[0].gambar_public_id;

    let imageUrl = existing[0].gambar_url;
    let imagePublicId = oldImagePublicId;

    if (req.file) {
      const uploadResult = await uploadToCloudinary(
        req.file.buffer,
        "dapurkita/categories"
      );

      imageUrl = uploadResult.secure_url;
      imagePublicId = uploadResult.public_id;
      uploadedPublicId = uploadResult.public_id;
    }

    await db.execute(
      `UPDATE kategori SET
        nama = COALESCE(?, nama),
        deskripsi = COALESCE(?, deskripsi),
        gambar_url = ?,
        gambar_public_id = ?
       WHERE id = ?`,
      [
        name ?? null,
        description !== undefined ? description : null,
        imageUrl,
        imagePublicId,
        id,
      ]
    );

    updateCompleted = true;

    const [updated]: any = await db.execute(
      `SELECT ${CATEGORY_SELECT}
       FROM kategori
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (
      uploadedPublicId &&
      oldImagePublicId &&
      oldImagePublicId !== uploadedPublicId
    ) {
      try {
        await deleteFromCloudinary(oldImagePublicId);
      } catch (cleanupError) {
        console.error("Old category image cleanup error:", cleanupError);
      }
    }

    return res.status(200).json({
      message: "Kategori berhasil diperbarui.",
      data: updated[0],
    });
  } catch (error) {
    console.error("UpdateCategory error:", error);

    if (uploadedPublicId && !updateCompleted) {
      try {
        await deleteFromCloudinary(uploadedPublicId);
      } catch (cleanupError) {
        console.error("New category image cleanup error:", cleanupError);
      }
    }

    if (isDuplicateError(error)) {
      return res.status(409).json({
        message: "Nama kategori sudah digunakan.",
      });
    }

    return res.status(500).json({
      message: "Terjadi kesalahan saat memperbarui kategori.",
    });
  }
}

// 5. Hapus kategori
export async function deleteCategory(req: Request, res: Response) {
  try {
    const id = getValidId(req.params.id);

    if (id === null) {
      return res.status(400).json({
        message: "ID kategori tidak valid.",
      });
    }

    const [categories]: any = await db.execute(
      `SELECT gambar_public_id
       FROM kategori
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        message: "Kategori tidak ditemukan.",
      });
    }

    await db.execute(
      "DELETE FROM kategori WHERE id = ?",
      [id]
    );

    if (categories[0].gambar_public_id) {
      try {
        await deleteFromCloudinary(categories[0].gambar_public_id);
      } catch (cleanupError) {
        console.error("Category image delete error:", cleanupError);
      }
    }

    return res.status(200).json({
      message: "Kategori berhasil dihapus.",
    });
  } catch (error: any) {
    console.error("DeleteCategory error:", error);

    if (
      error?.code === "ER_ROW_IS_REFERENCED_2" ||
      error?.errno === 1451
    ) {
      return res.status(409).json({
        message: "Kategori tidak dapat dihapus karena masih digunakan oleh produk.",
      });
    }

    return res.status(500).json({
      message: "Terjadi kesalahan saat menghapus kategori.",
    });
  }
}
