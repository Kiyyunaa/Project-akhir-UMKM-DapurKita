import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

let io: Server | null = null;

// Inisialisasi Socket.io untuk notifikasi real-time
export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    // User / Admin bergabung ke room spesifik
    socket.on("join_room", (data: { role?: string; userId?: number }) => {
      if (data.role === "admin") {
        socket.join("admin_room");
      }
      if (data.userId) {
        socket.join(`user_${data.userId}`);
      }
    });
  });

  return io;
}

// Beritahu admin ketika ada pesanan baru masuk
export function notifyAdminNewOrder(orderData: {
  order_code: string;
  user_name: string;
  total_amount: number;
}) {
  if (!io) return;
  io.to("admin_room").emit("new_order", {
    title: "Pesanan Baru Masuk!",
    message: `Pesanan ${orderData.order_code} dari ${orderData.user_name} (Rp ${Number(orderData.total_amount).toLocaleString("id-ID")})`,
    data: orderData,
  });
}

// Beritahu user saat status pesanannya diubah admin
export function notifyUserOrderStatus(
  userId: number,
  orderData: {
    order_code: string;
    status: string;
  }
) {
  if (!io) return;
  io.to(`user_${userId}`).emit("order_status_updated", {
    title: "Status Pesanan Diperbarui",
    message: `Pesanan ${orderData.order_code} berstatus: ${orderData.status}`,
    data: orderData,
  });
}

// Beritahu seluruh user saat ada menu sayur baru ditambahkan
export function notifyNewProduct(productData: any) {
  if (!io) return;
  io.emit("new_product", {
    title: "Menu Sayur Baru!",
    message: `Menu baru telah ditambahkan: ${productData.name}`,
    data: productData,
  });
}
