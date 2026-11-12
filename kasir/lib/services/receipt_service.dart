import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import '../core/models.dart';

class ReceiptService {
  static Future<void> printSale(Sale sale, {int paperWidthMm = 80}) async {
    final doc = pw.Document();
    final pageWidth = paperWidthMm * PdfPageFormat.mm;
    final height = (130 + sale.lines.length * 11) * PdfPageFormat.mm;
    doc.addPage(pw.Page(
      pageFormat: PdfPageFormat(pageWidth, height, marginAll: 7 * PdfPageFormat.mm),
      build: (_) => pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.stretch,
        children: [
          pw.Center(child: pw.Text('KUKI BAKEHOUSE', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 14))),
          pw.SizedBox(height: 5),
          pw.Center(child: pw.Text('Where Crumbs Become Art', style: const pw.TextStyle(fontSize: 8))),
          pw.Divider(),
          pw.Text('No: ${sale.uuid.substring(0, 8).toUpperCase()}'),
          pw.Text(DateFormat('dd/MM/yyyy HH:mm').format(sale.createdAt)),
          pw.Text('Kasir: ${sale.cashier}'),
          pw.Divider(),
          ...sale.lines.map((l) => pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(asText(l['name']), style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
              pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceBetween, children: [
                pw.Text('${l['quantity']} x ${money(asInt(l['unit_price']))}'),
                pw.Text(money(asInt(l['quantity']) * asInt(l['unit_price']))),
              ]), pw.SizedBox(height: 3),
            ],
          )),
          pw.Divider(),
          _amount('Subtotal', sale.subtotal),
          _amount('Diskon', sale.discount),
          _amount('TOTAL', sale.total, bold: true),
          _amount(sale.method == 'cash' ? 'Tunai' : 'Bayar', sale.paid),
          if (sale.method == 'cash') _amount('Kembalian', sale.change),
          pw.SizedBox(height: 9),
          pw.Center(child: pw.Text(sale.status == 'synced' ? 'Tercatat di server' : 'Tersimpan lokal - sinkronisasi tertunda', style: const pw.TextStyle(fontSize: 8))),
          pw.SizedBox(height: 8),
          pw.Center(child: pw.Text('Terima kasih!')),
        ],
      ),
    ));
    await Printing.layoutPdf(onLayout: (_) => doc.save(), name: 'kuki-${sale.uuid.substring(0, 8)}');
  }
  static pw.Widget _amount(String label, int value, {bool bold = false}) => pw.Row(
    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
    children: [pw.Text(label, style: bold ? pw.TextStyle(fontWeight: pw.FontWeight.bold) : null),
      pw.Text(money(value), style: bold ? pw.TextStyle(fontWeight: pw.FontWeight.bold) : null)],
  );
}
