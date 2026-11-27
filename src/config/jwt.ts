
import dotenv from "dotenv";
import jwt, { SignOptions } from "jsonwebtoken";

dotenv.config({ path: "backend/.env" });

const jwtSecret = process.env.jwt_secret || process.env.JWT_SECRET;
const jwtExpiresIn =
  process.env.jwt_expires_in || process.env.JWT_EXPIRES_IN || "30d";

if (!jwtSecret) {
  throw new Error("JWT_SECRET belum dikonfigurasi di backend/.env");
}

export type UserRole = "admin" | "user";

export type JwtPayload = {
  id: number;
  role: UserRole;
  name: string;
  email: string;
  token_version: number;
};

// Membuat token JWT
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, jwtSecret!, {
    expiresIn: jwtExpiresIn as SignOptions["expiresIn"],
  });
}

// Verifikasi token JWT
export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, jwtSecret!);
  return decoded as unknown as JwtPayload;
}
