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
    return Padding(
      padding: KukiSpace.all(context),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LayoutBuilder(
            builder: (context, constraints) => Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: KukiSpace.normal(context),
              runSpacing: KukiSpace.tight(context),
              children: [
                ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: constraints.maxWidth),
                  child: const SectionLabel(
                    'Stok Produk',
                    caption:
                        'Stok lokal tablet. Pengelolaan stok utama dilakukan melalui Web Admin.',
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: ctrl.demo
                      ? null
                      : () async {
                          try {
                            await ctrl.refreshCatalog();
                          } catch (e) {
                            if (context.mounted) showError(context, e);
                          }
                        },
                  icon: const Icon(Icons.sync),
                  label: const Text('Muat dari Laravel'),
                ),
              ],
            ),
          ),
          SizedBox(height: KukiSpace.normal(context)),
          Wrap(spacing: 8, runSpacing: 8, children: [
            Chip(label: Text('${ctrl.products.length} produk mandiri')),
            ChoiceChip(
              avatar: low > 0
                  ? const Icon(Icons.warning_amber_rounded,
                      color: KukiColors.orangeDark, size: 16)
                  : null,
              label: Text('$low stok menipis / habis'),
              selected: onlyLow,
              onSelected: (value) => setState(() => onlyLow = value),
            ),
          ]),
          SizedBox(height: KukiSpace.normal(context)),
          SizedBox(
            height: 46,
            child: TextField(
              controller: search,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                hintText: 'Cari nama, SKU atau barcode',
              ),
            ),
          ),
          SizedBox(height: KukiSpace.normal(context)),
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: KukiColors.paper,
                border: Border.all(color: KukiColors.line),
                borderRadius: BorderRadius.circular(KukiRadius.md),
              ),
              child: LayoutBuilder(builder: (_, box) => SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: SizedBox(
                  width: math.max(box.maxWidth, 800.0),
                  height: box.maxHeight,
                  child: Column(children: [
                    Container(
                      height: 44,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: const BoxDecoration(
                        color: KukiColors.cream,
                        borderRadius: BorderRadius.vertical(
                          top: Radius.circular(KukiRadius.md - 1),
                        ),
                      ),
                      child: const Row(children: [
                        SizedBox(
                            width: 155,
                            child: Text('SKU',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: KukiText.labelSmall)),
                        Expanded(
                            child: Text('PRODUK',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: KukiText.labelSmall)),
                        SizedBox(
                            width: 125,
                            child: Text('KATEGORI',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: KukiText.labelSmall)),
                        SizedBox(
                            width: 90,
                            child: Text('STOK',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: KukiText.labelSmall)),
                        SizedBox(
                            width: 130,
                            child: Text('HARGA',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: KukiText.labelSmall)),
                      ]),
                    ),
                    Expanded(child: products.isEmpty
                      ? const Center(
                          child: Text('Tidak ada produk untuk filter ini.'))
                      : ListView.separated(
                        itemCount: products.length,
                        separatorBuilder: (_, _) => const Divider(
                            height: 1, color: KukiColors.line),
                        itemBuilder: (_, i) {
                          final p = products[i];
                          final isLow = p.stock <= p.minimumStock;
                          return SizedBox(height: 54,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 14),
                              child: Row(children: [
                                SizedBox(
                                    width: 155,
                                    child: Text(p.sku.isEmpty ? '-' : p.sku,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: KukiText.bodySmall)),
                                Expanded(
                                    child: Text(p.name,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: KukiText.titleSmall)),
                                SizedBox(
                                    width: 125,
                                    child: Text(p.categoryName,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: KukiText.bodySmall)),
                                SizedBox(
                                    width: 90,
                                    child: Text('${p.stock}',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: KukiText.titleSmall.copyWith(
                                            color: isLow
                                                ? KukiColors.danger
                                                : KukiColors.cocoa))),
                                SizedBox(
                                    width: 130,
                                    child: Text(money(p.price),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: KukiText.bodySmall)),
                              ]),
                            ),
                          );
                        },
                      )),
                  ]),
                ),
              )),
            ),
          ),
          SizedBox(height: KukiSpace.tight(context)),
          const Text(
            'Setiap rasa/ukuran adalah produk mandiri dalam kategori; '
            'tidak ada tabel produk varian.',
            style: KukiText.labelSmall,
          ),
        ],
      ),
    );
  }
}
