// Schema database memakai nama/kolom Bahasa Indonesia, sedangkan kontrak API
// tetap memakai Bahasa Inggris. File ini menjadi jembatan keduanya.

export const roleToDb = (role: string): string => (role === "user" ? "pengguna" : role);
export const roleFromDb = (peran: string): string => (peran === "pengguna" ? "user" : peran);

export const orderStatusToDb: Record<string, string> = {
  pending: "tertunda",
  processing: "diproses",
  ready_to_deliver: "siap",
  delivering: "dikirim",
  completed: "selesai",
  cancelled: "dibatalkan",
};

export const orderStatusFromDb: Record<string, string> = {
  tertunda: "pending",
  dikonfirmasi: "processing",
  diproses: "processing",
  siap: "ready_to_deliver",
  dikirim: "delivering",
  selesai: "completed",
  dibatalkan: "cancelled",
};

export const paymentMethodToDb: Record<string, string> = {
  cod: "tunai",
  transfer: "transfer_bank",
  qris: "qris",
};

export const paymentMethodFromDb: Record<string, string> = {
  tunai: "cod",
  transfer_bank: "transfer",
  dompet_digital: "transfer",
  qris: "qris",
};

export const paymentStatusToDb: Record<string, string> = {
  unpaid: "tertunda",
  paid: "dibayar",
  failed: "gagal",
};

export const paymentStatusFromDb: Record<string, string> = {
  tertunda: "unpaid",
  dibayar: "paid",
  gagal: "failed",
  dikembalikan: "failed",
};

export const expenseCategoryToDb: Record<string, string> = {
  raw_material: "peralatan",
  packaging: "pengemasan",
  fuel: "bensin",
  utility: "utilitas",
  other: "lainnya",
};

export const expenseCategoryFromDb: Record<string, string> = {
  bensin: "fuel",
  pengemasan: "packaging",
  pengiriman: "other",
  utilitas: "utility",
  peralatan: "raw_material",
  lainnya: "other",
};

type AnyRow = Record<string, any>;

const mapEnum = (value: any, table: Record<string, string>) =>
  value == null ? value : table[value] ?? value;

export function mapUserRow(row: AnyRow): AnyRow {
  return {
    ...row,
    role: row.peran !== undefined ? roleFromDb(row.peran) : row.role,
  };
}

export function mapOrderRow(row: AnyRow): AnyRow {
  return {
    ...row,
    status: mapEnum(row.status, orderStatusFromDb),
    payment_method: mapEnum(row.payment_method, paymentMethodFromDb),
    payment_status: mapEnum(row.payment_status, paymentStatusFromDb),
  };
}

export function mapPaymentRow(row: AnyRow): AnyRow {
  return {
    ...row,
    payment_method: mapEnum(row.payment_method, paymentMethodFromDb),
    payment_status: mapEnum(row.payment_status, paymentStatusFromDb),
  };
}

export function mapExpenseRow(row: AnyRow): AnyRow {
  return {
    ...row,
    category: mapEnum(row.category, expenseCategoryFromDb),
  };
}

export function mapNotificationRow(row: AnyRow): AnyRow {
  return {
    ...row,
    role: roleFromDb(row.role),
  };
}
