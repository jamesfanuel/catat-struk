import 'dart:convert';
import 'dart:io';
import 'dart:math';
import '../models/receipt.dart';

class ReceiptScanner {
  static String todayIso() {
    final now = DateTime.now();
    final m = now.month.toString().padLeft(2, '0');
    final d = now.day.toString().padLeft(2, '0');
    return '${now.year}-$m-$d';
  }

  /// Ekstrak data struk menggunakan Gemini Vision REST API (tanpa package tambahan).
  static Future<ReceiptRecord> extractWithGemini({
    required File imageFile,
    required String apiKey,
  }) async {
    final bytes = await imageFile.readAsBytes();
    final base64Image = base64Encode(bytes);
    final today = todayIso();

    final prompt = '''
Kamu adalah asisten pencatat keuangan Indonesia. Baca foto struk belanja ini dan kembalikan JSON valid persis dengan struktur berikut:
{
  "merchant": "nama toko",
  "date": "YYYY-MM-DD (gunakan $today jika tidak terbaca)",
  "category": "salah satu dari: Makanan & Minuman, Belanja, Transportasi, Tagihan, Kesehatan, Hiburan, Lainnya",
  "paymentMethod": "salah satu dari: QRIS, Tunai, Debit, Kredit, E-Wallet, Transfer",
  "total": 0,
  "items": [
    { "name": "nama item", "qty": 1, "price": 0 }
  ],
  "notes": "catatan singkat"
}
Pastikan total dan price adalah bilangan bulat Rupiah >= 0 tanpa titik/koma.
''';

    final uri = Uri.parse(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Uri.encodeComponent(apiKey.trim())}',
    );

    final client = HttpClient();
    try {
      final req = await client.postUrl(uri);
      req.headers.contentType = ContentType.json;
      req.write(jsonEncode({
        'contents': [
          {
            'parts': [
              {'text': prompt},
              {
                'inline_data': {
                  'mime_type': 'image/jpeg',
                  'data': base64Image,
                }
              }
            ]
          }
        ],
        'generationConfig': {
          'responseMimeType': 'application/json',
          'temperature': 0.1,
        }
      }));

      final res = await req.close();
      final body = await res.transform(utf8.decoder).join();
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw HttpException('Gemini API error (${res.statusCode})');
      }

      final decoded = jsonDecode(body) as Map<String, dynamic>;
      final rawText = decoded['candidates']?[0]?['content']?['parts']?[0]?['text'] as String?;
      if (rawText == null || rawText.isEmpty) {
        throw const FormatException('Respon AI kosong');
      }

      final parsed = jsonDecode(rawText) as Map<String, dynamic>;
      final rawItems = (parsed['items'] as List<dynamic>?) ?? [];
      final items = rawItems
          .map((e) => ReceiptItem.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();

      final rawDate = (parsed['date'] ?? '').toString();
      final validDate = RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(rawDate) ? rawDate : today;
      final cat = (parsed['category'] ?? '').toString();
      final pay = (parsed['paymentMethod'] ?? '').toString();

      return ReceiptRecord(
        id: 'cs_${DateTime.now().millisecondsSinceEpoch}',
        merchant: (parsed['merchant'] ?? 'Struk Belanja').toString(),
        date: validDate,
        category: kCategories.contains(cat) ? cat : 'Lainnya',
        paymentMethod: kPaymentMethods.contains(pay) ? pay : 'QRIS',
        total: ((parsed['total'] as num?)?.toInt() ?? 0).clamp(0, 999999999),
        items: items.isEmpty ? [ReceiptItem(name: '', qty: 1, price: 0)] : items,
        notes: (parsed['notes'] ?? '').toString(),
        imagePath: imageFile.path,
        createdAt: DateTime.now().millisecondsSinceEpoch,
      );
    } finally {
      client.close();
    }
  }

  /// Contoh struk untuk uji coba langsung tanpa API Key.
  static ReceiptRecord generateDemoReceipt() {
    final samples = [
      ReceiptRecord(
        id: '',
        merchant: 'Indomaret Point',
        date: todayIso(),
        category: 'Belanja',
        paymentMethod: 'QRIS',
        total: 60500,
        items: [
          ReceiptItem(name: 'Air Mineral 1.5L', qty: 2, price: 12000),
          ReceiptItem(name: 'Roti Tawar Gandum', qty: 1, price: 19000),
          ReceiptItem(name: 'Sabun Cuci Cair', qty: 1, price: 29500),
        ],
        notes: 'Belanja harian',
        createdAt: DateTime.now().millisecondsSinceEpoch,
      ),
      ReceiptRecord(
        id: '',
        merchant: 'Kopi Kenangan',
        date: todayIso(),
        category: 'Makanan & Minuman',
        paymentMethod: 'QRIS',
        total: 42000,
        items: [
          ReceiptItem(name: 'Kopi Kenangan Mantan', qty: 1, price: 24000),
          ReceiptItem(name: 'Roti Coklat Klasik', qty: 1, price: 18000),
        ],
        notes: 'Ngopi sore',
        createdAt: DateTime.now().millisecondsSinceEpoch,
      ),
      ReceiptRecord(
        id: '',
        merchant: 'Apotek K-24',
        date: todayIso(),
        category: 'Kesehatan',
        paymentMethod: 'Tunai',
        total: 54000,
        items: [
          ReceiptItem(name: 'Vitamin C 500mg', qty: 1, price: 32000),
          ReceiptItem(name: 'Plester Luka Box', qty: 1, price: 22000),
        ],
        notes: 'Stok obat rumah',
        createdAt: DateTime.now().millisecondsSinceEpoch,
      ),
    ];
    return samples[Random().nextInt(samples.length)];
  }
}
