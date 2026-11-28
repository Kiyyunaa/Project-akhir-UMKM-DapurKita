import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config({ path: "backend/.env" });

cloudinary.config({
  cloud_name:
    process.env.cloudinary_cloud_name ||
    process.env.CLOUDINARY_CLOUD_NAME,

  api_key:
    process.env.cloudinary_api_key ||
    process.env.CLOUDINARY_API_KEY,

  api_secret:
    process.env.cloudinary_api_secret ||
    process.env.CLOUDINARY_API_SECRET,
});

console.log("Cloudinary config:", {
  cloud_name: cloudinary.config().cloud_name,
  api_key: cloudinary.config().api_key ? "TERISI" : "KOSONG",
  api_secret: cloudinary.config().api_secret ? "TERISI" : "KOSONG",
});

// Upload gambar ke Cloudinary
export function uploadToCloudinary(
  buffer: Buffer,
  folder: string = "dapurkita"
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          return reject(
            error || new Error("Gagal mengunggah gambar ke Cloudinary.")
          );
        }

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    stream.end(buffer);
  });
}

// Hapus gambar dari Cloudinary
export async function deleteFromCloudinary(
  publicId: string
): Promise<void> {
  if (!publicId) return;

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });

  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error("Gagal menghapus gambar dari Cloudinary.");
  }
}

export default cloudinary;
