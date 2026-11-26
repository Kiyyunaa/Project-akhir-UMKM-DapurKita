import express, { Application, Request, Response } from "express";
import cors from "cors";
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

const app: Application = express();

// Middleware dasar
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
