import express, { Application, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import categoryRoutes from "./routes/category.routes";
import productRoutes from "./routes/product.routes";
import orderRoutes from "./routes/order.routes";
import paymentRoutes from "./routes/payment.routes";
import expenseRoutes from "./routes/expense.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import notificationRoutes from "./routes/notification.routes";
import { errorMiddleware } from "./middlewares/error.middleware";

dotenv.config();

const app: Application = express();

// Middleware dasar
// Kalau CLIENT_URL kosong, pakai origin lokal yang jelas.
// (origin: false pada library cors justru berarti "*" / semua origin)
const clientUrl =
  process.env.client_url || process.env.CLIENT_URL || "http://localhost:3000";
app.use(helmet());
app.use(cors({ origin: clientUrl || false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Batasi endpoint tulis/upload agar tidak membanjiri database & Cloudinary.
// Login/register sudah punya batas lebih ketat di auth.routes.ts.
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Terlalu banyak permintaan. Silakan coba lagi setelah 15 menit." },
  skip: (req) =>
    !["POST", "PUT", "PATCH", "DELETE"].includes(req.method) ||
    req.originalUrl.startsWith("/api/auth/login") ||
    req.originalUrl.startsWith("/api/auth/register"),
});
app.use("/api", writeLimiter);

// Endpoint cek status API
app.get("/", (_req: Request, res: Response) => {
  return res.status(200).json({
    message: "DapurKita Backend API berhasil berjalan.",
  });
});

// Routing API
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);

// Endpoint 404 Tidak Ditemukan
app.use((_req: Request, res: Response) => {
  return res.status(404).json({
    message: "Endpoint tidak ditemukan.",
  });
});

// Penanganan error global
app.use(errorMiddleware);

export default app;
