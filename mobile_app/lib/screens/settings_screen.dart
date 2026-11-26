import 'package:flutter/material.dart';
import '../services/receipt_storage.dart';
import '../utils/rupiah_formatter.dart';

class SettingsScreen extends StatefulWidget {
  final AppSettings initialSettings;
  final VoidCallback onClearAllData;

  const SettingsScreen({
    super.key,
    required this.initialSettings,
    required this.onClearAllData,
  });

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final TextEditingController _apiKeyCtrl;
  late final TextEditingController _budgetCtrl;
  late bool _darkMode;

  @override
  void initState() {
    super.initState();
    _apiKeyCtrl = TextEditingController(text: widget.initialSettings.geminiApiKey);
    _budgetCtrl = TextEditingController(
      text: widget.initialSettings.monthlyBudget > 0
          ? formatNumberId(widget.initialSettings.monthlyBudget)
          : '',
    );
    _darkMode = widget.initialSettings.darkMode;
  }

  @override
  void dispose() {
    _apiKeyCtrl.dispose();
    _budgetCtrl.dispose();
    super.dispose();
  }

  void _save() {
    final updated = AppSettings(
      geminiApiKey: _apiKeyCtrl.text.trim(),
      monthlyBudget: parseRupiahText(_budgetCtrl.text),
      darkMode: _darkMode,
    );
    Navigator.pop(context, updated);
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Pengaturan')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Scan Struk Otomatis (AI)',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            'Masukkan Gemini API Key gratis agar foto struk langsung terbaca otomatis. Jika kosong, Anda tetap bisa catat manual atau pakai Mode Contoh.',
            style: TextStyle(fontSize: 14, color: cs.onSurfaceVariant),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _apiKeyCtrl,
            obscureText: true,
            style: const TextStyle(fontSize: 16),
            decoration: const InputDecoration(
              labelText: 'Gemini API Key (Opsional)',
              hintText: 'AIzaSy...',
              prefixIcon: Icon(Icons.key_outlined),
            ),
          ),
          const SizedBox(height: 22),
          const Text(
            'Target Budget & Tampilan',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _budgetCtrl,
            keyboardType: TextInputType.number,
            inputFormatters: [RupiahInputFormatter()],
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            decoration: const InputDecoration(
              labelText: 'Target Budget Bulanan',
              prefixText: 'Rp ',
              hintText: '3.000.000',
            ),
          ),
          const SizedBox(height: 12),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Mode Gelap (Dark Mode)', style: TextStyle(fontSize: 16)),
            value: _darkMode,
            onChanged: (v) => setState(() => _darkMode = v),
          ),
          const Divider(height: 28),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: cs.primaryContainer.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                Icon(Icons.table_chart_outlined, color: cs.primary),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Koneksi Google Sheet',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Segera hadir di update berikutnya! Saat ini semua catatan tersimpan aman di HP Anda.',
                        style: TextStyle(fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: () async {
              final ok = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Hapus Semua Data?'),
                  content: const Text('Seluruh catatan struk di HP ini akan dihapus permanen.'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
                    FilledButton(
                      style: FilledButton.styleFrom(backgroundColor: Colors.red),
                      onPressed: () => Navigator.pop(ctx, true),
                      child: const Text('Hapus'),
                    ),
                  ],
                ),
              );
              if (ok == true) {
                widget.onClearAllData();
                if (context.mounted) Navigator.pop(context);
              }
            },
            icon: const Icon(Icons.delete_forever_outlined, color: Colors.red),
            label: const Text('Hapus Semua Catatan Lokal', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: FilledButton(
            onPressed: _save,
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(54),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: const Text(
              'Simpan Pengaturan',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
          ),
        ),
      ),
    );
  }
}
