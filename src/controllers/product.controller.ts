
import type { Request, Response } from "express";
import db from "../database/database";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary";
import { notifyNewProduct } from "../sockets/notification.socket";

const PRODUCT_SELECT = `
  p.id,
  p.kategori_id AS category_id,
  p.nama AS name,
  p.deskripsi AS description,
  p.gambar_url AS image_url,
  p.gambar_public_id AS image_public_id,
  p.harga_modal AS capital_price,
  p.harga_jual AS selling_price,
  p.stok AS stock,
  p.tersedia AS is_available,
  p.dibuat_pada AS created_at,
  p.diperbarui_pada AS updated_at,
  k.nama AS category_name
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

async function categoryExists(categoryId: number): Promise<boolean> {
  const [rows]: any = await db.execute(
    "SELECT id FROM kategori WHERE id = ? LIMIT 1",
    [categoryId]
  );

  return rows.length > 0;
}

// 1. Ambil semua produk
export async function getAllProducts(req: Request, res: Response) {
  try {
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const categoryId =
      typeof req.query.category_id === "string"
        ? getValidId(req.query.category_id)
        : null;

    if (req.query.category_id !== undefined && categoryId === null) {
      return res.status(400).json({
        message: "ID kategori tidak valid.",
      });
    }

    let sql = `
      SELECT ${PRODUCT_SELECT}
      FROM produk p
      LEFT JOIN kategori k ON p.kategori_id = k.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (search) {
      sql += " AND p.nama LIKE ?";
      params.push(`%${search}%`);
    }

    if (categoryId !== null) {
      sql += " AND p.kategori_id = ?";
      params.push(categoryId);
    }

    sql += " ORDER BY p.id DESC";

    const [products]: any = await db.execute(sql, params);

    return res.status(200).json({
      message: "Berhasil mengambil daftar produk.",
      data: products,
    });
  } catch (error) {
    console.error("GetAllProducts error:", error);

    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengambil produk.",
    });
  }
}

// 2. Ambil detail produk
export async function getProductById(req: Request, res: Response) {
  try {
    const id = getValidId(req.params.id);

    if (id === null) {
      return res.status(400).json({
        message: "ID produk tidak valid.",
      });
    }

    const [products]: any = await db.execute(
      `SELECT ${PRODUCT_SELECT}
       FROM produk p
       LEFT JOIN kategori k ON p.kategori_id = k.id
       WHERE p.id = ? LIMIT 1`,
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        message: "Produk tidak ditemukan.",
      });
    }

    return res.status(200).json({
      message: "Berhasil mengambil detail produk.",
      data: products[0],
    });
  } catch (error) {
    console.error("GetProductById error:", error);

    return res.status(500).json({
      message: "Terjadi kesalahan pada server.",
    });
  }
}

