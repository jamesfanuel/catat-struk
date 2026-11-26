import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/receipt.dart';
import '../services/receipt_scanner.dart';
import '../utils/rupiah_formatter.dart';

class _ItemControllers {
  final TextEditingController name;
  final TextEditingController qty;
  final TextEditingController price;

  _ItemControllers(ReceiptItem item)
      : name = TextEditingController(text: item.name),
        qty = TextEditingController(text: (item.qty < 1 ? 1 : item.qty).toString()),
        price = TextEditingController(
          text: item.price > 0 ? formatNumberId(item.price) : '',
        );

  void dispose() {
    name.dispose();
    qty.dispose();
    price.dispose();
  }
}

class ReceiptFormScreen extends StatefulWidget {
  final ReceiptRecord? initial;
  final bool isEditing;

  const ReceiptFormScreen({
    super.key,
    this.initial,
    this.isEditing = false,
  });

  @override
  State<ReceiptFormScreen> createState() => _ReceiptFormScreenState();
}

class _ReceiptFormScreenState extends State<ReceiptFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _merchantCtrl;
  late final TextEditingController _totalCtrl;
  late final TextEditingController _notesCtrl;
  late String _date;
  late String _category;
  late String _paymentMethod;
  late String _imagePath;
  final List<_ItemControllers> _itemCtrls = [];

  @override
  void initState() {
    super.initState();
    final init = widget.initial;
    _merchantCtrl = TextEditingController(text: init?.merchant ?? '');
    _totalCtrl = TextEditingController(
      text: (init != null && init.total > 0) ? formatNumberId(init.total) : '',
    );
    _notesCtrl = TextEditingController(text: init?.notes ?? '');
    _date = (init?.date.isNotEmpty ?? false) ? init!.date : ReceiptScanner.todayIso();
    _category = kCategories.contains(init?.category) ? init!.category : 'Makanan & Minuman';
    _paymentMethod = kPaymentMethods.contains(init?.paymentMethod) ? init!.paymentMethod : 'QRIS';
    _imagePath = init?.imagePath ?? '';

    final items = (init != null && init.items.isNotEmpty)
        ? init.items
        : [ReceiptItem(name: '', qty: 1, price: 0)];
    for (final item in items) {
      _itemCtrls.add(_ItemControllers(item));
    }
  }

  @override
  void dispose() {
    _merchantCtrl.dispose();
    _totalCtrl.dispose();
    _notesCtrl.dispose();
    for (final c in _itemCtrls) {
      c.dispose();
    }
    super.dispose();
  }

  int get _itemsSubtotal {
    int sum = 0;
    for (final c in _itemCtrls) {
      sum += parseRupiahText(c.price.text);
    }
    return sum;
  }

  void _addItemRow() {
    setState(() {
      _itemCtrls.add(_ItemControllers(ReceiptItem(name: '', qty: 1, price: 0)));
    });
  }

  void _removeItemRow(int index) {
    setState(() {
      final removed = _itemCtrls.removeAt(index);
      removed.dispose();
      if (_itemCtrls.isEmpty) {
        _itemCtrls.add(_ItemControllers(ReceiptItem(name: '', qty: 1, price: 0)));
      }
    });
  }

  Future<void> _pickDate() async {
    final parsed = DateTime.tryParse(_date) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: parsed,
      firstDate: DateTime(2020),
      lastDate: DateTime(2035),
    );
    if (picked != null) {
      final m = picked.month.toString().padLeft(2, '0');
      final d = picked.day.toString().padLeft(2, '0');
      setState(() => _date = '${picked.year}-$m-$d');
    }
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;

    final items = <ReceiptItem>[];
    for (final c in _itemCtrls) {
      final name = c.name.text.trim();
      final qty = (int.tryParse(c.qty.text.trim()) ?? 1).clamp(1, 9999);
      final price = parseRupiahText(c.price.text);
      if (name.isNotEmpty || price > 0) {
        items.add(ReceiptItem(
          name: name.isEmpty ? 'Item Belanja' : name,
          qty: qty,
          price: price,
        ));
      }
    }

    final enteredTotal = parseRupiahText(_totalCtrl.text);
    final finalTotal = enteredTotal > 0 ? enteredTotal : _itemsSubtotal;

    final record = ReceiptRecord(
      id: (widget.isEditing && (widget.initial?.id.isNotEmpty ?? false))
          ? widget.initial!.id
          : 'cs_${DateTime.now().millisecondsSinceEpoch}',
      merchant: _merchantCtrl.text.trim(),
      date: _date,
      category: _category,
      paymentMethod: _paymentMethod,
      total: finalTotal < 0 ? 0 : finalTotal,
      items: items,
      notes: _notesCtrl.text.trim(),
      imagePath: _imagePath,
      createdAt: widget.isEditing
          ? (widget.initial?.createdAt ?? DateTime.now().millisecondsSinceEpoch)
          : DateTime.now().millisecondsSinceEpoch,
    );

    Navigator.pop(context, record);
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final subtotal = _itemsSubtotal;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isEditing ? 'Edit Detail Struk' : 'Konfirmasi Struk'),
        actions: [
          if (widget.isEditing)
            IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.red),
              tooltip: 'Hapus Struk',
              onPressed: () => Navigator.pop(context, 'DELETE'),
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
          children: [
            if (_imagePath.isNotEmpty && File(_imagePath).existsSync()) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.file(
                  File(_imagePath),
                  height: 180,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(height: 16),
            ],
            TextFormField(
              controller: _merchantCtrl,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              decoration: const InputDecoration(
                labelText: 'Nama Toko / Merchant',
                hintText: 'Contoh: Indomaret, Kopi Kenangan',
                prefixIcon: Icon(Icons.storefront_outlined),
              ),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Nama toko wajib diisi' : null,
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: _pickDate,
                    borderRadius: BorderRadius.circular(12),
                    child: InputDecorator(
                      decoration: const InputDecoration(
                        labelText: 'Tanggal',
                        prefixIcon: Icon(Icons.calendar_today_outlined),
                      ),
                      child: Text(
                        formatDateId(_date),
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _paymentMethod,
                    decoration: const InputDecoration(labelText: 'Metode Bayar'),
                    items: kPaymentMethods
                        .map((m) => DropdownMenuItem(value: m, child: Text(m)))
                        .toList(),
                    onChanged: (v) {
                      if (v != null) setState(() => _paymentMethod = v);
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              value: _category,
              decoration: const InputDecoration(
                labelText: 'Kategori',
                prefixIcon: Icon(Icons.category_outlined),
              ),
              items: kCategories
                  .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                  .toList(),
              onChanged: (v) {
                if (v != null) setState(() => _category = v);
              },
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _totalCtrl,
              keyboardType: TextInputType.number,
              inputFormatters: [RupiahInputFormatter()],
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              decoration: const InputDecoration(
                labelText: 'Total Pembayaran',
                prefixText: 'Rp ',
                hintText: '50.000',
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 20),

            // Daftar Item Header + Tombol (+)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Daftar Item',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
                Row(
                  children: [
                    if (subtotal > 0)
                      ActionChip(
                        label: Text('Subtotal: ${formatRupiah(subtotal)}'),
                        onPressed: () {
                          setState(() {
                            _totalCtrl.text = formatNumberId(subtotal);
                          });
                        },
                      ),
                    const SizedBox(width: 8),
                    FilledButton.tonalIcon(
                      onPressed: _addItemRow,
                      icon: const Icon(Icons.add, size: 20),
                      label: const Text('Tambah'),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Item Rows
            ...List.generate(_itemCtrls.length, (i) {
              final ctrl = _itemCtrls[i];
              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                elevation: 0,
                color: cs.surfaceContainerHighest.withValues(alpha: 0.45),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: BorderSide(color: cs.outlineVariant),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: ctrl.name,
                              style: const TextStyle(fontSize: 16),
                              decoration: const InputDecoration(
                                labelText: 'Nama Item',
                                hintText: 'Contoh: Kopi Susu',
                                isDense: true,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            onPressed: () => _removeItemRow(i),
                            icon: const Icon(Icons.close, color: Colors.redAccent),
                            tooltip: 'Hapus item',
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          SizedBox(
                            width: 92,
                            child: TextFormField(
                              controller: ctrl.qty,
                              keyboardType: TextInputType.number,
                              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                              textAlign: TextAlign.center,
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                              decoration: const InputDecoration(
                                labelText: 'Qty',
                                isDense: true,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: ctrl.price,
                              keyboardType: TextInputType.number,
                              inputFormatters: [RupiahInputFormatter()],
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                              decoration: const InputDecoration(
                                labelText: 'Harga',
                                prefixText: 'Rp ',
                                hintText: '0',
                                isDense: true,
                              ),
                              onChanged: (_) => setState(() {}),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }),

            const SizedBox(height: 10),
            TextFormField(
              controller: _notesCtrl,
              style: const TextStyle(fontSize: 16),
              decoration: const InputDecoration(
                labelText: 'Catatan (Opsional)',
                hintText: 'Misal: Belanja bulanan dapur',
                prefixIcon: Icon(Icons.note_alt_outlined),
              ),
            ),
          ],
        ),
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
              'Simpan Catatan Struk',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
          ),
        ),
      ),
    );
  }
}
