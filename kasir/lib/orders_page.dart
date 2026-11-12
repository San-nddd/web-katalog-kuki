import 'package:flutter/material.dart';
import 'api_client.dart';
import 'login_page.dart';
import 'models.dart';
import 'receipt.dart';
import 'scanner_page.dart';

class OrdersPage extends StatefulWidget {
  final List<LocalOrder> orders;
  final int active;
  final ValueChanged<int> onTab;
  final VoidCallback onNew, onChanged;
  final ValueChanged<PosReceipt> onPaid;
  const OrdersPage({
    super.key,
    required this.orders,
    required this.active,
    required this.onTab,
    required this.onNew,
    required this.onChanged,
    required this.onPaid,
  });
  @override
  State<OrdersPage> createState() => _OrdersPageState();
}

class _OrdersPageState extends State<OrdersPage> {
  List<PosProduct> products = [];
  final search = TextEditingController();
  bool loading = true, paying = false;
  String category = 'Semua';
  String? error;
  @override
  void initState() {
    super.initState();
    refresh();
  }

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  Future<void> refresh() async {
    if (mounted)
      setState(() {
        loading = true;
        error = null;
      });
    try {
      final data = await ApiClient.instance.catalog();
      if (mounted) setState(() => products = data);
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  LocalOrder get order => widget.orders[widget.active];
  void add(PosProduct p) {
    if (order.lines[p.id]?.qty == p.stock) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Stok ${p.name} tidak cukup.')));
      return;
    }
    order.add(p);
    widget.onChanged();
  }

  Future<void> scanBarcode() async {
    final code = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const ScannerPage()),
    );
    if (code == null || !mounted) return;
    barcode(code);
  }

  void barcode(String code) {
    final c = code.trim().toUpperCase();
    PosProduct? match;
    for (final item in products) {
      if (item.barcode.toUpperCase() == c && c.isNotEmpty) {
        match = item;
        break;
      }
    }
    if (match == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Barcode $code tidak ditemukan.')));
      return;
    }
    add(match);
    search.clear();
  }

  Future<void> editText(String field) async {
    final controller = TextEditingController(
      text: field == 'notes' ? order.notes : order.name,
    );
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(field == 'notes' ? 'Catatan Pelanggan' : 'Nama Pelanggan'),
        content: TextField(
          controller: controller,
          maxLines: field == 'notes' ? 3 : 1,
          autofocus: true,
          decoration: InputDecoration(
            hintText: field == 'notes'
                ? 'Catatan khusus pesanan'
                : 'Nama pelanggan',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (result != null) {
      if (field == 'notes') {
        order.notes = result;
      } else {
        order.name = result;
      }
      widget.onChanged();
    }
  }

  Future<void> pay() async {
    if (order.lines.isEmpty || paying) return;
    String method = 'tunai';
    bool verified = false;
    final cash = TextEditingController(text: '${order.total}');
    final succeeded = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (ctx, update) => AlertDialog(
          title: const Text('Pembayaran Pesanan'),
          content: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Total ${rupiah(order.total)}',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: kukiNavy,
                  ),
                ),
                const SizedBox(height: 14),
                const Text('Metode pembayaran'),
                Wrap(
                  spacing: 8,
                  children: ['tunai', 'qris', 'transfer']
                      .map(
                        (m) => ChoiceChip(
                          label: Text(m.toUpperCase()),
                          selected: method == m,
                          onSelected: paying
                              ? null
                              : (_) => update(() {
                                  method = m;
                                  verified = false;
                                  if (m != 'tunai')
                                    cash.text = '${order.total}';
                                }),
                        ),
                      )
                      .toList(),
                ),
                const SizedBox(height: 14),
                if (method == 'tunai')
                  TextField(
                    controller: cash,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Jumlah diterima (Rp)',
                    ),
                  )
                else
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    value: verified,
                    title: const Text(
                      'Pembayaran sudah saya periksa secara manual',
                    ),
                    subtitle: const Text(
                      'Tanpa payment gateway. Pastikan dana benar-benar diterima.',
                    ),
                    onChanged: paying
                        ? null
                        : (v) => update(() => verified = v ?? false),
                  ),
                if (paying)
                  const Padding(
                    padding: EdgeInsets.only(top: 12),
                    child: LinearProgressIndicator(),
                  ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: paying ? null : () => Navigator.pop(ctx, false),
              child: const Text('Batal'),
            ),
            FilledButton(
              onPressed: paying
                  ? null
                  : () async {
                      final received = method == 'tunai'
                          ? int.tryParse(cash.text.trim())
                          : order.total;
                      if (received == null ||
                          received < order.total ||
                          (method != 'tunai' && !verified)) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Periksa jumlah uang atau verifikasi pembayaran.',
                            ),
                          ),
                        );
                        return;
                      }
                      update(() => paying = true);
                      try {
                        final receipt = await ApiClient.instance.checkout(
                          order,
                          method: method,
                          paid: received,
                          verified: verified,
                        );
                        if (!ctx.mounted) return;
                        update(() => paying = false);
                        Navigator.pop(ctx, true);
                        widget.onPaid(receipt);
                        if (!mounted) return;
                        await refresh();
                        if (!mounted) return;
                        await showDialog<void>(
                          context: this.context,
                          builder: (dialogContext) => AlertDialog(
                            title: const Row(
                              children: [
                                Icon(Icons.check_circle, color: Colors.green),
                                SizedBox(width: 8),
                                Text('Pembayaran berhasil'),
                              ],
                            ),
                            content: Text(
                              '${receipt.number}\nTotal: ${rupiah(receipt.total)}\nKembalian: ${rupiah(receipt.change)}',
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(dialogContext),
                                child: const Text('Tutup'),
                              ),
                              FilledButton.icon(
                                icon: const Icon(Icons.print),
                                label: const Text('Cetak Struk'),
                                onPressed: () async {
                                  try {
                                    await printReceipt(receipt);
                                  } catch (e) {
                                    if (dialogContext.mounted) {
                                      ScaffoldMessenger.of(
                                        dialogContext,
                                      ).showSnackBar(
                                        SnackBar(content: Text('Printer: $e')),
                                      );
                                    }
                                  }
                                },
                              ),
                            ],
                          ),
                        );
                        if (mounted) setState(() => paying = false);
                      } catch (e) {
                        if (ctx.mounted) {
                          ScaffoldMessenger.of(ctx).showSnackBar(
                            SnackBar(
                              content: Text(
                                '$e\nJika jaringan putus, periksa Riwayat sebelum mencoba transaksi baru.',
                              ),
                              duration: const Duration(seconds: 8),
                            ),
                          );
                          update(() => paying = false);
                        }
                      }
                    },
              child: const Text('Simpan Transaksi'),
            ),
          ],
        ),
      ),
    );
    cash.dispose();
    if (succeeded != true && mounted) setState(() => paying = false);
  }

  @override
  Widget build(BuildContext context) {
    final viewport = MediaQuery.sizeOf(context).width;
    final wide = viewport >= 760;
    final categories = {'Semua', ...products.map((p) => p.category)}.toList();
    final found = products
        .where(
          (p) =>
              (category == 'Semua' || p.category == category) &&
              (p.name.toLowerCase().contains(search.text.toLowerCase()) ||
                  p.barcode.toLowerCase().contains(search.text.toLowerCase())),
        )
        .toList();
    final catalog = Column(
      children: [
        Container(
          color: Colors.white,
          padding: const EdgeInsets.all(13),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: search,
                      onChanged: (_) => setState(() {}),
                      onSubmitted: (v) {
                        if (products.any(
                          (p) =>
                              p.barcode.toUpperCase() == v.trim().toUpperCase(),
                        ))
                          barcode(v);
                      },
                      decoration: const InputDecoration(
                        isDense: true,
                        prefixIcon: Icon(Icons.search),
                        hintText:
                            'Cari nama atau scan barcode dengan scanner HID',
                      ),
                    ),
                  ),
                  const SizedBox(width: 7),
                  IconButton.filledTonal(
                    onPressed: scanBarcode,
                    tooltip: 'Scan via kamera',
                    icon: const Icon(Icons.qr_code_scanner),
                  ),
                  IconButton(
                    onPressed: refresh,
                    tooltip: 'Muat ulang produk',
                    icon: const Icon(Icons.refresh),
                  ),
                ],
              ),
              const SizedBox(height: 9),
              SizedBox(
                height: 44,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: categories
                      .map(
                        (c) => Padding(
                          padding: const EdgeInsets.only(right: 7),
                          child: ChoiceChip(
                            selected: category == c,
                            label: Text(c),
                            onSelected: (_) => setState(() => category = c),
                          ),
                        ),
                      )
                      .toList(),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: loading
              ? const Center(child: CircularProgressIndicator())
              : error != null
              ? Center(child: Text(error!))
              : found.isEmpty
              ? const Center(child: Text('Produk tidak ditemukan'))
              : LayoutBuilder(
                  builder: (context, size) => GridView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: found.length,
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: size.maxWidth >= 900
                          ? 4
                          : size.maxWidth >= 520
                          ? 3
                          : 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: .84,
                    ),
                    itemBuilder: (context, i) {
                      final p = found[i];
                      return Card(
                        clipBehavior: Clip.antiAlias,
                        child: InkWell(
                          onTap: p.stock <= 0 ? null : () => add(p),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Expanded(
                                child: p.image == null
                                    ? const Icon(
                                        Icons.bakery_dining_outlined,
                                        size: 44,
                                        color: kukiOrange,
                                      )
                                    : Image.network(
                                        p.image!,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, _, _) => const Icon(
                                          Icons.cake_outlined,
                                          size: 44,
                                          color: kukiOrange,
                                        ),
                                      ),
                              ),
                              Padding(
                                padding: const EdgeInsets.all(9),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      p.name,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      rupiah(p.price),
                                      style: const TextStyle(
                                        color: kukiOrange,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    Text(
                                      p.stock <= 0
                                          ? 'Habis'
                                          : 'Stok ${p.stock}',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: p.stock <= 0
                                            ? Colors.red
                                            : Colors.black54,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
        ),
      ],
    );
    final cart = Container(
      color: Colors.white,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(13),
            child: Row(
              children: [
                const Icon(Icons.receipt_long, color: kukiOrange),
                const SizedBox(width: 7),
                const Text(
                  'Detail Pesanan',
                  style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                Text('${order.count} item'),
              ],
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Wrap(
              spacing: 7,
              runSpacing: 6,
              children: [
                ChoiceChip(
                  label: const Text('Takeaway'),
                  selected: order.type == 'takeaway',
                  onSelected: (_) {
                    order.type = 'takeaway';
                    widget.onChanged();
                  },
                ),
                ChoiceChip(
                  label: const Text('Dine In'),
                  selected: order.type == 'dine_in',
                  onSelected: (_) {
                    order.type = 'dine_in';
                    widget.onChanged();
                  },
                ),
                if (order.type == 'dine_in')
                  ActionChip(
                    label: Text(
                      order.table.isEmpty
                          ? 'Pilih Meja'
                          : 'Meja ${order.table}',
                    ),
                    onPressed: () async {
                      final ctrl = TextEditingController(text: order.table);
                      final table = await showDialog<String>(
                        context: context,
                        builder: (c) => AlertDialog(
                          title: const Text('Nomor Meja'),
                          content: TextField(
                            controller: ctrl,
                            decoration: const InputDecoration(
                              hintText: 'Contoh: A01',
                            ),
                          ),
                          actions: [
                            FilledButton(
                              onPressed: () =>
                                  Navigator.pop(c, ctrl.text.trim()),
                              child: const Text('Simpan'),
                            ),
                          ],
                        ),
                      );
                      ctrl.dispose();
                      if (table != null) {
                        order.table = table;
                        widget.onChanged();
                      }
                    },
                  ),
              ],
            ),
          ),
          ListTile(
            dense: true,
            leading: const Icon(Icons.person_outline),
            title: Text(
              order.name.isEmpty ? 'Nama pelanggan (opsional)' : order.name,
            ),
            trailing: const Icon(Icons.edit_outlined, size: 17),
            onTap: () => editText('name'),
          ),
          ListTile(
            dense: true,
            leading: const Icon(Icons.notes_outlined),
            title: Text(
              order.notes.isEmpty ? 'Catatan pesanan (opsional)' : order.notes,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            trailing: const Icon(Icons.edit_outlined, size: 17),
            onTap: () => editText('notes'),
          ),
          const Divider(height: 1),
          Expanded(
            child: order.lines.isEmpty
                ? const Center(child: Text('Pilih produk untuk mulai pesanan'))
                : ListView(
                    children: order.lines.values
                        .map(
                          (line) => ListTile(
                            title: Text(
                              line.product.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            subtitle: Text(rupiah(line.total)),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.remove_circle_outline),
                                  onPressed: () {
                                    order.remove(line.product);
                                    widget.onChanged();
                                  },
                                ),
                                Text('${line.qty}'),
                                IconButton(
                                  icon: const Icon(Icons.add_circle_outline),
                                  onPressed: () => add(line.product),
                                ),
                              ],
                            ),
                          ),
                        )
                        .toList(),
                  ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [const Text('Subtotal'), Text(rupiah(order.total))],
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'TOTAL',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 17,
                      ),
                    ),
                    Text(
                      rupiah(order.total),
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 17,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: order.lines.isEmpty ? null : pay,
                    style: FilledButton.styleFrom(
                      backgroundColor: kukiOrange,
                      minimumSize: const Size.fromHeight(48),
                    ),
                    child: const Text('Bayar & Simpan Transaksi'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
    return Column(
      children: [
        SizedBox(
          height: 63,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.all(10),
            children: [
              ...List.generate(
                widget.orders.length,
                (i) => Padding(
                  padding: const EdgeInsets.only(right: 7),
                  child: ChoiceChip(
                    label: Text(
                      '${widget.orders[i].draftId} • ${widget.orders[i].count}',
                    ),
                    selected: widget.active == i,
                    onSelected: (_) => widget.onTab(i),
                  ),
                ),
              ),
              IconButton.filledTonal(
                onPressed: widget.onNew,
                icon: const Icon(Icons.add),
                tooltip: 'Order baru',
              ),
            ],
          ),
        ),
        Expanded(
          child: wide
              ? Row(
                  children: [
                    Expanded(flex: 7, child: catalog),
                    SizedBox(width: 360, child: cart),
                  ],
                )
              : Column(
                  children: [
                    Expanded(flex: 5, child: catalog),
                    Expanded(flex: 4, child: cart),
                  ],
                ),
        ),
      ],
    );
  }
}