// 3. Tambah produk
export async function createProduct(req: Request, res: Response) {
  let uploadedPublicId: string | null = null;
  let productCreated = false;

  try {
    const {
      category_id,
      name,
      description,
      capital_price,
      selling_price,
      stock,
      is_available,
    } = req.body;

    // Pastikan kategori tersedia
    if (!(await categoryExists(category_id))) {
      return res.status(404).json({
        message: "Kategori tidak ditemukan.",
      });
    }

    let imageUrl: string | null = null;

    // Upload gambar jika tersedia
    if (req.file) {
      const uploadResult = await uploadToCloudinary(
        req.file.buffer,
        "dapurkita/products"
      );

      imageUrl = uploadResult.secure_url;
      uploadedPublicId = uploadResult.public_id;
    }

    const [result]: any = await db.execute(
      `INSERT INTO produk
       (kategori_id, nama, deskripsi, gambar_url, gambar_public_id,
        harga_modal, harga_jual, stok, tersedia)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id,
        name,
        description || null,
        imageUrl,
        uploadedPublicId,
        capital_price,
        selling_price,
        stock ?? 0,
        is_available ?? true,
      ]
    );

    productCreated = true;

    const [newProduct]: any = await db.execute(
      `SELECT ${PRODUCT_SELECT}
       FROM produk p
       LEFT JOIN kategori k ON p.kategori_id = k.id
       WHERE p.id = ? LIMIT 1`,
      [result.insertId]
    );

    const productData = newProduct[0];

    // Notifikasi tidak boleh menggagalkan penyimpanan produk
    try {
      notifyNewProduct(productData);
    } catch (error) {
      console.error("NotifyNewProduct error:", error);
    }

    return res.status(201).json({
      message: "Produk berhasil ditambahkan.",
      data: productData,
    });
  } catch (error) {
    console.error("CreateProduct error:", error);

    // Bersihkan gambar jika penyimpanan produk gagal
    if (uploadedPublicId && !productCreated) {
      try {
        await deleteFromCloudinary(uploadedPublicId);
      } catch (cleanupError) {
        console.error("Cloudinary cleanup error:", cleanupError);
      }
    }

    return res.status(500).json({
      message: "Terjadi kesalahan saat menambahkan produk.",
    });
  }
}

// 4. Update produk
export async function updateProduct(req: Request, res: Response) {
  let uploadedPublicId: string | null = null;
  let updateCompleted = false;

  try {
    const id = getValidId(req.params.id);

    if (id === null) {
      return res.status(400).json({
        message: "ID produk tidak valid.",
      });
    }

    const {
      category_id,
      name,
      description,
      capital_price,
      selling_price,
      stock,
      is_available,
    } = req.body;

    // Ambil produk lama
    const [existing]: any = await db.execute(
      "SELECT * FROM produk WHERE id = ? LIMIT 1",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Produk tidak ditemukan.",
      });
    }

    // Pastikan kategori baru tersedia
    if (
      category_id !== undefined &&
      !(await categoryExists(category_id))
    ) {
      return res.status(404).json({
        message: "Kategori tidak ditemukan.",
      });
    }

    const oldImagePublicId = existing[0].gambar_public_id;

    let imageUrl = existing[0].gambar_url;
    let imagePublicId = oldImagePublicId;

    // Upload gambar baru jika tersedia
    if (req.file) {
      const uploadResult = await uploadToCloudinary(
        req.file.buffer,
        "dapurkita/products"
      );

      imageUrl = uploadResult.secure_url;
      imagePublicId = uploadResult.public_id;
      uploadedPublicId = uploadResult.public_id;
    }

    await db.execute(
      `UPDATE produk SET
        kategori_id = COALESCE(?, kategori_id),
        nama = COALESCE(?, nama),
        deskripsi = COALESCE(?, deskripsi),
        harga_modal = COALESCE(?, harga_modal),
        harga_jual = COALESCE(?, harga_jual),
        stok = COALESCE(?, stok),
        tersedia = COALESCE(?, tersedia),
        gambar_url = ?,
        gambar_public_id = ?
       WHERE id = ?`,
      [
        category_id ?? null,
        name !== undefined ? name : null,
        description !== undefined ? description : null,
        capital_price ?? null,
        selling_price ?? null,
        stock ?? null,
        is_available ?? null,
        imageUrl,
        imagePublicId,
        id,
      ]
    );

    updateCompleted = true;

    const [updated]: any = await db.execute(
      `SELECT ${PRODUCT_SELECT}
       FROM produk p
       LEFT JOIN kategori k ON p.kategori_id = k.id
       WHERE p.id = ? LIMIT 1`,
      [id]
    );

    // Hapus gambar lama setelah gambar baru berhasil disimpan
    if (
      uploadedPublicId &&
      oldImagePublicId &&
      oldImagePublicId !== uploadedPublicId
    ) {
      try {
        await deleteFromCloudinary(oldImagePublicId);
      } catch (cleanupError) {
        console.error("Old image cleanup error:", cleanupError);
      }
    }

    return res.status(200).json({
      message: "Produk berhasil diperbarui.",
      data: updated[0],
    });
  } catch (error) {
    console.error("UpdateProduct error:", error);

    // Hapus gambar baru jika proses update database gagal
    if (uploadedPublicId && !updateCompleted) {
      try {
        await deleteFromCloudinary(uploadedPublicId);
      } catch (cleanupError) {
        console.error("Cloudinary cleanup error:", cleanupError);
      }
    }

    return res.status(500).json({
      message: "Terjadi kesalahan saat memperbarui produk.",
    });
  }
}

// 5. Hapus produk
export async function deleteProduct(req: Request, res: Response) {
  try {
    const id = getValidId(req.params.id);

    if (id === null) {
      return res.status(400).json({
        message: "ID produk tidak valid.",
      });
    }

    // Ambil data produk sebelum dihapus
    const [products]: any = await db.execute(
      "SELECT gambar_public_id FROM produk WHERE id = ? LIMIT 1",
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        message: "Produk tidak ditemukan.",
      });
    }

    // Hapus produk dari database
    await db.execute("DELETE FROM produk WHERE id = ?", [id]);

    // Foreign key akan mengatur produk_id item_pesanan menjadi NULL
    // Hapus gambar Cloudinary jika ada
    if (products[0].gambar_public_id) {
      try {
        await deleteFromCloudinary(products[0].gambar_public_id);
      } catch (cleanupError) {
        console.error("Cloudinary delete error:", cleanupError);
      }
    }

    return res.status(200).json({
      message: "Produk berhasil dihapus.",
    });
  } catch (error) {
    console.error("DeleteProduct error:", error);

    return res.status(500).json({
      message: "Terjadi kesalahan saat menghapus produk.",
    });
  }
}
