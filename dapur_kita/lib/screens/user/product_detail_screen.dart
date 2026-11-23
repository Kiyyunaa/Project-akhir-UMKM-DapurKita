import 'package:flutter/material.dart';
import '../../models/product_model.dart';
import '../../services/cart_service.dart';
import '../../utils/app_colors.dart';
import '../../utils/formatters.dart';
import '../../widgets/custom_button.dart';

/// Halaman Detail Produk Makanan
class ProductDetailScreen extends StatefulWidget {
  final ProductModel product;

  const ProductDetailScreen({super.key, required this.product});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  int _quantity = 1;

  @override
  Widget build(BuildContext context) {
    final p = widget.product;
    final bool isOutOfStock = p.stock <= 0 || !p.isAvailable;

    return Scaffold(
      backgroundColor: AppColors.warmCream,
      appBar: AppBar(
        title: Text(
          p.name,
          style: const TextStyle(color: AppColors.charcoal, fontWeight: FontWeight.bold, fontSize: 16),
        ),
        backgroundColor: AppColors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.charcoal),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Gambar Produk Utama
            Container(
              height: 260,
              color: AppColors.white,
              child: p.imageUrl != null && p.imageUrl!.isNotEmpty
                  ? Image.network(
                      p.imageUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Center(
                        child: Icon(Icons.restaurant, size: 80, color: AppColors.sageGreen),
                      ),
                    )
                  : const Center(
                      child: Icon(Icons.lunch_dining, size: 80, color: AppColors.sageGreen),
                    ),
            ),

            // Konten Detail
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Kategori & Status Ketersediaan
                  Row(
                    children: [
                      if (p.categoryName != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.sageGreen,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            p.categoryName!,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.forestGreen,
                            ),
                          ),
                        ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: isOutOfStock
                              ? AppColors.error.withOpacity(0.1)
                              : AppColors.success.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          isOutOfStock ? 'Stok Habis' : 'Stok Tersedia (${p.stock})',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: isOutOfStock ? AppColors.error : AppColors.success,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Nama Produk
                  Text(
                    p.name,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppColors.charcoal,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Harga Jual
                  Text(
                    Formatters.formatRupiah(p.sellingPrice),
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.forestGreen,
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Divider(),
                  const SizedBox(height: 8),

                  // Deskripsi
                  const Text(
                    'Deskripsi Produk',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: AppColors.charcoal,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    p.description != null && p.description!.isNotEmpty
                        ? p.description!
                        : 'Tidak ada deskripsi tambahan untuk produk ini.',
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppColors.textMuted,
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 10,
              offset: const Offset(0, -3),
            ),
          ],
        ),
        child: SafeArea(
          child: Row(
            children: [
              // Pemilih Kuantitas (+ / -)
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.remove, size: 18),
                      onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                    ),
                    Text(
                      '$_quantity',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    IconButton(
                      icon: const Icon(Icons.add, size: 18),
                      onPressed: _quantity < p.stock ? () => setState(() => _quantity++) : null,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),

              // Tombol Tambah ke Keranjang
              Expanded(
                child: CustomButton(
                  text: 'Tambah ke Keranjang',
                  icon: Icons.shopping_cart_outlined,
                  onPressed: isOutOfStock
                      ? null
                      : () {
                          CartService().addToCart(p, quantity: _quantity);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('$_quantity ${p.name} ditambahkan ke keranjang.'),
                              backgroundColor: AppColors.forestGreen,
                              duration: const Duration(seconds: 2),
                            ),
                          );
                          Navigator.pop(context);
                        },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
