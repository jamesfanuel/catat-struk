import 'package:flutter/services.dart';

String formatNumberId(int value) {
  final safe = value < 0 ? 0 : value;
  final str = safe.toString();
  final buf = StringBuffer();
  for (int i = 0; i < str.length; i++) {
    final posFromRight = str.length - i;
    buf.write(str[i]);
    if (posFromRight > 1 && posFromRight % 3 == 1) {
      buf.write('.');
    }
  }
  return buf.toString();
}

String formatRupiah(int value) => 'Rp ${formatNumberId(value)}';

int parseRupiahText(String text) {
  final digits = text.replaceAll(RegExp(r'[^0-9]'), '');
  if (digits.isEmpty) return 0;
  final parsed = int.tryParse(digits) ?? 0;
  return parsed < 0 ? 0 : parsed;
}

String formatDateId(String isoDate) {
  final parts = isoDate.split('-');
  if (parts.length != 3) return isoDate;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];
  final y = parts[0];
  final m = int.tryParse(parts[1]) ?? 1;
  final d = int.tryParse(parts[2]) ?? 1;
  final mName = months[(m - 1).clamp(0, 11)];
  return '$d $mName $y';
}

/// Formatter angka Rupiah otomatis dengan pemisah ribuan (.) dan anti-minus.
class RupiahInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.isEmpty) {
      return const TextEditingValue(
        text: '',
        selection: TextSelection.collapsed(offset: 0),
      );
    }
    final parsed = int.tryParse(digits) ?? 0;
    final formatted = formatNumberId(parsed);
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}
