/// Model Notifikasi (User & Admin)
class NotificationModel {
  final int id;
  final int? userId;
  final int? orderId;
  final String title;
  final String message;
  final String type;
  final String role;
  final bool isRead;
  final String? createdAt;

  NotificationModel({
    required this.id,
    this.userId,
    this.orderId,
    required this.title,
    required this.message,
    required this.type,
    required this.role,
    required this.isRead,
    this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      userId: int.tryParse(json['user_id']?.toString() ?? ''),
      orderId: int.tryParse(json['order_id']?.toString() ?? ''),
      title: json['title']?.toString() ?? '',
      message: json['message']?.toString() ?? '',
      type: json['type']?.toString() ?? 'info',
      role: json['role']?.toString() ?? 'all',
      isRead: json['is_read'] == true || json['is_read'] == 1 || json['is_read']?.toString() == '1',
      createdAt: json['created_at']?.toString(),
    );
  }
}
