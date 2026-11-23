import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyToken } from "../config/jwt";
import db from "../database/database";

let io: Server | null = null;

// Catatan koneksi tiap user supaya bisa diputus saat logout / akun nonaktif
const userSockets = new Map<number, string[]>();

// Versi token yang dipakai tiap socket, untuk cek token yang sudah di-logout
const socketTokens = new Map<string, { userId: number; tokenVersion: number }>();

function daftarkanSocket(userId: number, socketId: string) {
  const daftar = userSockets.get(userId) || [];
  if (!daftar.includes(socketId)) daftar.push(socketId);
  userSockets.set(userId, daftar);
}

function hapusSocket(userId: number, socketId: string) {
  const daftar = userSockets.get(userId) || [];
  const sisa = daftar.filter((id) => id !== socketId);
  if (sisa.length === 0) {
    userSockets.delete(userId);
  } else {
    userSockets.set(userId, sisa);
  }
}

// Dipanggil saat logout
export function disconnectUserSockets(userId: number) {
  if (!io) return;
  const daftar = userSockets.get(userId) || [];
  for (const socketId of daftar) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) socket.disconnect(true);
    socketTokens.delete(socketId);
  }
  userSockets.delete(userId);
}

// Pengecekan socket cukup dilakukan berkala, bukan pada setiap event.
// Ini mencegah query DB berulang untuk semua socket setiap kali ada notifikasi.
let terakhirBersihkanSocket = 0;

// Putuskan koneksi milik akun yang sudah dinonaktifkan
async function bersihkanSocketNonaktif() {
  if (!io || Date.now() - terakhirBersihkanSocket < 30000) return;
  terakhirBersihkanSocket = Date.now();
  try {
    for (const [socketId, info] of socketTokens) {
      const [rows]: any = await db.execute(
        "SELECT aktif, token_version FROM pengguna WHERE id = ? LIMIT 1",
        [info.userId]
      );

      const tidakValid =
        rows.length === 0 ||
        !rows[0].aktif ||
        info.tokenVersion !== Number(rows[0].token_version ?? 0);

      if (tidakValid) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) socket.disconnect(true);
        socketTokens.delete(socketId);
        hapusSocket(info.userId, socketId);
      }
    }
  } catch {
    return;
  }
}

// Inisialisasi Socket.io untuk notifikasi real-time
export function initSocket(server: HttpServer): Server {
  // Samakan dengan CORS HTTP di app.ts
  const clientUrl =
    process.env.client_url || process.env.CLIENT_URL || "http://localhost:3000";

  io = new Server(server, {
    cors: {
      origin: clientUrl,
      methods: ["GET", "POST"],
    },
    // Cek Origin juga untuk handshake WebSocket (bukan hanya polling)
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      if (origin && origin !== clientUrl) {
        return callback(null, false);
      }
      return callback(null, true);
    },
  });

  io.on("connection", (socket: Socket) => {
    // User / Admin bergabung ke room spesifik, tapi token harus valid
    socket.on("join_room", async (data: { role?: string; userId?: number }) => {
      try {
        const authorization = socket.handshake.headers.authorization;
        if (!authorization || !authorization.startsWith("Bearer ")) return;

        const user = verifyToken(authorization.split(" ")[1]);

        // Cek status terbaru dari database, jangan cuma percaya isi token
        const [rows]: any = await db.execute(
          "SELECT peran, aktif, token_version FROM pengguna WHERE id = ? LIMIT 1",
          [user.id]
        );

        if (rows.length === 0 || !rows[0].aktif) return;
        if ((user.token_version ?? 0) !== Number(rows[0].token_version ?? 0)) return;

        socketTokens.set(socket.id, {
          userId: user.id,
          tokenVersion: user.token_version ?? 0,
        });

        const roleFromDb = rows[0].peran === "admin" ? "admin" : "user";

        // Semua koneksi terverifikasi masuk room ini
        socket.join("authenticated");
        daftarkanSocket(user.id, socket.id);

        if (data.role === "admin" && roleFromDb === "admin") {
          socket.join("admin_room");
        }
        if (data.userId && user.id === data.userId) {
          socket.join(`user_${data.userId}`);
        }
      } catch {
        return;
      }
    });

    socket.on("disconnect", () => {
      for (const [userId] of userSockets) {
        hapusSocket(userId, socket.id);
      }
      socketTokens.delete(socket.id);
    });
  });

  return io;
}

// Beritahu admin ketika ada pesanan baru masuk
export async function notifyAdminNewOrder(orderData: {
  order_code: string;
  user_name: string;
  total_amount: number;
}) {
  if (!io) return;
  await bersihkanSocketNonaktif();
  io.to("admin_room").emit("new_order", {
    title: "Pesanan Baru Masuk!",
    message: `Pesanan ${orderData.order_code} dari ${orderData.user_name} (Rp ${Number(orderData.total_amount).toLocaleString("id-ID")})`,
    data: orderData,
  });
}

// Beritahu user saat status pesanannya diubah admin
export async function notifyUserOrderStatus(
  userId: number,
  orderData: {
    order_code: string;
    status: string;
  }
) {
  if (!io) return;
  await bersihkanSocketNonaktif();
  io.to(`user_${userId}`).emit("order_status_updated", {
    title: "Status Pesanan Diperbarui",
    message: `Pesanan ${orderData.order_code} berstatus: ${orderData.status}`,
    data: orderData,
  });
}

// Beritahu koneksi yang sudah terautentikasi saat ada menu sayur baru
export async function notifyNewProduct(productData: any) {
  if (!io) return;
  await bersihkanSocketNonaktif();
  io.to("authenticated").emit("new_product", {
    title: "Menu Sayur Baru!",
    message: `Menu baru telah ditambahkan: ${productData.name}`,
    data: productData,
  });
}
