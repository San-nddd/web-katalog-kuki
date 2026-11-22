import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/models.dart';
import '../core/theme.dart';
import '../state/pos_controller.dart';
import '../widgets/common.dart';

class ReportScreen extends StatefulWidget {
  final PosController controller;
  const ReportScreen({super.key, required this.controller});
  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  int days = 7;
  Future<Map<String, dynamic>>? _apiReport;

  @override
  void initState() {
    super.initState();
    if (kIsWeb) _loadApiReport();
  }

  void _loadApiReport() {
    final until = DateTime.now();
    final from = DateTime(
      until.year,
      until.month,
      until.day,
    ).subtract(Duration(days: days - 1));
    _apiReport = widget.controller.api.report(from: from, until: until);
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final from = DateTime(
      now.year,
      now.month,
      now.day,
    ).subtract(Duration(days: days - 1));
    if (kIsWeb) return _buildApiReport(now);
    final data = widget.controller.history
        .where((s) => !s.createdAt.isBefore(from) && !s.isCancelled)
        .toList();
    final revenue = data.fold<int>(0, (sum, s) => sum + s.total);
    final cash = data
        .where((s) => s.method == 'cash')
        .fold<int>(0, (sum, s) => sum + s.total);
    final byProduct = <String, int>{};
    for (final sale in data) {
      for (final line in sale.lines) {
        final name = asText(line['name']);
        byProduct[name] = (byProduct[name] ?? 0) + asInt(line['quantity']);
      }
    }
    final byCashier = <String, int>{};
    for (final sale in data) {
      final name = sale.cashier.isEmpty ? 'Kasir' : sale.cashier;
      byCashier[name] = (byCashier[name] ?? 0) + sale.total;
    }
    final ranked = byProduct.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return Padding(
      padding: KukiSpace.all(context),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: SectionLabel(
                  'Laporan Penjualan',
                  caption: 'Ringkasan dari transaksi pada perangkat ini.',
                ),
              ),
              Text(
                DateFormat('dd MMM yyyy').format(now),
                style: KukiText.bodySmall,
              ),
            ],
          ),
          SizedBox(height: KukiSpace.normal(context)),
          Wrap(
            spacing: KukiSpace.tight(context),
            children: [
              for (final d in [1, 7, 30])
                ChoiceChip(
                  label: Text(d == 1 ? 'Hari ini' : '$d hari'),
                  selected: days == d,
                  onSelected: (_) => setState(() => days = d),
                ),
            ],
          ),
          SizedBox(height: KukiSpace.normal(context)),
          Wrap(
            spacing: KukiSpace.normal(context),
            runSpacing: KukiSpace.normal(context),
            children: [
              _summary(context,
                'Total Penjualan',
                money(revenue),
                Icons.payments_outlined,
              ),
              _summary(context,
                'Transaksi',
                '${data.length}',
                Icons.receipt_long_outlined,
              ),
              _summary(context,'Pembayaran Tunai', money(cash), Icons.wallet_outlined),
              _summary(context,
                'Transfer + QRIS',
                money(revenue - cash),
                Icons.qr_code_2_outlined,
              ),
            ],
          ),
          SizedBox(height: KukiSpace.normal(context)),
          const Text('Penjualan per kasir', style: KukiText.section),
          SizedBox(height: KukiSpace.tight(context)),
          Wrap(
            spacing: KukiSpace.tight(context),
            runSpacing: KukiSpace.tight(context),
            children: [
              for (final entry in byCashier.entries)
                Chip(label: Text('${entry.key}: ${money(entry.value)}')),
            ],
          ),
          SizedBox(height: KukiSpace.loose(context)),
          const Text('Produk Terlaris', style: KukiText.section),
          SizedBox(height: KukiSpace.tight(context)),
          Expanded(
            child: Container(
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: KukiColors.paper,
                border: Border.all(color: KukiColors.line),
                borderRadius: BorderRadius.circular(KukiRadius.md),
              ),
              child: Column(
                children: [
                  Container(
                    height: 44,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: const BoxDecoration(
                      color: KukiColors.cream,
                      borderRadius: BorderRadius.vertical(
                        top: Radius.circular(KukiRadius.md),
                      ),
                    ),
                    child: const Row(
                      children: [
                        SizedBox(
                          width: 56,
                          child: Text('NO.', style: KukiText.labelSmall),
                        ),
                        Expanded(
                          child: Text(
                            'NAMA PRODUK',
                            style: KukiText.labelSmall,
                          ),
                        ),
                        SizedBox(
                          width: 100,
                          child: Text('JUMLAH', style: KukiText.labelSmall),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: ranked.isEmpty
                        ? const Center(
                            child: Text(
                              'Belum ada transaksi pada periode ini.',
                              style: KukiText.bodyMedium,
                            ),
                          )
                        : ListView.separated(
                            itemCount: ranked.length,
                            separatorBuilder: (_, _) => const Divider(
                              height: 1,
                              color: KukiColors.line,
                            ),
                            itemBuilder: (_, i) => Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 14,
                              ),
                              child: Row(
                                children: [
                                  SizedBox(
                                    width: 56,
                                    child: Text(
                                      '${i + 1}',
                                      style: KukiText.bodySmall,
                                    ),
                                  ),
                                  Expanded(
                                    child: Text(
                                      ranked[i].key,
                                      style: KukiText.titleSmall,
                                    ),
                                  ),
                                  SizedBox(
                                    width: 100,
                                    child: Text(
                                      '${ranked[i].value} terjual',
                                      style: KukiText.bodySmall,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                  ),
                ],
              ),
            ),
          ),
          SizedBox(height: KukiSpace.tight(context)),
          Text(
            'Sinkronisasi tertunda: ${widget.controller.pending} · '
            'Data laporan hanya dari transaksi yang tersimpan di perangkat ini.',
            style: KukiText.labelSmall,
          ),
        ],
      ),
    );
  }

  Widget _buildApiReport(DateTime now) => Padding(
    padding: KukiSpace.all(context),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: SectionLabel(
                'Laporan Penjualan',
                caption: 'Ringkasan transaksi dari Laravel/MySQL.',
              ),
            ),
            Text(
              DateFormat('dd MMM yyyy').format(now),
              style: KukiText.bodySmall,
            ),
            IconButton(
              tooltip: 'Muat ulang laporan',
              onPressed: () => setState(_loadApiReport),
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        SizedBox(height: KukiSpace.normal(context)),
        Wrap(
          spacing: KukiSpace.tight(context),
          children: [
            for (final d in [1, 7, 30])
              ChoiceChip(
                label: Text(d == 1 ? 'Hari ini' : '$d hari'),
                selected: days == d,
                onSelected: (_) => setState(() {
                  days = d;
                  _loadApiReport();
                }),
              ),
          ],
        ),
        SizedBox(height: KukiSpace.normal(context)),
        Expanded(
          child: FutureBuilder<Map<String, dynamic>>(
            future: _apiReport,
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                return Center(
                  child: Text(
                    'Laporan gagal dimuat: ${snapshot.error}',
                    style: KukiText.bodyMedium.copyWith(
                      color: KukiColors.danger,
                    ),
                    textAlign: TextAlign.center,
                  ),
                );
              }
              if (!snapshot.hasData) {
                return const Center(child: CircularProgressIndicator());
              }
              final report = snapshot.data!;
              final methods = unwrapList(
                report['per_metode'],
              ).map(unwrapMap).toList();
              final revenue = asInt(report['total_penjualan']);
              final count = asInt(report['jumlah_transaksi']);
              final cash = methods
                  .where((item) => item['metode_bayar'] == 'tunai')
                  .fold<int>(0, (sum, item) => sum + asInt(item['total']));
              return SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                  Wrap(
                    spacing: KukiSpace.normal(context),
                    runSpacing: KukiSpace.normal(context),
                    children: [
                      _summary(context,
                        'Total Penjualan',
                        money(revenue),
                        Icons.payments_outlined,
                      ),
                      _summary(context,
                        'Transaksi',
                        '$count',
                        Icons.receipt_long_outlined,
                      ),
                      _summary(context,
                        'Pembayaran Tunai',
                        money(cash),
                        Icons.wallet_outlined,
                      ),
                      _summary(context,
                        'Transfer + QRIS',
                        money(revenue - cash),
                        Icons.qr_code_2_outlined,
                      ),
                    ],
                  ),
                  SizedBox(height: KukiSpace.loose(context)),
                  const Text(
                    'Penjualan per Metode',
                    style: KukiText.section,
                  ),
                  SizedBox(height: KukiSpace.tight(context)),
                  SizedBox(
                    height: KukiSpace.height(context, 22, min: 140, max: 220),
                    child: Container(
                      clipBehavior: Clip.antiAlias,
                      decoration: BoxDecoration(
                        color: KukiColors.paper,
                        border: Border.all(color: KukiColors.line),
                        borderRadius: BorderRadius.circular(KukiRadius.md),
                      ),
                      child: methods.isEmpty
                          ? const Center(
                              child: Text(
                                'Belum ada transaksi pada periode ini.',
                                style: KukiText.bodyMedium,
                              ),
                            )
                          : ListView.separated(
                              itemCount: methods.length,
                              separatorBuilder: (_, _) =>
                                  const Divider(height: 1),
                              itemBuilder: (_, index) {
                                final item = methods[index];
                                return ListTile(
                                  title: Text(
                                    asText(item['metode_bayar']).toUpperCase(),
                                    style: KukiText.titleSmall,
                                  ),
                                  subtitle: Text(
                                    '${asInt(item['jumlah'])} transaksi',
                                    style: KukiText.bodySmall,
                                  ),
                                  trailing: Text(
                                    money(asInt(item['total'])),
                                    style: KukiText.titleSmall,
                                  ),
                                );
                              },
                            ),
                    ),
                  ),
                  SizedBox(height: KukiSpace.normal(context)),
                  const Text('Penjualan per kasir', style: KukiText.section),
                  SizedBox(height: KukiSpace.tight(context)),
                  Wrap(
                    spacing: KukiSpace.tight(context),
                    runSpacing: KukiSpace.tight(context),
                    children: [
                      for (final item in unwrapList(report['per_kasir']).map(unwrapMap))
                        Chip(
                          label: Text(
                            '${asText(item['kasir'])}: ${money(asInt(item['total']))}',
                          ),
                        ),
                    ],
                  ),
                  SizedBox(height: KukiSpace.normal(context)),
                  const Text('Produk terlaris', style: KukiText.section),
                  SizedBox(height: KukiSpace.tight(context)),
                  Wrap(
                    spacing: KukiSpace.tight(context),
                    runSpacing: KukiSpace.tight(context),
                    children: [
                      for (final item in unwrapList(report['per_produk']).map(unwrapMap))
                        Chip(
                          label: Text(
                            '${asText(item['nama'])}: ${asInt(item['jumlah'])} terjual',
                          ),
                        ),
                    ],
                  ),
                 ],
                ),
              );
             },
          ),
        ),
      ],
    ),
  );

  Widget _summary(
    BuildContext context,
    String label,
    String value,
    IconData icon,
  ) => SizedBox(
    width: KukiSpace.width(context, 16.4, min: 170, max: 250),
    height: KukiSpace.height(context, 13.8, min: 96, max: 130),
    child: Container(
      padding: EdgeInsets.all(KukiSpace.normal(context)),
      decoration: BoxDecoration(
        color: KukiColors.paper,
        borderRadius: BorderRadius.circular(KukiRadius.md),
        border: Border.all(color: KukiColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: KukiColors.peach,
              borderRadius: BorderRadius.circular(KukiRadius.sm),
            ),
            child: Icon(icon, color: KukiColors.mocha, size: 20),
          ),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: KukiText.headlineSmall,
          ),
          Text(label, style: KukiText.bodySmall),
        ],
      ),
    ),
  );
}
