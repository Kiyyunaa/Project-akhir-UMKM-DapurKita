import type { Request, Response } from "express";
import db from "../database/database";
import { expenseCategoryFromDb, orderStatusFromDb } from "../database/mappers";

// Subquery untuk menghitung total modal (HPP) dari snapshot item pesanan
const TOTAL_CAPITAL = `COALESCE((
  SELECT SUM(ii.harga_modal * ii.kuantitas)
  FROM item_pesanan ii WHERE ii.pesanan_id = o.id
), 0)`;

// 1. Analisis Keuangan & Laba (Omset, Modal, Laba Kotor, Operasional, Laba Bersih)
export async function getFinancialAnalytics(req: Request, res: Response) {
  try {
    const { start_date, end_date } = req.query;

    let orderFilter = "o.status != 'dibatalkan'";
    let expenseFilter = "1=1";
    const orderParams: any[] = [];
    const expenseParams: any[] = [];

    if (start_date) {
      orderFilter += " AND DATE(o.dibuat_pada) >= ?";
      expenseFilter += " AND e.tanggal_pengeluaran >= ?";
      orderParams.push(start_date);
      expenseParams.push(start_date);
    }
    if (end_date) {
      orderFilter += " AND DATE(o.dibuat_pada) <= ?";
      expenseFilter += " AND e.tanggal_pengeluaran <= ?";
      orderParams.push(end_date);
      expenseParams.push(end_date);
    }

    // Hitung Omset (Gross Revenue) & Total Modal (HPP)
    const [orderRows]: any = await db.query(
      `SELECT
         COALESCE(SUM(o.total_jumlah), 0) AS total_revenue,
         COALESCE(SUM(${TOTAL_CAPITAL}), 0) AS total_cogs,
         COUNT(o.id) AS total_orders
       FROM pesanan o
       WHERE ${orderFilter}`,
      orderParams
    );

    // Hitung Total Biaya Operasional (Expenses)
    const [expenseRows]: any = await db.query(
      `SELECT
         COALESCE(SUM(e.jumlah), 0) AS total_expenses,
         COUNT(e.id) AS total_entries
       FROM pengeluaran e
       WHERE ${expenseFilter}`,
      expenseParams
    );

    const totalRevenue = Number(orderRows[0].total_revenue);
    const totalCOGS = Number(orderRows[0].total_cogs);
    const grossProfit = totalRevenue - totalCOGS; // Laba Kotor = Omset - Modal
    const totalExpenses = Number(expenseRows[0].total_expenses);
    const netProfit = grossProfit - totalExpenses; // Laba Bersih = Laba Kotor - Operasional

    // Breakdown Pengeluaran per Kategori
    const [expenseByCategory]: any = await db.query(
      `SELECT e.kategori_pengeluaran AS category, COALESCE(SUM(e.jumlah), 0) AS amount
       FROM pengeluaran e
       WHERE ${expenseFilter}
       GROUP BY e.kategori_pengeluaran`,
      expenseParams
    );

    // Distribusi Status Pesanan
    const [orderStatusStats]: any = await db.query(
      "SELECT o.status, COUNT(o.id) AS count FROM pesanan o GROUP BY o.status"
    );

    // Statistik Produk
    const [productStats]: any = await db.query(
      `SELECT
         COUNT(id) AS total_products,
         SUM(CASE WHEN stok <= 5 THEN 1 ELSE 0 END) AS low_stock_count
       FROM produk`
    );

    return res.status(200).json({
      message: "Berhasil memuat analitik keuangan.",
      data: {
        summary: {
          gross_revenue: totalRevenue,               // Pendapatan Kotor (Omset)
          total_cogs: totalCOGS,                     // Total Modal (HPP)
          gross_profit: grossProfit,                 // Laba Kotor
          total_operational_expenses: totalExpenses, // Biaya Operasional
          net_profit: netProfit,                     // Laba Bersih
          total_orders: Number(orderRows[0].total_orders),
        },
        expense_by_category: expenseByCategory.map((item: any) => ({
          ...item,
          category: expenseCategoryFromDb[item.category] ?? item.category,
        })),
        order_status_distribution: orderStatusStats.map((item: any) => ({
          ...item,
          status: orderStatusFromDb[item.status] ?? item.status,
        })),
        product_overview: {
          total_products: Number(productStats[0].total_products),
          low_stock_products: Number(productStats[0].low_stock_count || 0),
        },
      },
    });
  } catch (error) {
    console.error("GetFinancialAnalytics error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat memuat analitik dashboard.",
    });
  }
}

