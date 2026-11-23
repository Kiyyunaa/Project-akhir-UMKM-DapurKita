import 'package:intl/intl.dart';

/// Helper formatting untuk Mata Uang (Rupiah) dan Tanggal
class Formatters {
  static final NumberFormat _currencyFormat = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  );

  /// Format angka ke Rupiah, contoh: Rp 15.000
  static String formatRupiah(num? amount) {
    if (amount == null) return 'Rp 0';
    return _currencyFormat.format(amount);
  }

  /// Format tanggal singkat, contoh: 22 Nov 2026
  static String formatDate(dynamic date) {
    if (date == null) return '-';
    try {
      DateTime dt;
      if (date is DateTime) {
        dt = date;
      } else {
        dt = DateTime.parse(date.toString());
      }
      return DateFormat('d MMM yyyy', 'id_ID').format(dt);
    } catch (_) {
      return date.toString();
    }
  }

  /// Format tanggal dan waktu, contoh: 22 Nov 2026, 14:30
  static String formatDateTime(dynamic date) {
    if (date == null) return '-';
    try {
      DateTime dt;
      if (date is DateTime) {
        dt = date;
      } else {
        dt = DateTime.parse(date.toString());
      }
      return DateFormat('d MMM yyyy, HH:mm', 'id_ID').format(dt);
    } catch (_) {
      return date.toString();
    }
  }
}
