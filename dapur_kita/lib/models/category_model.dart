/// Model Kategori Makanan
class CategoryModel {
  final int id;
  final String name;
  final String? description;
  final String? createdAt;

  CategoryModel({
    required this.id,
    required this.name,
    this.description,
    this.createdAt,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString(),
      createdAt: json['created_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'created_at': createdAt,
    };
  }
}
