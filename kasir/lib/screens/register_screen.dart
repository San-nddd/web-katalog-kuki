import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../core/models.dart';
import '../core/theme.dart';
import '../services/receipt_service.dart';
import '../services/camera_scanner.dart';
import '../state/pos_controller.dart';
import '../widgets/common.dart';

class RegisterScreen extends StatefulWidget {
  final PosController controller;
  const RegisterScreen({super.key, required this.controller});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final search = TextEditingController();
  String category = 'Semua';

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  Future<void> add(Product product) async {
    try {
      await widget.controller.addProduct(product);
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> scan(String code) async {
    final found = await widget.controller.findBarcode(code.trim());
    if (!mounted) return;
    if (found == null) {
      showError(context, 'SKU/barcode tidak ditemukan: $code');
      return;
    }
    await add(found);
  }

  Future<void> cameraScan() async {
    final code = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const CameraScanner()),
    );
    if (code != null && mounted) await scan(code);
  }

  Future<void> hidScanner() async {
    await showDialog<void>(
      context: context,
      builder: (_) => _HidBarcodeDialog(onScan: scan),
    );
  }

  Future<void> editText({
    required String title,
    required String initial,
    required Future<void> Function(String) save,
  }) async {
    var typedText = initial;
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: TextFormField(
          initialValue: initial,
          autofocus: true,
          maxLines: title.contains('Catatan') ? 3 : 1,
          decoration: InputDecoration(hintText: title),
          onChanged: (value) => typedText = value,
          onFieldSubmitted: (value) => Navigator.pop(ctx, value),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, typedText),
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
    if (result != null) {
      try {
        await save(result);
      } catch (e) {
        if (mounted) showError(context, e);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = widget.controller;
    final categories = [
      'Semua',
      ...ctrl.products.map((p) => p.categoryName).toSet(),
    ];
    final filtered = ctrl.products.where((product) {
      final query = search.text.toLowerCase().trim();
      return (category == 'Semua' || product.categoryName == category) &&
          (query.isEmpty ||
              product.name.toLowerCase().contains(query) ||
              product.barcode.toLowerCase().contains(query) ||
              product.sku.toLowerCase().contains(query));
    }).toList();

    return LayoutBuilder(
      builder: (context, size) {
        final wide = size.maxWidth >= 740;
        return Padding(
          padding: const EdgeInsets.all(18),
          child: wide
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(child: _catalog(ctrl, categories, filtered)),
                    const SizedBox(width: 16),
                    SizedBox(
                      width: size.maxWidth >= 1000 ? 348 : 306,
                      child: _cart(ctrl),
                    ),
                  ],
                )
              : DefaultTabController(
                  length: 2,
                  child: Column(
                    children: [
                      const TabBar(
                        tabs: [
                          Tab(text: 'Menu Produk'),
                          Tab(text: 'Keranjang'),
                        ],
                      ),
                      Expanded(
                        child: TabBarView(
                          children: [
                            _catalog(ctrl, categories, filtered),
                            _cart(ctrl),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
        );
      },
    );
  }

  Widget _orderStrip(PosController ctrl) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Row(
        children: [
          const Expanded(
            child: Text(
              'Order List',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: KukiColors.cocoa,
              ),
            ),
          ),
          Text(
            '${ctrl.drafts.length} pesanan aktif',
            style: const TextStyle(color: KukiColors.muted, fontSize: 11),
          ),
          const SizedBox(width: 8),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 10),
            ),
            onPressed: () async {
              try {
                await ctrl.addDraft();
              } catch (e) {
                if (mounted) showError(context, e);
              }
            },
            icon: const Icon(Icons.add, size: 16),
            label: const Text('Order Baru'),
          ),
        ],
      ),
      const SizedBox(height: 9),
      SizedBox(
        height: 88,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: ctrl.drafts.length,
          separatorBuilder: (_, _) => const SizedBox(width: 9),
          itemBuilder: (_, i) {
            final order = ctrl.drafts[i];
            final active = order.id == ctrl.activeDraftId;
            return SizedBox(
              width: 175,
              child: Material(
                color: active ? KukiColors.cream : Colors.white,
                borderRadius: BorderRadius.circular(12),
                child: InkWell(
                  onTap: () => ctrl.selectDraft(order.id),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: active ? KukiColors.caramel : KukiColors.line,
                        width: active ? 1.5 : 1,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.circle,
                              size: 8,
                              color: active
                                  ? KukiColors.caramel
                                  : KukiColors.muted,
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                order.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                            if (ctrl.drafts.length > 1)
                              InkWell(
                                onTap: () async {
                                  if (order.lines.isNotEmpty) {
                                    final confirm = await showDialog<bool>(
                                      context: context,
                                      builder: (ctx) => AlertDialog(
                                        title: const Text(
                                          'Hapus draft pesanan?',
                                        ),
                                        content: Text(
                                          'Semua ${order.itemCount} item dalam ${order.name} akan dihapus.',
                                        ),
                                        actions: [
                                          TextButton(
                                            onPressed: () =>
                                                Navigator.pop(ctx, false),
                                            child: const Text('Batal'),
                                          ),
                                          FilledButton(
                                            onPressed: () =>
                                                Navigator.pop(ctx, true),
                                            child: const Text('Hapus draft'),
                                          ),
                                        ],
                                      ),
                                    );
                                    if (confirm != true) return;
                                  }
                                  try {
                                    await ctrl.removeDraft(order.id);
                                  } catch (e) {
                                    if (mounted) showError(context, e);
                                  }
                                },
                                child: const Icon(
                                  Icons.close,
                                  size: 16,
                                  color: KukiColors.muted,
                                ),
                              ),
                          ],
                        ),
                        const Spacer(),
                        Text(
                          '${order.itemCount} item · ${money(order.total)}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: KukiColors.mocha,
                          ),
                        ),
                        Text(
                          active
                              ? 'Sedang dikerjakan'
                              : 'Disimpan sebagai draft',
                          style: const TextStyle(
                            fontSize: 10,
                            color: KukiColors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    ],
  );

  Widget _catalog(
    PosController ctrl,
    List<String> categories,
    List<Product> filtered,
  ) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      _orderStrip(ctrl),
      const SizedBox(height: 20),
      Row(
        children: [
          const Expanded(
            child: Text(
              'Menu Produk',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: KukiColors.cocoa,
              ),
            ),
          ),
          Text(
            '${filtered.length} produk',
            style: const TextStyle(fontSize: 11, color: KukiColors.muted),
          ),
        ],
      ),
      const SizedBox(height: 10),
      Row(
        children: [
          Expanded(
            child: SizedBox(
              height: 46,
              child: TextField(
                controller: search,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.search, size: 20),
                  hintText: 'Cari produk atau SKU',
                  isDense: true,
                ),
              ),
            ),
          ),
          const SizedBox(width: 6),
          IconButton.filledTonal(
            tooltip: 'Barcode kamera',
            onPressed: cameraScan,
            icon: const Icon(Icons.qr_code_scanner),
          ),
          IconButton.filledTonal(
            tooltip: 'Scanner USB / Bluetooth',
            onPressed: hidScanner,
            icon: const Icon(Icons.keyboard_outlined),
          ),
        ],
      ),
      const SizedBox(height: 10),
      SizedBox(
        height: 43,
        child: ListView(
          scrollDirection: Axis.horizontal,
          children: [
            for (final name in categories)
              Padding(
                padding: const EdgeInsets.only(right: 7),
                child: ChoiceChip(
                  label: Text(name),
                  selected: category == name,
                  onSelected: (_) => setState(() => category = name),
                ),
              ),
          ],
        ),
      ),
      const SizedBox(height: 10),
      Expanded(
        child: LayoutBuilder(
          builder: (_, box) => RefreshIndicator(
            onRefresh: () async {
              if (ctrl.demo) return;
              try {
                await ctrl.refreshCatalog();
              } catch (e) {
                if (mounted) showError(context, e);
              }
            },
            child: filtered.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      SizedBox(
                        height: box.maxHeight,
                        child: const Center(
                          child: Text('Belum ada produk pada kategori ini.'),
                        ),
                      ),
                    ],
                  )
                : GridView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(14),
                    itemCount: filtered.length,
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: (box.maxWidth / 174)
                          .floor()
                          .clamp(2, 5)
                          .toInt(),
                      childAspectRatio: .90,
                      crossAxisSpacing: 14,
                      mainAxisSpacing: 14,
                    ),
                    itemBuilder: (_, i) => _productCard(filtered[i]),
                  ),
          ),
        ),
      ),
    ],
  );

  Widget _productCard(Product p) => Material(
    color: Colors.white,
    borderRadius: BorderRadius.circular(12),
    child: InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: p.stock <= 0 ? null : () => add(p),
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: KukiColors.line),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                children: [
                  Container(
                    width: double.infinity,
                    decoration: const BoxDecoration(
                      color: KukiColors.cream,
                      borderRadius: BorderRadius.vertical(
                        top: Radius.circular(11),
                      ),
                    ),
                    child: p.imageUrl?.isNotEmpty == true
                        ? ClipRRect(
                            borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(11),
                            ),
                            child: Image.network(
                              p.imageUrl!,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => const Icon(
                                Icons.bakery_dining_outlined,
                                size: 45,
                                color: KukiColors.mocha,
                              ),
                            ),
                          )
                        : const Icon(
                            Icons.bakery_dining_outlined,
                            size: 45,
                            color: KukiColors.mocha,
                          ),
                  ),
                  if (p.stock <= 0)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: _pill('Habis', KukiColors.peach),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    p.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    money(p.price),
                    style: const TextStyle(
                      color: KukiColors.mocha,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    'Stok ${p.stock}',
                    style: TextStyle(
                      fontSize: 10,
                      color: p.stock <= p.minimumStock
                          ? Colors.deepOrange
                          : KukiColors.muted,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );

  Widget _pill(String label, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
    decoration: BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(6),
    ),
    child: Text(
      label,
      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
    ),
  );

  Widget _cart(PosController ctrl) {
    final order = ctrl.draft;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: KukiColors.line),
        borderRadius: BorderRadius.circular(13),
      ),
      child: Padding(
        padding: const EdgeInsets.all(13),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Detail Pesanan',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                  ),
                ),
                IconButton(
                  tooltip: 'Edit nama pesanan',
                  onPressed: () => editText(
                    title: 'Nama pelanggan / pesanan',
                    initial: order.name,
                    save: ctrl.renameDraft,
                  ),
                  icon: const Icon(Icons.edit_outlined, size: 18),
                ),
              ],
            ),
            Text(
              order.name,
              style: const TextStyle(color: KukiColors.muted, fontSize: 12),
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              key: ValueKey('${order.id}-${order.orderType}'),
              initialValue: order.orderType,
              decoration: const InputDecoration(
                labelText: 'Jenis pesanan',
                isDense: true,
              ),
              items: const [
                DropdownMenuItem(value: 'takeaway', child: Text('Bawa pulang')),
                DropdownMenuItem(
                  value: 'dine_in',
                  child: Text('Makan di tempat'),
                ),
              ],
              onChanged: (value) {
                if (value != null) ctrl.setOrderType(value);
              },
            ),
            if (order.orderType == 'dine_in')
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.table_restaurant_outlined, size: 16),
                  onPressed: () => editText(
                    title: 'Nomor / nama meja',
                    initial: order.tableNumber,
                    save: ctrl.setTableNumber,
                  ),
                  label: Text(
                    order.tableNumber.isEmpty
                        ? 'Isi nomor meja (opsional)'
                        : 'Meja: ${order.tableNumber}',
                  ),
                ),
              ),
            const SizedBox(height: 13),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Keranjang',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                  ),
                ),
                Text(
                  '${order.itemCount} item',
                  style: const TextStyle(color: KukiColors.muted, fontSize: 11),
                ),
              ],
            ),
            const Divider(height: 15),
            Expanded(
              child: order.lines.isEmpty
                  ? const Center(
                      child: Text(
                        'Pilih produk untuk memulai pesanan.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: KukiColors.muted),
                      ),
                    )
                  : ListView.separated(
                      itemCount: order.lines.length,
                      separatorBuilder: (_, _) =>
                          const Divider(height: 15, color: KukiColors.line),
                      itemBuilder: (_, i) {
                        final line = order.lines[i];
                        final imageUrl = line.product.imageUrl?.trim();
                        return Row(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: KukiColors.cream,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: imageUrl == null || imageUrl.isEmpty
                                    ? const Icon(
                                        Icons.bakery_dining_outlined,
                                        size: 24,
                                        color: KukiColors.mocha,
                                      )
                                    : Image.network(
                                        imageUrl,
                                        width: 48,
                                        height: 48,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, _, _) => const Icon(
                                          Icons.bakery_dining_outlined,
                                          size: 24,
                                          color: KukiColors.mocha,
                                        ),
                                      ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    line.product.name,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  Text(
                                    money(line.total),
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: KukiColors.muted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            _qtyButton(Icons.remove, () async {
                              try {
                                await ctrl.changeQuantity(line.product.id, -1);
                              } catch (e) {
                                if (mounted) showError(context, e);
                              }
                            }),
                            SizedBox(
                              width: 22,
                              child: Center(
                                child: Text(
                                  '${line.quantity}',
                                  style: const TextStyle(fontSize: 12),
                                ),
                              ),
                            ),
                            _qtyButton(Icons.add, () async {
                              try {
                                await ctrl.changeQuantity(line.product.id, 1);
                              } catch (e) {
                                if (mounted) showError(context, e);
                              }
                            }),
                          ],
                        );
                      },
                    ),
            ),
            const SizedBox(height: 7),
            OutlinedButton.icon(
              onPressed: () => editText(
                title: 'Catatan pelanggan',
                initial: order.note,
                save: ctrl.setNote,
              ),
              icon: const Icon(Icons.notes_outlined, size: 16),
              label: Text(
                order.note.isEmpty ? 'Tambahkan catatan' : 'Edit catatan',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const Divider(height: 17),
            _totalRow('Subtotal', money(order.subtotal)),
            if (kIsWeb)
              _totalRow('Diskon', 'Tidak tersedia di API')
            else
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Diskon',
                      style: TextStyle(color: KukiColors.muted, fontSize: 12),
                    ),
                  ),
                  TextButton(
                    onPressed: order.lines.isEmpty
                        ? null
                        : () async {
                            final value = await askAmount(
                              context,
                              title: 'Diskon (Rp)',
                              initial: '${order.discount}',
                            );
                            if (value != null) {
                              try {
                                await ctrl.setDiscount(value);
                              } catch (e) {
                                if (mounted) showError(context, e);
                              }
                            }
                          },
                    child: Text('-${money(order.discount)}'),
                  ),
                ],
              ),
            const Divider(height: 14),
            _totalRow('TOTAL', money(order.total), strong: true),
            const SizedBox(height: 13),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                icon: const Icon(Icons.arrow_forward_rounded, size: 19),
                onPressed: !ctrl.shiftOpen || order.lines.isEmpty || ctrl.busy
                    ? null
                    : () => _checkout(ctrl),
                label: Text(
                  ctrl.shiftOpen ? 'Lanjut Pembayaran' : 'Buka shift dahulu',
                ),
              ),
            ),
            if (!ctrl.shiftOpen)
              const Padding(
                padding: EdgeInsets.only(top: 5),
                child: Text(
                  'Shift harus dibuka sebelum bertransaksi.',
                  style: TextStyle(fontSize: 10, color: KukiColors.muted),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _qtyButton(IconData icon, VoidCallback onPressed) => SizedBox(
    width: 28,
    height: 28,
    child: IconButton(
      onPressed: onPressed,
      padding: EdgeInsets.zero,
      iconSize: 16,
      visualDensity: VisualDensity.compact,
      style: IconButton.styleFrom(
        backgroundColor: KukiColors.paper,
        side: const BorderSide(color: KukiColors.line),
      ),
      icon: Icon(icon),
    ),
  );

  Widget _totalRow(String label, String amount, {bool strong = false}) =>
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: strong ? 14 : 12,
                  fontWeight: strong ? FontWeight.w800 : FontWeight.w400,
                  color: strong ? KukiColors.cocoa : KukiColors.muted,
                ),
              ),
            ),
            Text(
              amount,
              style: TextStyle(
                fontSize: strong ? 17 : 12,
                fontWeight: strong ? FontWeight.w800 : FontWeight.w600,
              ),
            ),
          ],
        ),
      );

  Future<void> _checkout(PosController ctrl) async {
    final result = await showDialog<Sale>(
      context: context,
      builder: (_) => CheckoutDialog(controller: ctrl),
    );
    if (!mounted || result == null) return;
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Pembayaran berhasil disimpan'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Transaksi: ${result.uuid.substring(0, 8)}'),
            Text('Total: ${money(result.total)}'),
            if (result.method == 'cash')
              Text('Kembalian: ${money(result.change)}'),
            const SizedBox(height: 9),
            const Text(
              'Struk dicetak melalui dialog cetak sistem. Status sinkronisasi '
              'tersedia pada menu Riwayat.',
              style: TextStyle(fontSize: 12),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Selesai'),
          ),
          FilledButton.icon(
            onPressed: () async {
              try {
                await ReceiptService.printSale(
                  result,
                  paperWidthMm: ctrl.receiptWidth,
                );
              } catch (e) {
                if (ctx.mounted) showError(ctx, e);
              }
            },
            icon: const Icon(Icons.print_outlined),
            label: const Text('Cetak struk'),
          ),
        ],
      ),
    );
  }
}

