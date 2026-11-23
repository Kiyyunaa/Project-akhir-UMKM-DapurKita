import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const dbHost = process.env.db_host || process.env.DB_HOST || "localhost";
const isAiven = dbHost.includes("aivencloud.com");

// Koneksi database MySQL (Mendukung Aiven Cloud & Localhost)
const db = mysql.createPool({
  host: dbHost,
  user: process.env.db_user || process.env.DB_USER || "root",
  password: process.env.db_password || process.env.DB_PASSWORD || "",
  database: process.env.db_name || process.env.DB_NAME || "defaultdb",
  port: Number(process.env.db_port || process.env.DB_PORT) || 3306,
  ssl: isAiven ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default db;