// 2. Data Grafik Penjualan Harian & Bulanan
export async function getSalesChart(req: Request, res: Response) {
  try {
    const type = req.query.type === "monthly" ? "monthly" : "daily";

    if (type === "monthly") {
      const [orders]: any = await db.query(
        `SELECT
           DATE_FORMAT(o.dibuat_pada, '%Y-%m') AS period,
           COALESCE(SUM(o.total_jumlah), 0) AS revenue,
           COALESCE(SUM(${TOTAL_CAPITAL}), 0) AS cogs
         FROM pesanan o
         WHERE o.status != 'dibatalkan'
         GROUP BY period
         ORDER BY period ASC
         LIMIT 12`
      );

      const [expenses]: any = await db.query(
        `SELECT
           DATE_FORMAT(e.tanggal_pengeluaran, '%Y-%m') AS period,
           COALESCE(SUM(e.jumlah), 0) AS expense
         FROM pengeluaran e
         GROUP BY period
         ORDER BY period ASC
         LIMIT 12`
      );

      const expMap = new Map<string, number>();
      expenses.forEach((e: any) => expMap.set(e.period, Number(e.expense)));

      const chartData = orders.map((o: any) => {
        const rev = Number(o.revenue);
        const cogs = Number(o.cogs);
        const exp = expMap.get(o.period) || 0;
        const gross = rev - cogs;
        const net = gross - exp;
        return {
          period: o.period,
          revenue: rev,
          cogs,
          gross_profit: gross,
          expenses: exp,
          net_profit: net,
        };
      });

      return res.status(200).json({
        message: "Berhasil memuat grafik bulanan.",
        data: chartData,
      });
    }

    // Default: Harian (14 hari terakhir)
    const [dailyOrders]: any = await db.query(
      `SELECT
         DATE(o.dibuat_pada) AS period,
         COALESCE(SUM(o.total_jumlah), 0) AS revenue,
         COALESCE(SUM(${TOTAL_CAPITAL}), 0) AS cogs
       FROM pesanan o
       WHERE o.status != 'dibatalkan' AND o.dibuat_pada >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
       GROUP BY period
       ORDER BY period ASC`
    );

    const [dailyExpenses]: any = await db.query(
      `SELECT
         e.tanggal_pengeluaran AS period,
         COALESCE(SUM(e.jumlah), 0) AS expense
       FROM pengeluaran e
       WHERE e.tanggal_pengeluaran >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
       GROUP BY period
       ORDER BY period ASC`
    );

    const expMap = new Map<string, number>();
    dailyExpenses.forEach((e: any) => {
      const key = new Date(e.period).toISOString().split("T")[0];
      expMap.set(key, Number(e.expense));
    });

    const chartData = dailyOrders.map((o: any) => {
      const key = new Date(o.period).toISOString().split("T")[0];
      const rev = Number(o.revenue);
      const cogs = Number(o.cogs);
      const exp = expMap.get(key) || 0;
      const gross = rev - cogs;
      const net = gross - exp;
      return {
        period: key,
        revenue: rev,
        cogs,
        gross_profit: gross,
        expenses: exp,
        net_profit: net,
      };
    });

    return res.status(200).json({
      message: "Berhasil memuat grafik harian.",
      data: chartData,
    });
  } catch (error) {
    console.error("GetSalesChart error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat memuat grafik penjualan.",
    });
  }
}