class CheckoutDialog extends StatefulWidget {
  final PosController controller;
  const CheckoutDialog({super.key, required this.controller});
  @override
  State<CheckoutDialog> createState() => _CheckoutDialogState();
}

class _CheckoutDialogState extends State<CheckoutDialog> {
  String method = 'cash';
  bool confirmed = false;
  bool working = false;
  final cash = TextEditingController();
  @override
  void initState() {
    super.initState();
    cash.text = '${widget.controller.draft.total}';
  }

  @override
  void dispose() {
    cash.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final total = widget.controller.draft.total;
    final paid = int.tryParse(cash.text) ?? 0;
    return AlertDialog(
      title: const Text('Pembayaran'),
      content: SizedBox(
        width: 430,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              money(total),
              style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 12),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'cash', label: Text('Tunai')),
                ButtonSegment(value: 'transfer', label: Text('Transfer')),
                ButtonSegment(value: 'qris_manual', label: Text('QRIS')),
              ],
              selected: {method},
              onSelectionChanged: (v) => setState(() => method = v.first),
            ),
            const SizedBox(height: 18),
            if (method == 'cash') ...[
              TextField(
                controller: cash,
                keyboardType: TextInputType.number,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  labelText: 'Uang diterima (Rp)',
                ),
              ),
              const SizedBox(height: 8),
              Text('Kembalian: ${money(paid > total ? paid - total : 0)}'),
            ] else ...[
              const Text(
                'Pembayaran ini dicatat MANUAL. Tidak ada verifikasi otomatis dari bank/gateway.',
              ),
              CheckboxListTile(
                value: confirmed,
                contentPadding: EdgeInsets.zero,
                onChanged: (v) => setState(() => confirmed = v ?? false),
                title: const Text(
                  'Saya sudah memverifikasi pembayaran secara langsung',
                ),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: working ? null : () => Navigator.pop(context),
          child: const Text('Batal'),
        ),
        FilledButton(
          onPressed: working || (method == 'cash' ? paid < total : !confirmed)
              ? null
              : () async {
                  setState(() => working = true);
                  try {
                    final sale = await widget.controller.pay(
                      method,
                      method == 'cash' ? paid : total,
                      verified: confirmed,
                    );
                    if (context.mounted) Navigator.pop(context, sale);
                  } catch (e) {
                    if (context.mounted) showError(context, e);
                  } finally {
                    if (mounted) setState(() => working = false);
                  }
                },
          child: Text(working ? 'Menyimpan...' : 'Simpan pembayaran'),
        ),
      ],
    );
  }
}

/// Controller barcode harus dimiliki dialog agar dispose mengikuti transisi route.
class _HidBarcodeDialog extends StatefulWidget {
  final Future<void> Function(String) onScan;
  const _HidBarcodeDialog({required this.onScan});

  @override
  State<_HidBarcodeDialog> createState() => _HidBarcodeDialogState();
}

class _HidBarcodeDialogState extends State<_HidBarcodeDialog> {
  final scanner = TextEditingController();
  final node = FocusNode();

  @override
  void dispose() {
    scanner.dispose();
    node.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Scan barcode / SKU'),
    content: SizedBox(
      width: 390,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Hubungkan scanner USB atau Bluetooth sebagai keyboard. '
            'Pindai kode ke kolom ini; scanner biasanya mengirim Enter otomatis.',
          ),
          const SizedBox(height: 14),
          TextField(
            controller: scanner,
            focusNode: node,
            autofocus: true,
            decoration: const InputDecoration(labelText: 'Barcode / SKU'),
            onSubmitted: (value) async {
              scanner.clear();
              await widget.onScan(value);
              if (mounted) node.requestFocus();
            },
          ),
        ],
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Selesai'),
      ),
    ],
  );
}
