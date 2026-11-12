import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../core/models.dart';
import '../core/theme.dart';
import '../state/pos_controller.dart';
import '../widgets/common.dart';

class InventoryScreen extends StatefulWidget {
  final PosController controller;
  const InventoryScreen({super.key, required this.controller});
  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  final search = TextEditingController();
  bool onlyLow = false;
  @override
  void dispose() {search.dispose(); super.dispose();}

  @override
  Widget build(BuildContext context) {
    final ctrl = widget.controller;
    final low = ctrl.products.where((p) => p.stock <= p.minimumStock).length;
    final query = search.text.toLowerCase().trim();
    final products = ctrl.products.where((p) =>
      (!onlyLow || p.stock <= p.minimumStock) &&
      (query.isEmpty || p.name.toLowerCase().contains(query) ||
        p.sku.toLowerCase().contains(query) || p.barcode.contains(query))).toList();
    return Padding(padding: const EdgeInsets.all(20), child: Column(
      crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Expanded(child: SectionLabel('Stok Produk',
            caption: 'Stok lokal tablet. Pengelolaan stok utama dilakukan melalui Web Admin.')),
          OutlinedButton.icon(onPressed: ctrl.demo ? null : () async {
            try {await ctrl.refreshCatalog();}
            catch (e) {if (context.mounted) showError(context, e);}
          }, icon: const Icon(Icons.sync), label: const Text('Muat dari Laravel')),
        ]),
        const SizedBox(height: 16),
        Wrap(spacing: 8, runSpacing: 8, children: [
          Chip(label: Text('${ctrl.products.length} produk mandiri')),
          ChoiceChip(label: Text('$low stok menipis / habis'),
            selected: onlyLow, onSelected: (value) => setState(() => onlyLow = value)),
        ]),
        const SizedBox(height: 12),
        SizedBox(height: 46, child: TextField(
          controller: search, onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(prefixIcon: Icon(Icons.search),
            hintText: 'Cari nama, SKU atau barcode'),
        )),
        const SizedBox(height: 12),
        Expanded(child: Container(
          decoration: BoxDecoration(color: Colors.white,
            border: Border.all(color: KukiColors.line),
            borderRadius: BorderRadius.circular(12)),
          child: LayoutBuilder(builder: (_, box) => SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SizedBox(width: math.max(box.maxWidth, 800.0), height: box.maxHeight,
              child: Column(children: [
                Container(height: 44, padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: const BoxDecoration(color: KukiColors.cream,
                    borderRadius: BorderRadius.vertical(top: Radius.circular(11))),
                  child: const Row(children: [
                    SizedBox(width: 155, child: Text('SKU')),
                    Expanded(child: Text('PRODUK')),
                    SizedBox(width: 125, child: Text('KATEGORI')),
                    SizedBox(width: 90, child: Text('STOK')),
                    SizedBox(width: 130, child: Text('HARGA')),
                  ])),
                Expanded(child: products.isEmpty
                  ? const Center(child: Text('Tidak ada produk untuk filter ini.'))
                  : ListView.separated(
                    itemCount: products.length,
                    separatorBuilder: (_, _) => const Divider(height: 1, color: KukiColors.line),
                    itemBuilder: (_, i) {
                      final p = products[i];
                      final isLow = p.stock <= p.minimumStock;
                      return SizedBox(height: 54,
                        child: Padding(padding: const EdgeInsets.symmetric(horizontal: 14),
                          child: Row(children: [
                            SizedBox(width: 155, child: Text(p.sku.isEmpty ? '-' : p.sku,
                              style: const TextStyle(fontSize: 12))),
                            Expanded(child: Text(p.name, style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 12))),
                            SizedBox(width: 125, child: Text(p.categoryName,
                              style: const TextStyle(fontSize: 12))),
                            SizedBox(width: 90, child: Text('${p.stock}', style: TextStyle(
                              color: isLow ? Colors.deepOrange : KukiColors.cocoa,
                              fontWeight: FontWeight.w700, fontSize: 12))),
                            SizedBox(width: 130, child: Text(money(p.price),
                              style: const TextStyle(fontSize: 12))),
                          ]),
                        ),
                      );
                    },
                  )),
              ]),
            ),
          )),
        )),
        const SizedBox(height: 10),
        const Text('Setiap rasa/ukuran adalah produk mandiri dalam kategori; '
          'tidak ada tabel produk varian.',
          style: TextStyle(fontSize: 11, color: KukiColors.muted)),
      ],
    ));
  }
}
