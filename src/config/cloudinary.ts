import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.cloudinary_cloud_name || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.cloudinary_api_key || process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.cloudinary_api_secret || process.env.CLOUDINARY_API_SECRET,
});

// Fungsi helper upload buffer gambar ke Cloudinary
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
          return reject(error || new Error("Gagal mengunggah gambar ke Cloudinary."));
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

export default cloudinary;
