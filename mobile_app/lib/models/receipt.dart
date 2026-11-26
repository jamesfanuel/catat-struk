class ReceiptItem {
  String name;
  int qty;
  int price;

  ReceiptItem({
    required this.name,
    this.qty = 1,
    this.price = 0,
  });

  factory ReceiptItem.fromJson(Map<String, dynamic> json) {
    return ReceiptItem(
      name: (json['name'] ?? '').toString(),
      qty: ((json['qty'] as num?)?.toInt() ?? 1).clamp(1, 9999),
      price: ((json['price'] as num?)?.toInt() ?? 0).clamp(0, 999999999),
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'qty': qty < 1 ? 1 : qty,
        'price': price < 0 ? 0 : price,
      };
}

class ReceiptRecord {
  final String id;
  final String merchant;
  final String date; // YYYY-MM-DD
  final String category;
  final String paymentMethod;
  final int total;
  final List<ReceiptItem> items;
  final String notes;
  final String imagePath;
  final int createdAt;

  ReceiptRecord({
    required this.id,
    required this.merchant,
    required this.date,
    required this.category,
    required this.paymentMethod,
    required this.total,
    required this.items,
    this.notes = '',
    this.imagePath = '',
    required this.createdAt,
  });

  factory ReceiptRecord.fromJson(Map<String, dynamic> json) {
    final rawItems = (json['items'] as List<dynamic>?) ?? [];
    return ReceiptRecord(
      id: (json['id'] ?? '').toString(),
      merchant: (json['merchant'] ?? 'Struk Belanja').toString(),
      date: (json['date'] ?? '').toString(),
      category: (json['category'] ?? 'Lainnya').toString(),
      paymentMethod: (json['paymentMethod'] ?? 'QRIS').toString(),
      total: ((json['total'] as num?)?.toInt() ?? 0).clamp(0, 999999999),
      items: rawItems
          .map((e) => ReceiptItem.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      notes: (json['notes'] ?? '').toString(),
      imagePath: (json['imagePath'] ?? '').toString(),
      createdAt: (json['createdAt'] as num?)?.toInt() ??
          DateTime.now().millisecondsSinceEpoch,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'merchant': merchant,
        'date': date,
        'category': category,
        'paymentMethod': paymentMethod,
        'total': total < 0 ? 0 : total,
        'items': items.map((e) => e.toJson()).toList(),
        'notes': notes,
        'imagePath': imagePath,
        'createdAt': createdAt,
      };
}

const List<String> kCategories = [
  'Makanan & Minuman',
  'Belanja',
  'Transportasi',
  'Tagihan',
  'Kesehatan',
  'Hiburan',
  'Lainnya',
];

const List<String> kPaymentMethods = [
  'QRIS',
  'Tunai',
  'Debit',
  'Kredit',
  'E-Wallet',
  'Transfer',
];
