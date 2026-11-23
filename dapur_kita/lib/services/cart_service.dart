import 'package:flutter/material.dart';
import '../models/cart_item_model.dart';
import '../models/product_model.dart';

/// Layanan Pengelola Keranjang Belanja Pelanggan
class CartService extends ChangeNotifier {
  static final CartService _instance = CartService._internal();
  factory CartService() => _instance;
  CartService._internal();

  final List<CartItemModel> _items = [];

  List<CartItemModel> get items => List.unmodifiable(_items);

  /// Total kuantitas barang di keranjang (untuk angka badge)
  int get totalItemCount {
    int total = 0;
    for (var item in _items) {
      total += item.quantity;
    }
    return total;
  }

  /// Total harga belanjaan di keranjang
  double get totalAmount {
    double total = 0.0;
    for (var item in _items) {
      total += item.subtotal;
    }
    return total;
  }

  /// Tambah produk ke keranjang
  void addToCart(ProductModel product, {int quantity = 1}) {
    final index = _items.indexWhere((it) => it.product.id == product.id);
    if (index >= 0) {
      _items[index].quantity += quantity;
    } else {
      _items.add(CartItemModel(product: product, quantity: quantity));
    }
    notifyListeners();
  }

  /// Perbarui kuantitas produk tertentu
  void updateQuantity(int productId, int delta) {
    final index = _items.indexWhere((it) => it.product.id == productId);
    if (index >= 0) {
      _items[index].quantity += delta;
      if (_items[index].quantity <= 0) {
        _items.removeAt(index);
      }
      notifyListeners();
    }
  }

  /// Hapus produk dari keranjang
  void removeItem(int productId) {
    _items.removeWhere((it) => it.product.id == productId);
    notifyListeners();
  }

  /// Bersihkan keranjang belanja
  void clear() {
    _items.clear();
    notifyListeners();
  }
}
