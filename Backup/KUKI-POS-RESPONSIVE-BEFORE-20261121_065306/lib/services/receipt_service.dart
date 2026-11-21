import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import '../core/models.dart';

class ReceiptService {
  static Future<void> printSale(Sale sale, {int paperWidthMm = 80}) async {
    pw.MemoryImage? logo;

    try {
      final data = await rootBundle.load('assets/branding/kuki_logo.png');

      logo = pw.MemoryImage(
        data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes),
      );

      debugPrint('Logo Kuki berhasil dimuat');
    } catch (e) {
      debugPrint('Gagal memuat logo Kuki: $e');
    }

    final widthMm = paperWidthMm == 58 ? 58 : 80;
    final pageWidth = widthMm * PdfPageFormat.mm;
    final marginMm = widthMm == 58 ? 4.0 : 7.0;
    final logoWidthMm = widthMm == 58 ? 22.0 : 33.0;
    final heightMm = 160 + sale.lines.length * 14;
    final pageHeight = heightMm * PdfPageFormat.mm;

    final doc = pw.Document();

    doc.addPage(
      pw.Page(
        pageFormat: PdfPageFormat(
          pageWidth,
          pageHeight,
          marginAll: marginMm * PdfPageFormat.mm,
        ),
        build: (_) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.stretch,
          children: [
            // Logo Kuki
            if (logo != null) ...[
              pw.Center(
                child: pw.Container(
                  color: PdfColors.white,
                  child: pw.Image(
                    logo,
                    width: logoWidthMm * PdfPageFormat.mm,
                    height: logoWidthMm * PdfPageFormat.mm,
                    fit: pw.BoxFit.contain,
                  ),
                ),
              ),
              pw.SizedBox(height: 6),
            ],

            pw.Center(
              child: pw.Text(
                'KUKI BAKEHOUSE',
                style: pw.TextStyle(
                  fontWeight: pw.FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),

            pw.SizedBox(height: 5),

            // TAGLINE
            pw.Center(
              child: pw.Text(
                'Where Crumbs Become Art',
                style: const pw.TextStyle(fontSize: 8),
              ),
            ),

            pw.Divider(),

            // Info Transaksi
            pw.Text('No: ${sale.uuid.substring(0, 8).toUpperCase()}'),

            pw.Text(DateFormat('dd/MM/yyyy HH:mm').format(sale.createdAt)),
            pw.Divider(),
            // Daftar Produk
            ...sale.lines.map(
              (l) => pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(
                    asText(l['name']),
                    style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                  ),
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text(
                        '${l['quantity']} x '
                        '${money(asInt(l['unit_price']))}',
                      ),
                      pw.Text(
                        money(asInt(l['quantity']) * asInt(l['unit_price'])),
                      ),
                    ],
                  ),
                  pw.SizedBox(height: 3),
                ],
              ),
            ),
            pw.Divider(),
            // Total, Diskon, Bayar, Kembalian
            _amount('Subtotal', sale.subtotal),
            _amount('Diskon', sale.discount),
            _amount('TOTAL', sale.total, bold: true),
            _amount(sale.method == 'cash' ? 'Tunai' : 'Bayar', sale.paid),
            if (sale.method == 'cash') _amount('Kembalian', sale.change),
            pw.SizedBox(height: 15),
            pw.Container(
              width: double.infinity,
              alignment: pw.Alignment.center,
              child: pw.Text(
                'Terima kasih sudah berbelanja! Kapan-kapan mampir lagi yaa:)',
                textAlign: pw.TextAlign.center,
                style: pw.TextStyle(
                  fontSize: 11,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
            ),

            pw.SizedBox(height: 8),
          ],
        ),
      ),
    );
    await Printing.layoutPdf(
      onLayout: (_) => doc.save(),
      name: 'kuki-${sale.uuid.substring(0, 8)}',
    );
  }

  static pw.Widget _amount(String label, int value, {bool bold = false}) {
    return pw.Row(
      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
      children: [
        pw.Text(
          label,
          style: bold ? pw.TextStyle(fontWeight: pw.FontWeight.bold) : null,
        ),
        pw.Text(
          money(value),
          style: bold ? pw.TextStyle(fontWeight: pw.FontWeight.bold) : null,
        ),
      ],
    );
  }
}
