import dotenv from "dotenv";
import fs from "fs";
import mysql from "mysql2/promise";

dotenv.config();

const dbHost = process.env.db_host || process.env.DB_HOST || "localhost";

// SSL tidak otomatis aktif hanya karena host mengandung "aivencloud.com".
// Aktifkan lewat db_ssl=true dan (jika perlu) isi db_ca_cert dengan PATH file CA.
const pakaiSsl =
  String(process.env.db_ssl || process.env.DB_SSL || "").toLowerCase() === "true";

let sslOptions: any = undefined;
if (pakaiSsl) {
  sslOptions = { rejectUnauthorized: true };
  const caPath = process.env.db_ca_cert || process.env.DB_CA_CERT;
  if (caPath && fs.existsSync(caPath)) {
    sslOptions.ca = fs.readFileSync(caPath);
  }
}

// Koneksi database MySQL (Mendukung Aiven Cloud & Localhost)
const db = mysql.createPool({
  host: dbHost,
  user: process.env.db_user || process.env.DB_USER || "root",
  password: process.env.db_password || process.env.DB_PASSWORD || "",
  database: process.env.db_name || process.env.DB_NAME || "defaultdb",
  port: Number(process.env.db_port || process.env.DB_PORT) || 3306,
  // Samakan zona MySQL dengan label grafik (WIB) agar tanggal tidak bergeser
  timezone: "+07:00",
  ssl: sslOptions,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Opsi `timezone` hanya untuk konversi Date di driver.
// Set juga time_zone sesi MySQL supaya CURDATE()/DATE_FORMAT ikut WIB.
db.on("connection", (connection) => {
  connection.query("SET time_zone = '+07:00'");
});

export default db;
