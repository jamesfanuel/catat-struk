import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../models/receipt.dart';
import '../services/receipt_scanner.dart';
import '../services/receipt_storage.dart';
import '../utils/rupiah_formatter.dart';
import 'receipt_form_screen.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  final AppSettings settings;
  final ValueChanged<AppSettings> onSettingsChanged;

  const HomeScreen({
    super.key,
    required this.settings,
    required this.onSettingsChanged,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _storage = ReceiptStorage();
  final _picker = ImagePicker();
  final _scrollCtrl = ScrollController();
  final _historyKey = GlobalKey();

  List<ReceiptRecord> _receipts = [];
  String _selectedMonth = _currentMonth();
  String _categoryFilter = 'all';
  String _searchQuery = '';
  bool _scanning = false;

  static String _currentMonth() {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}';
  }

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    final list = await _storage.loadReceipts();
    if (!mounted) return;
    setState(() => _receipts = list);
  }

  Future<void> _saveData() async {
    await _storage.saveReceipts(_receipts);
  }

  List<String> get _availableMonths {
    final set = <String>{_currentMonth()};
    for (final r in _receipts) {
      if (r.date.length >= 7) set.add(r.date.substring(0, 7));
    }
    final list = set.toList()..sort((a, b) => b.compareTo(a));
    return list;
  }

  String _monthLabel(String ym) {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    final parts = ym.split('-');
    if (parts.length != 2) return ym;
    final m = (int.tryParse(parts[1]) ?? 1).clamp(1, 12);
    return '${months[m - 1]} ${parts[0]}';
  }

  Future<void> _captureOrPick(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(
        source: source,
        maxWidth: 1280,
        imageQuality: 82,
      );
      if (picked == null) return;

      final file = File(picked.path);
      ReceiptRecord draft;

      if (widget.settings.geminiApiKey.trim().isNotEmpty) {
        setState(() => _scanning = true);
        try {
          draft = await ReceiptScanner.extractWithGemini(
            imageFile: file,
            apiKey: widget.settings.geminiApiKey,
          );
        } catch (e) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('AI tidak dapat membaca otomatis ($e). Silakan isi manual.')),
            );
          }
          draft = ReceiptRecord(
            id: '',
            merchant: '',
            date: ReceiptScanner.todayIso(),
            category: 'Belanja',
            paymentMethod: 'QRIS',
            total: 0,
            items: [ReceiptItem(name: '', qty: 1, price: 0)],
            imagePath: file.path,
            createdAt: DateTime.now().millisecondsSinceEpoch,
          );
        } finally {
          if (mounted) setState(() => _scanning = false);
        }
      } else {
        draft = ReceiptRecord(
          id: '',
          merchant: '',
          date: ReceiptScanner.todayIso(),
          category: 'Belanja',
          paymentMethod: 'QRIS',
          total: 0,
          items: [ReceiptItem(name: '', qty: 1, price: 0)],
          imagePath: file.path,
          createdAt: DateTime.now().millisecondsSinceEpoch,
        );
      }

      if (!mounted) return;
      await _openForm(draft: draft, isEditing: false);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal membuka kamera/galeri: $e')),
      );
    }
  }

  Future<void> _runDemoScan() async {
    setState(() => _scanning = true);
    await Future<void>.delayed(const Duration(milliseconds: 750));
    if (!mounted) return;
    setState(() => _scanning = false);
    await _openForm(draft: ReceiptScanner.generateDemoReceipt(), isEditing: false);
  }

  Future<void> _openForm({ReceiptRecord? draft, required bool isEditing}) async {
    final result = await Navigator.push<Object?>(
      context,
      MaterialPageRoute(
        builder: (_) => ReceiptFormScreen(initial: draft, isEditing: isEditing),
      ),
    );

    if (result == 'DELETE' && draft != null) {
      setState(() => _receipts.removeWhere((r) => r.id == draft.id));
      await _saveData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Catatan struk dihapus.')),
        );
      }
      return;
    }

    if (result is ReceiptRecord) {
      setState(() {
        if (isEditing) {
          final idx = _receipts.indexWhere((r) => r.id == result.id);
          if (idx != -1) _receipts[idx] = result;
        } else {
          _receipts.insert(0, result);
          if (result.date.length >= 7) _selectedMonth = result.date.substring(0, 7);
        }
      });
      await _saveData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Struk berhasil dicatat!')),
        );
      }
    }
  }

  Future<void> _openSettings() async {
    final updated = await Navigator.push<AppSettings>(
      context,
      MaterialPageRoute(
        builder: (_) => SettingsScreen(
          initialSettings: widget.settings,
          onClearAllData: () async {
            setState(() => _receipts = []);
            await _saveData();
          },
        ),
      ),
    );
    if (updated != null) {
      widget.onSettingsChanged(updated);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final months = _availableMonths;
    if (!months.contains(_selectedMonth)) _selectedMonth = months.first;

    final monthTxs = _receipts.where((r) => r.date.startsWith(_selectedMonth)).toList();
    final totalMonth = monthTxs.fold<int>(0, (sum, r) => sum + r.total);
    final avgMonth = monthTxs.isEmpty ? 0 : (totalMonth ~/ monthTxs.length);
    final budget = widget.settings.monthlyBudget;
    final budgetPct = budget > 0 ? ((totalMonth / budget) * 100).round() : 0;

    final filtered = monthTxs.where((r) {
      if (_categoryFilter != 'all' && r.category != _categoryFilter) return false;
      final q = _searchQuery.trim().toLowerCase();
      if (q.isEmpty) return true;
      final itemText = r.items.map((i) => i.name).join(' ').toLowerCase();
      return r.merchant.toLowerCase().contains(q) ||
          itemText.contains(q) ||
          r.notes.toLowerCase().contains(q);
    }).toList()
      ..sort((a, b) {
        final d = b.date.compareTo(a.date);
        return d != 0 ? d : b.createdAt.compareTo(a.createdAt);
      });

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: cs.primary,
                borderRadius: BorderRadius.circular(11),
              ),
              child: const Icon(Icons.receipt_long, color: Colors.white, size: 22),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('CatatStruk', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                Text('Catat Belanja dari Foto Struk', style: TextStyle(fontSize: 12)),
              ],
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: ActionChip(
              avatar: Icon(
                widget.settings.geminiApiKey.isNotEmpty ? Icons.auto_awesome : Icons.touch_app_outlined,
                size: 16,
                color: cs.primary,
              ),
              label: Text(
                widget.settings.geminiApiKey.isNotEmpty ? 'AI Aktif' : 'Mode Coba',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
              ),
              onPressed: _openSettings,
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          ListView(
            controller: _scrollCtrl,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
            children: [
              // Summary Hero Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0F766E), Color(0xFF0D9488), Color(0xFF047857)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(22),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0D9488).withValues(alpha: 0.28),
                      blurRadius: 18,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Pengeluaran Bulan Ini',
                          style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w500),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.18),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _selectedMonth,
                              dropdownColor: const Color(0xFF0F766E),
                              iconEnabledColor: Colors.white,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13),
                              items: months
                                  .map((m) => DropdownMenuItem(value: m, child: Text(_monthLabel(m))))
                                  .toList(),
                              onChanged: (v) {
                                if (v != null) setState(() => _selectedMonth = v);
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      formatRupiah(totalMonth),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 30,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if (budget > 0) ...[
                      const SizedBox(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Target Budget: ${formatRupiah(budget)}',
                            style: const TextStyle(color: Colors.white, fontSize: 13),
                          ),
                          Text(
                            '$budgetPct%',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: LinearProgressIndicator(
                          value: (totalMonth / budget).clamp(0.0, 1.0),
                          minHeight: 8,
                          backgroundColor: Colors.white24,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            budgetPct >= 100
                                ? const Color(0xFFF87171)
                                : budgetPct >= 80
                                    ? const Color(0xFFFBBF24)
                                    : const Color(0xFF34D399),
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 14),
                    const Divider(color: Colors.white24, height: 1),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Total Struk', style: TextStyle(color: Colors.white70, fontSize: 12)),
                              Text(
                                '${monthTxs.length}',
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Rata-rata / Struk', style: TextStyle(color: Colors.white70, fontSize: 12)),
                              Text(
                                formatRupiah(avgMonth),
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Scan Action Card
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                  side: BorderSide(color: cs.outlineVariant),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Catat Pengeluaran Baru',
                        style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Foto struk belanja atau pilih gambar dari galeri.',
                        style: TextStyle(fontSize: 14, color: cs.onSurfaceVariant),
                      ),
                      const SizedBox(height: 14),
                      FilledButton.icon(
                        onPressed: () => _captureOrPick(ImageSource.camera),
                        icon: const Icon(Icons.camera_alt_outlined, size: 24),
                        label: const Text(
                          'Foto Struk Belanja',
                          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                        ),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(56),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => _captureOrPick(ImageSource.gallery),
                              icon: const Icon(Icons.photo_library_outlined, size: 20),
                              label: const Text('Pilih Galeri', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                              style: OutlinedButton.styleFrom(
                                minimumSize: const Size.fromHeight(48),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => _openForm(isEditing: false),
                              icon: const Icon(Icons.edit_note_outlined, size: 22),
                              label: const Text('Catat Manual', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                              style: OutlinedButton.styleFrom(
                                minimumSize: const Size.fromHeight(48),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Center(
                        child: TextButton(
                          onPressed: _runDemoScan,
                          child: const Text(
                            'Belum pegang struk? Coba Scan Struk Contoh ->',
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // History Section
              Container(
                key: _historyKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Riwayat Struk',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                        ),
                        DropdownButton<String>(
                          value: _categoryFilter,
                          borderRadius: BorderRadius.circular(12),
                          items: [
                            const DropdownMenuItem(value: 'all', child: Text('Semua Kategori')),
                            ...kCategories.map((c) => DropdownMenuItem(value: c, child: Text(c))),
                          ],
                          onChanged: (v) {
                            if (v != null) setState(() => _categoryFilter = v);
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      style: const TextStyle(fontSize: 16),
                      decoration: InputDecoration(
                        hintText: 'Cari nama toko atau item...',
                        prefixIcon: const Icon(Icons.search),
                        filled: true,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide.none,
                        ),
                      ),
                      onChanged: (v) => setState(() => _searchQuery = v),
                    ),
                    const SizedBox(height: 12),
                    if (filtered.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 28),
                        child: Center(
                          child: Column(
                            children: [
                              Icon(Icons.receipt_long_outlined, size: 48, color: cs.onSurfaceVariant),
                              const SizedBox(height: 8),
                              const Text(
                                'Belum ada catatan struk di bulan ini.',
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Tekan tombol Foto Struk Belanja di atas untuk mulai.',
                                style: TextStyle(fontSize: 13, color: cs.onSurfaceVariant),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      ...filtered.map((tx) {
                        final itemSummary = tx.items.isNotEmpty
                            ? '${tx.items.length} item: ${tx.items.take(2).map((i) => i.name).join(', ')}${tx.items.length > 2 ? ', ...' : ''}'
                            : (tx.notes.isNotEmpty ? tx.notes : 'Ketuk untuk lihat rincian');
                        return Card(
                          elevation: 0,
                          margin: const EdgeInsets.only(bottom: 10),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                            side: BorderSide(color: cs.outlineVariant),
                          ),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: () => _openForm(draft: tx, isEditing: true),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      CircleAvatar(
                                        backgroundColor: cs.primaryContainer,
                                        child: Icon(Icons.receipt_outlined, color: cs.primary),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              tx.merchant,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              itemSummary,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: TextStyle(fontSize: 13, color: cs.onSurfaceVariant),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        formatRupiah(tx.total),
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w800,
                                          color: cs.primary,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),
                                  Wrap(
                                    spacing: 6,
                                    runSpacing: 6,
                                    children: [
                                      _infoChip(formatDateId(tx.date), cs),
                                      _infoChip(tx.category, cs),
                                      _infoChip('Bayar: ${tx.paymentMethod}', cs, bold: true),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }),
                  ],
                ),
              ),
            ],
          ),
          if (_scanning)
            Container(
              color: Colors.black54,
              child: const Center(
                child: Card(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 16),
                        Text(
                          'Membaca Struk Belanja...',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: 0,
        onDestinationSelected: (idx) {
          if (idx == 0) {
            _scrollCtrl.animateTo(0, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
          } else if (idx == 1) {
            _captureOrPick(ImageSource.camera);
          } else if (idx == 2) {
            _openSettings();
          }
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Beranda'),
          NavigationDestination(icon: Icon(Icons.camera_alt), label: 'Foto Struk'),
          NavigationDestination(icon: Icon(Icons.settings_outlined), label: 'Pengaturan'),
        ],
      ),
    );
  }

  Widget _infoChip(String label, ColorScheme cs, {bool bold = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
        ),
      ),
    );
  }
}
