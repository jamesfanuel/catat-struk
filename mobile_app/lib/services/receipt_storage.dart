import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/receipt.dart';

class AppSettings {
  final String geminiApiKey;
  final int monthlyBudget;
  final bool darkMode;

  const AppSettings({
    this.geminiApiKey = '',
    this.monthlyBudget = 3000000,
    this.darkMode = false,
  });

  AppSettings copyWith({
    String? geminiApiKey,
    int? monthlyBudget,
    bool? darkMode,
  }) {
    return AppSettings(
      geminiApiKey: geminiApiKey ?? this.geminiApiKey,
      monthlyBudget: (monthlyBudget ?? this.monthlyBudget).clamp(0, 999999999),
      darkMode: darkMode ?? this.darkMode,
    );
  }
}

class ReceiptStorage {
  static const _txKey = 'catatstruk_mobile_txs_v1';
  static const _apiKey = 'catatstruk_mobile_gemini_key';
  static const _budgetKey = 'catatstruk_mobile_budget';
  static const _darkKey = 'catatstruk_mobile_dark';

  Future<List<ReceiptRecord>> loadReceipts() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_txKey);
    if (raw == null || raw.isEmpty) return [];
    final list = jsonDecode(raw) as List<dynamic>;
    return list
        .map((e) => ReceiptRecord.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<void> saveReceipts(List<ReceiptRecord> items) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = jsonEncode(items.map((e) => e.toJson()).toList());
    await prefs.setString(_txKey, encoded);
  }

  Future<AppSettings> loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    return AppSettings(
      geminiApiKey: prefs.getString(_apiKey) ?? '',
      monthlyBudget: (prefs.getInt(_budgetKey) ?? 3000000).clamp(0, 999999999),
      darkMode: prefs.getBool(_darkKey) ?? false,
    );
  }

  Future<void> saveSettings(AppSettings settings) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_apiKey, settings.geminiApiKey.trim());
    await prefs.setInt(_budgetKey, settings.monthlyBudget.clamp(0, 999999999));
    await prefs.setBool(_darkKey, settings.darkMode);
  }
}
