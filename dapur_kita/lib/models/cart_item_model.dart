import 'product_model.dart';

/// Item Keranjang Belanja Pelanggan
class CartItemModel {
  final ProductModel product;
  int quantity;

  CartItemModel({
    required this.product,
    this.quantity = 1,
  });

  double get subtotal => product.sellingPrice * quantity;
}
