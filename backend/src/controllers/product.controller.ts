import type { Request, Response } from "express";
import db from "../database/database";
import { uploadToCloudinary } from "../config/cloudinary";
import { notifyNewProduct } from "../sockets/notification.socket";

// Kolom database Bahasa Indonesia -> kontrak API Bahasa Inggris
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

// 1. Ambil Semua Produk Sayur (Bisa filter nama & kategori)
export async function getAllProducts(req: Request, res: Response) {
  try {
    const search = req.query.search as string;
    const categoryId = req.query.category_id as string;

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

    if (categoryId) {
      sql += " AND p.kategori_id = ?";
      params.push(categoryId);
    }

    sql += " ORDER BY p.id DESC";

    const [products]: any = await db.query(sql, params);

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

// 2. Ambil Detail Produk Berdasarkan ID
export async function getProductById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

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

// 3. Tambah Produk Baru (Admin) + Upload Foto ke Cloudinary + Socket Real-time
export async function createProduct(req: Request, res: Response) {
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

    let imageUrl: string | null = null;
    let imagePublicId: string | null = null;

    // Upload foto ke Cloudinary jika ada file yang diunggah
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, "dapurkita/products");
      imageUrl = uploadResult.secure_url;
      imagePublicId = uploadResult.public_id;
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
        imagePublicId,
        capital_price,
        selling_price,
        stock || 0,
        is_available !== undefined ? is_available : true,
      ]
    );

    const productId = result.insertId;

    const [newProduct]: any = await db.execute(
      `SELECT ${PRODUCT_SELECT}
       FROM produk p
       LEFT JOIN kategori k ON p.kategori_id = k.id
       WHERE p.id = ? LIMIT 1`,
      [productId]
    );

    const productData = newProduct[0];

    // Kirim notifikasi real-time via Socket.io ke sisi user
    notifyNewProduct(productData);

    return res.status(201).json({
      message: "Produk berhasil ditambahkan.",
      data: productData,
    });
  } catch (error) {
    console.error("CreateProduct error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat menambahkan produk.",
    });
  }
}

// 4. Update Produk (Admin)
export async function updateProduct(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const {
      category_id,
      name,
      description,
      capital_price,
      selling_price,
      stock,
      is_available,
    } = req.body;

    // Ambil data produk lama
    const [existing]: any = await db.execute(
      "SELECT * FROM produk WHERE id = ? LIMIT 1",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Produk tidak ditemukan.",
      });
    }

    let imageUrl = existing[0].gambar_url;
    let imagePublicId = existing[0].gambar_public_id;

    // Jika admin mengunggah gambar baru
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, "dapurkita/products");
      imageUrl = uploadResult.secure_url;
      imagePublicId = uploadResult.public_id;
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
        category_id !== undefined ? category_id : null,
        name || null,
        description || null,
        capital_price !== undefined ? capital_price : null,
        selling_price !== undefined ? selling_price : null,
        stock !== undefined ? stock : null,
        is_available !== undefined ? is_available : null,
        imageUrl,
        imagePublicId,
        id,
      ]
    );

    const [updated]: any = await db.execute(
      `SELECT ${PRODUCT_SELECT}
       FROM produk p
       LEFT JOIN kategori k ON p.kategori_id = k.id
       WHERE p.id = ? LIMIT 1`,
      [id]
    );

    return res.status(200).json({
      message: "Produk berhasil diperbarui.",
      data: updated[0],
    });
  } catch (error) {
    console.error("UpdateProduct error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat memperbarui produk.",
    });
  }
}

// 5. Hapus Produk (Admin)
export async function deleteProduct(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

    await db.execute("DELETE FROM produk WHERE id = ?", [id]);

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
