import http from "http";
import dotenv from "dotenv";
import app from "./app";
import { initSocket } from "./sockets/notification.socket";
import { seedAdmin } from "./database/seeders/admin.seeder";
import { initializeDatabase } from "./database/migrate";

dotenv.config();

const port = Number(process.env.port || process.env.PORT) || 5000;

const server = http.createServer(app);

// Inisialisasi Socket.io
initSocket(server);

async function startServer() {
  try {
    // Jalankan seeder admin otomatis jika belum ada akun admin
    await seedAdmin();

    server.listen(port, () => {
      console.log(`DapurKita API berjalan di port ${port}`);
      console.log(`Akses lokal: http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Gagal menjalankan server:", error);
    process.exit(1);
  }
}

startServer();
