import 'package:flutter/material.dart';
import '../../services/cart_service.dart';
import '../../utils/app_colors.dart';
import '../../utils/formatters.dart';
import '../../widgets/custom_button.dart';
import 'checkout_screen.dart';

/// Halaman Keranjang Belanja Pelanggan
class CartScreen extends StatelessWidget {
  final VoidCallback? onBrowseProducts;

  const CartScreen({super.key, this.onBrowseProducts});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: CartService(),
      builder: (context, child) {
        final cart = CartService();
        final items = cart.items;

        if (items.isEmpty) {
          return Scaffold(
            backgroundColor: AppColors.warmCream,
            appBar: AppBar(
              title: const Text(
                'Keranjang Belanja',
                style: TextStyle(color: AppColors.charcoal, fontWeight: FontWeight.bold, fontSize: 18),
              ),
              backgroundColor: AppColors.white,
              elevation: 0,
            ),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: const BoxDecoration(
                        color: AppColors.sageGreen,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.shopping_basket_outlined,
                        size: 64,
                        color: AppColors.forestGreen,
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Keranjang Masih Kosong',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.charcoal),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Yuk pilih sayuran segar dan lauk matang favorit Anda sekarang!',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 24),
                    if (onBrowseProducts != null)
                      SizedBox(
                        width: 200,
                        child: CustomButton(
                          text: 'Mulai Belanja',
                          onPressed: onBrowseProducts,
                          icon: Icons.restaurant_menu,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          );
        }

        return Scaffold(
          backgroundColor: AppColors.warmCream,
          appBar: AppBar(
            title: const Text(
              'Keranjang Belanja',
              style: TextStyle(color: AppColors.charcoal, fontWeight: FontWeight.bold, fontSize: 18),
            ),
            backgroundColor: AppColors.white,
            elevation: 0,
            actions: [
              TextButton(
                onPressed: () => cart.clear(),
                child: const Text('Hapus Semua', style: TextStyle(color: AppColors.error, fontSize: 13)),
              ),
            ],
          ),
          body: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final item = items[index];
              return Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.03),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    // Gambar item
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        width: 70,
                        height: 70,
                        color: AppColors.sageGreen.withOpacity(0.3),
                        child: item.product.imageUrl != null && item.product.imageUrl!.isNotEmpty
                            ? Image.network(
                                item.product.imageUrl!,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(Icons.restaurant, color: AppColors.forestGreen),
                              )
                            : const Icon(Icons.restaurant, color: AppColors.forestGreen),
                      ),
                    ),
                    const SizedBox(width: 12),

                    // Detail teks
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.product.name,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppColors.charcoal,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            Formatters.formatRupiah(item.product.sellingPrice),
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.forestGreen,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Subtotal: ${Formatters.formatRupiah(item.subtotal)}',
                            style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    ),

                    // Pengatur kuantitas
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline, color: AppColors.textMuted, size: 22),
                          onPressed: () => cart.updateQuantity(item.product.id, -1),
                        ),
                        Text(
                          '${item.quantity}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        IconButton(
                          icon: const Icon(Icons.add_circle_outline, color: AppColors.forestGreen, size: 22),
                          onPressed: item.quantity < item.product.stock
                              ? () => cart.updateQuantity(item.product.id, 1)
                              : null,
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
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
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total Belanja:',
                        style: TextStyle(fontSize: 14, color: AppColors.textMuted),
                      ),
                      Text(
                        Formatters.formatRupiah(cart.totalAmount),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.forestGreen,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  CustomButton(
                    text: 'Lanjut ke Pembayaran',
                    icon: Icons.payment,
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const CheckoutScreen()),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
