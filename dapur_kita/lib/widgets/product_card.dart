import 'package:flutter/material.dart';
import '../models/product_model.dart';
import '../utils/app_colors.dart';
import '../utils/formatters.dart';

/// Kartu tampilan produk di katalog menu pelanggan
class ProductCard extends StatelessWidget {
  final ProductModel product;
  final VoidCallback? onTap;
  final VoidCallback? onAddToCart;

  const ProductCard({
    super.key,
    required this.product,
    this.onTap,
    this.onAddToCart,
  });

  @override
  Widget build(BuildContext context) {
    final bool isOutOfStock = product.stock <= 0 || !product.isAvailable;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Bagian Gambar Produk dengan Badge Ketersediaan
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (product.imageUrl != null && product.imageUrl!.isNotEmpty)
                    Image.network(
                      product.imageUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(
                        color: AppColors.sageGreen.withOpacity(0.3),
                        child: const Icon(
                          Icons.restaurant,
                          color: AppColors.forestGreen,
                          size: 40,
                        ),
                      ),
                      loadingBuilder: (context, child, progress) {
                        if (progress == null) return child;
                        return Container(
                          color: AppColors.warmCream,
                          child: const Center(
                            child: SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          ),
                        );
                      },
                    )
                  else
                    Container(
                      color: AppColors.sageGreen.withOpacity(0.3),
                      child: const Icon(
                        Icons.lunch_dining,
                        color: AppColors.forestGreen,
                        size: 40,
                      ),
                    ),

                  // Kategori Chip
                  if (product.categoryName != null && product.categoryName!.isNotEmpty)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.forestGreen.withOpacity(0.85),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          product.categoryName!,
                          style: const TextStyle(
                            color: AppColors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),

                  // Badge Habis jika stok 0
                  if (isOutOfStock)
                    Container(
                      color: Colors.black54,
                      alignment: Alignment.center,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.error,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'HABIS',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Informasi Nama, Harga, & Tombol Tambah
            Padding(
              padding: const EdgeInsets.all(10.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors.charcoal,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Sisa stok: ${product.stock}',
                    style: TextStyle(
                      fontSize: 11,
                      color: product.stock <= 5 ? AppColors.warning : AppColors.textMuted,
                      fontWeight: product.stock <= 5 ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          Formatters.formatRupiah(product.sellingPrice),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: AppColors.forestGreen,
                          ),
                        ),
                      ),
                      if (onAddToCart != null && !isOutOfStock)
                        InkWell(
                          onTap: onAddToCart,
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: AppColors.forestGreen,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(
                              Icons.add_shopping_cart,
                              color: AppColors.white,
                              size: 16,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
