import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:intl/intl.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'package:image/image.dart' as img;

import '../core/models.dart' as core;
import '../models.dart' as old;
import 'kuki_thermal_printer.dart';

class KukiThermalReceipt {
  KukiThermalReceipt._();

  static String _clean(String text) => text
      .replaceAll(RegExp(r'[^\x20-\x7E]'), ' ')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();

  static String _currency(int n) =>
      'Rp${NumberFormat.decimalPattern('id_ID').format(n)}';

  static String _methodLabel(String method) {
    switch (method.trim().toLowerCase()) {
      case 'cash':
        return 'Tunai';
      case 'transfer':
        return 'Transfer';
      case 'qris':
      case 'qris_manual':
        return 'QRIS (manual)';
      default:
        return method.isEmpty ? '-' : method.toUpperCase();
    }
  }

  static Future<List<int>> _header(Generator gen) async {
    final output = <int>[...gen.reset()];
    try {
      final data = await rootBundle.load('assets/branding/kuki_logo.png');
      final source = img.decodeImage(data.buffer.asUint8List());
      if (source != null) {
        final resized = img.copyResize(source, width: 160);
        output.addAll(gen.imageRaster(resized, align: PosAlign.center));
      }
    } catch (error) {
      debugPrint('Logo thermal tidak dimuat: $error');
    }
    output.addAll(<int>[
      ...gen.text('KUKI BAKEHOUSE',
          styles: const PosStyles(align: PosAlign.center, bold: true)),
      ...gen.text('Where Crumbs Become Art',
          styles: const PosStyles(align: PosAlign.center)),
      ...gen.hr(),
    ]);
    return output;
  }

  static Future<Generator> _generator() async {
    final profile = await CapabilityProfile.load();
    return Generator(
      KukiThermalPrinter.instance.paperWidthMm == 80
          ? PaperSize.mm80
          : PaperSize.mm58,
      profile,
    );
  }

  static Future<void> printPosReceipt(old.PosReceipt receipt) async {
    final g = await _generator();
    final b = await _header(g);
    b.addAll(g.text('No: ${_clean(receipt.number)}'));
    b.addAll(g.text('Kasir: ${_clean(receipt.cashier)}'));
    b.addAll(g.text('Waktu: ${receipt.date}'));
    if (receipt.customer != '-') {
      b.addAll(g.text('Pelanggan: ${_clean(receipt.customer)}'));
    }
    b.addAll(g.hr());
    for (final item in receipt.items) {
      b.addAll(g.text('${_clean('${item['nama']}')} x${item['jumlah']}'));
      b.addAll(g.text(_currency(old.asInt(item['total'])),
          styles: const PosStyles(align: PosAlign.right)));
    }
    b.addAll(g.hr());
    b.addAll(g.text('TOTAL: ${_currency(receipt.total)}',
        styles: const PosStyles(bold: true)));
    b.addAll(g.text('Metode: ${receipt.method.toUpperCase()}'));
    b.addAll(g.text('Dibayar: ${_currency(receipt.paid)}'));
    b.addAll(g.text('Kembali: ${_currency(receipt.change)}'));
    b.addAll(g.feed(1));
    b.addAll(g.text('Terima kasih!',
        styles: const PosStyles(align: PosAlign.center, bold: true)));
    b.addAll(g.feed(3));
    await KukiThermalPrinter.instance.write(b);
  }

  static Future<List<int>> buildSaleBytes(
    core.Sale sale, {
    int? paperWidthMm,
  }) async {
    if (paperWidthMm != null) {
      KukiThermalPrinter.instance.paperWidthMm = paperWidthMm == 80 ? 80 : 58;
    }
    final g = await _generator();
    final b = await _header(g);
    final shortNo = sale.uuid.length >= 8
        ? sale.uuid.substring(0, 8).toUpperCase()
        : sale.uuid.toUpperCase();
    b.addAll(g.text('No: ${_clean(shortNo)}'));
    b.addAll(g.text('Tanggal: ${DateFormat('dd/MM/yyyy HH:mm').format(sale.createdAt)}'));
    b.addAll(g.text('Kasir: ${_clean(sale.cashier.isEmpty ? '-' : sale.cashier)}'));
    if (sale.isCancelled) {
      b.addAll(g.text(
        'Status: ${sale.transactionStatus.toUpperCase()}',
        styles: const PosStyles(bold: true),
      ));
    }
    b.addAll(g.hr());
    for (final line in sale.lines) {
      final name = core.asText(line['name']);
      final qty = core.asInt(line['quantity']);
      final price = core.asInt(line['unit_price']);
      b.addAll(g.text(_clean(name)));
      b.addAll(g.text('$qty x ${_currency(price)}'));
      b.addAll(g.text(_currency(qty * price),
          styles: const PosStyles(align: PosAlign.right)));
    }
    b.addAll(g.hr());
    b.addAll(g.text('Subtotal: ${_currency(sale.subtotal)}'));
    if (sale.discount > 0) {
      b.addAll(g.text('Diskon: ${_currency(sale.discount)}'));
    }
    b.addAll(g.text('TOTAL: ${_currency(sale.total)}',
        styles: const PosStyles(bold: true)));
    b.addAll(g.text('Metode: ${_methodLabel(sale.method)}'));
    if (sale.method == 'cash') {
      b.addAll(g.text('Dibayar: ${_currency(sale.paid)}'));
      b.addAll(g.text('Kembalian: ${_currency(sale.change)}'));
    }
    b.addAll(g.feed(1));
    b.addAll(g.text('Terima kasih sudah berbelanja!',
        styles: const PosStyles(align: PosAlign.center, bold: true)));
    b.addAll(g.feed(3));
    return b;
  }

  static Future<void> printSale(core.Sale sale, {int? paperWidthMm}) async {
    final bytes = await buildSaleBytes(sale, paperWidthMm: paperWidthMm);
    await KukiThermalPrinter.instance.write(bytes);
  }
}
