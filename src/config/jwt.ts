import dotenv from "dotenv";
import jwt, { SignOptions } from "jsonwebtoken";

dotenv.config();

const jwtSecret = process.env.jwt_secret || process.env.JWT_SECRET || "dapurkita_jwt_secret_key";
const jwtExpiresIn = process.env.jwt_expires_in || process.env.JWT_EXPIRES_IN || "14d";

export type UserRole = "admin" | "user";

export type JwtPayload = {
  id: number;
  role: UserRole;
  name: string;
  email: string;
};

// Membuat token JWT
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, jwtSecret, {
    expiresIn: jwtExpiresIn as SignOptions["expiresIn"],
  });
}

// Verifikasi token JWT
export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, jwtSecret);
  return decoded as JwtPayload;
}
