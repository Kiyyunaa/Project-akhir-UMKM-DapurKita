/// Model Biaya Pengeluaran Operasional (Admin)
class ExpenseModel {
  final int id;
  final String title;
  final String category; // raw_material, packaging, fuel, utility, other
  final double amount;
  final String? description;
  final String expenseDate;
  final String? createdByName;

  ExpenseModel({
    required this.id,
    required this.title,
    required this.category,
    required this.amount,
    this.description,
    required this.expenseDate,
    this.createdByName,
  });

  String get categoryDisplay {
    switch (category.toLowerCase()) {
      case 'raw_material':
        return 'Peralatan / Bahan';
      case 'packaging':
        return 'Kemasan / Plastik';
      case 'fuel':
        return 'Bensin / BBM';
      case 'utility':
        return 'Utilitas / Listrik & Air';
      case 'other':
      default:
        return 'Lainnya';
    }
  }

  factory ExpenseModel.fromJson(Map<String, dynamic> json) {
    return ExpenseModel(
      id: int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      title: json['title']?.toString() ?? '',
      category: json['category']?.toString() ?? 'other',
      amount: double.tryParse(json['amount']?.toString() ?? '0') ?? 0.0,
      description: json['description']?.toString(),
      expenseDate: json['expense_date']?.toString().split('T').first ?? '',
      createdByName: json['created_by_name']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'category': category,
      'amount': amount,
      'description': description,
      'expense_date': expenseDate,
    };
  }
}
