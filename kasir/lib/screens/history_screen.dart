import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/models.dart';
import '../core/theme.dart';
import '../services/receipt_service.dart';
import '../state/pos_controller.dart';
import '../widgets/common.dart';

class HistoryScreen extends StatefulWidget {
  final PosController controller;
  const HistoryScreen({super.key, required this.controller});
  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  String filter = 'all';
  final query = TextEditingController();
  @override
  void dispose() {
    query.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final q = query.text.toLowerCase().trim();
    final data = widget.controller.history
        .where(
          (sale) =>
              (filter == 'all' || sale.status == filter) &&
              (q.isEmpty ||
                  sale.uuid.toLowerCase().contains(q) ||
                  sale.cashier.toLowerCase().contains(q) ||
                  sale.method.toLowerCase().contains(q) ||
                  sale.lines.any(
                    (line) => asText(line['name']).toLowerCase().contains(q),
                  )),
        )
        .toList();
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionLabel(
            'Riwayat Transaksi',
            caption: kIsWeb
                ? 'Transaksi dari server Laravel. Pencarian berlaku pada halaman yang sedang dibuka.'
                : 'Transaksi pada tablet ini dan status sinkronisasinya.',
          ),
          const SizedBox(height: 17),
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 45,
                  child: TextField(
                    controller: query,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      prefixIcon: const Icon(Icons.search),
                      hintText: kIsWeb
                          ? 'Cari pada halaman ini'
                          : 'Cari ID, nama produk atau kasir',
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              OutlinedButton.icon(
                onPressed: () async {
                  try {
                    await widget.controller.refreshHistory(
                      page: kIsWeb ? widget.controller.historyPage : 1,
                    );
                  } catch (error) {
                    if (context.mounted) showError(context, error);
                  }
                },
                icon: const Icon(Icons.refresh),
                label: const Text('Refresh'),
              ),
            ],
          ),
          const SizedBox(height: 11),
          if (!kIsWeb)
            Wrap(
              spacing: 8,
              children: [
                for (final value in ['all', 'pending', 'synced', 'conflict'])
                  ChoiceChip(
                    label: Text(
                      {
                        'all': 'Semua',
                        'pending': 'Tertunda',
                        'synced': 'Tersinkron',
                        'conflict': 'Konflik',
                      }[value]!,
                    ),
                    selected: filter == value,
                    onSelected: (_) => setState(() => filter = value),
                  ),
              ],
            ),
          const SizedBox(height: 12),
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: KukiColors.line),
              ),
              clipBehavior: Clip.antiAlias,
              child: LayoutBuilder(
                builder: (_, box) => SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: SizedBox(
                    width: math.max(box.maxWidth, 900.0),
                    height: box.maxHeight,
                    child: Column(
                      children: [
                        _rowHeader(),
                        Expanded(
                          child: data.isEmpty
                              ? const Center(
                                  child: Text(
                                    'Belum ada transaksi untuk filter ini.',
                                  ),
                                )
                              : ListView.separated(
                                  itemCount: data.length,
                                  separatorBuilder: (_, _) => const Divider(
                                    height: 1,
                                    color: KukiColors.line,
                                  ),
                                  itemBuilder: (_, i) =>
                                      _saleRow(context, data[i]),
                                ),
                        ),
                        Container(
                          height: 42,
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          color: KukiColors.paper,
                          child: Row(
                            children: [
                              Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                  ),
                                  child: Text(
                                    kIsWeb
                                        ? '${widget.controller.historyTotal} transaksi · halaman ${widget.controller.historyPage} dari ${widget.controller.historyLastPage}'
                                        : '${data.length} transaksi ditampilkan',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: KukiColors.muted,
                                    ),
                                  ),
                                ),
                              ),
                              if (kIsWeb) ...[
                                IconButton(
                                  tooltip: 'Halaman sebelumnya',
                                  onPressed: widget.controller.historyPage > 1
                                      ? () => _loadPage(
                                          context,
                                          widget.controller.historyPage - 1,
                                        )
                                      : null,
                                  icon: const Icon(Icons.chevron_left),
                                ),
                                IconButton(
                                  tooltip: 'Halaman berikutnya',
                                  onPressed:
                                      widget.controller.historyPage <
                                          widget.controller.historyLastPage
                                      ? () => _loadPage(
                                          context,
                                          widget.controller.historyPage + 1,
                                        )
                                      : null,
                                  icon: const Icon(Icons.chevron_right),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _loadPage(BuildContext context, int page) async {
    try {
      await widget.controller.refreshHistory(page: page);
    } catch (error) {
      if (context.mounted) showError(context, error);
    }
  }

  Widget _rowHeader() => Container(
    height: 46,
    color: KukiColors.cream,
    padding: const EdgeInsets.symmetric(horizontal: 16),
    child: const Row(
      children: [
        SizedBox(width: 115, child: Text('ID TRANSAKSI')),
        SizedBox(width: 160, child: Text('TANGGAL')),
        SizedBox(width: 120, child: Text('KASIR')),
        SizedBox(width: 110, child: Text('PEMBAYARAN')),
        SizedBox(width: 105, child: Text('STATUS')),
        Expanded(child: Text('TOTAL')),
        SizedBox(width: 65, child: Text('AKSI')),
      ],
    ),
  );

  Widget _saleRow(BuildContext context, Sale sale) {
    final method = sale.method == 'cash'
        ? 'Tunai'
        : sale.method == 'transfer'
        ? 'Transfer'
        : 'QRIS manual';
    final status = sale.status == 'synced'
        ? 'Sinkron'
        : sale.status == 'conflict'
        ? 'Konflik'
        : 'Tertunda';
    return SizedBox(
      height: 55,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(
          children: [
            SizedBox(
              width: 115,
              child: Text(
                sale.uuid.substring(0, 8).toUpperCase(),
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            SizedBox(
              width: 160,
              child: Text(
                DateFormat('dd/MM/yyyy  HH:mm').format(sale.createdAt),
                style: const TextStyle(fontSize: 12),
              ),
            ),
            SizedBox(
              width: 120,
              child: Text(
                sale.cashier,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12),
              ),
            ),
            SizedBox(
              width: 110,
              child: Text(method, style: const TextStyle(fontSize: 12)),
            ),
            SizedBox(
              width: 105,
              child: Text(
                status,
                style: TextStyle(
                  fontSize: 12,
                  color: sale.status == 'conflict'
                      ? Colors.red.shade800
                      : KukiColors.mocha,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            Expanded(
              child: Text(
                money(sale.total),
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
            ),
            SizedBox(
              width: 65,
              child: IconButton(
                tooltip: 'Detail & cetak struk',
                icon: const Icon(Icons.open_in_new, size: 18),
                onPressed: () => _details(context, sale),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _details(BuildContext context, Sale sale) async {
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Transaksi ${sale.uuid.substring(0, 8)}'),
        content: SizedBox(
          width: 440,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Kasir: ${sale.cashier}'),
                Text('Status: ${sale.status}'),
                Text(
                  'UUID: ${sale.uuid}',
                  style: const TextStyle(fontSize: 11),
                ),
                const Divider(),
                for (final line in sale.lines)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    title: Text(asText(line['name'])),
                    subtitle: Text(
                      '${line['quantity']} × ${money(asInt(line['unit_price']))}',
                    ),
                    trailing: Text(
                      money(
                        asInt(line['quantity']) * asInt(line['unit_price']),
                      ),
                    ),
                  ),
                const Divider(),
                Text('Subtotal: ${money(sale.subtotal)}'),
                Text('Diskon: ${money(sale.discount)}'),
                Text(
                  'Total: ${money(sale.total)}',
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                if (sale.note.isNotEmpty) Text('Keterangan: ${sale.note}'),
                if (sale.error?.isNotEmpty ?? false)
                  Text(
                    'Konflik: ${sale.error}',
                    style: const TextStyle(color: Colors.red),
                  ),
                if (sale.status == 'conflict')
                  const Text(
                    'Hubungi Admin untuk rekonsiliasi. '
                    'Jangan mengulang transaksi sebelum memeriksa server.',
                  ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Tutup'),
          ),
          FilledButton.icon(
            onPressed: () async {
              try {
                await ReceiptService.printSale(
                  sale,
                  paperWidthMm: widget.controller.receiptWidth,
                );
              } catch (e) {
                if (ctx.mounted) showError(ctx, e);
              }
            },
            icon: const Icon(Icons.print_outlined),
            label: const Text('Cetak Struk'),
          ),
        ],
      ),
    );
  }
}
