/// Model Produk / Menu Makanan
class ProductModel {
  final int id;
  final int categoryId;
  final String? categoryName;
  final String name;
  final String? description;
  final String? imageUrl;
  final double capitalPrice;
  final double sellingPrice;
  final int stock;
  final bool isAvailable;
  final String? createdAt;

  ProductModel({
    required this.id,
    required this.categoryId,
    this.categoryName,
    required this.name,
    this.description,
    this.imageUrl,
    required this.capitalPrice,
    required this.sellingPrice,
    required this.stock,
    required this.isAvailable,
    this.createdAt,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      categoryId: json['category_id'] is int
          ? json['category_id']
          : int.tryParse(json['category_id']?.toString() ?? '0') ?? 0,
      categoryName: json['category_name']?.toString(),
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString(),
      imageUrl: json['gambar_url']?.toString() ?? json['image_url']?.toString(),
      capitalPrice: double.tryParse(json['capital_price']?.toString() ?? '0') ?? 0.0,
      sellingPrice: double.tryParse(json['selling_price']?.toString() ?? '0') ?? 0.0,
      stock: int.tryParse(json['stock']?.toString() ?? '0') ?? 0,
      isAvailable: json['is_available'] == true ||
          json['is_available'] == 1 ||
          json['is_available']?.toString() == 'true' ||
          json['is_available']?.toString() == '1',
      createdAt: json['created_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'category_id': categoryId,
      'category_name': categoryName,
      'name': name,
      'description': description,
      'image_url': imageUrl,
      'capital_price': capitalPrice,
      'selling_price': sellingPrice,
      'stock': stock,
      'is_available': isAvailable,
      'created_at': createdAt,
    };
  }
}
