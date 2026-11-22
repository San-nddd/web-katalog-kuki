import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:flutter/services.dart';
import 'models.dart';

Future<void> printReceipt(PosReceipt receipt) async {
  final logoBytes = (await rootBundle.load(
    'assets/branding/kuki_logo.png',
  )).buffer.asUint8List();
  final document = pw.Document();
  document.addPage(
    pw.Page(
      pageFormat: const PdfPageFormat(226.77, 600, marginAll: 12),
      build: (_) => pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Center(child: pw.Image(pw.MemoryImage(logoBytes), width: 80)),
          pw.Center(
            child: pw.Text(
              'KUKI BAKEHOUSE',
              style: pw.TextStyle(fontSize: 15, fontWeight: pw.FontWeight.bold),
            ),
          ),
          pw.Center(child: pw.Text('Bukti Pembayaran')),
          pw.Divider(),
          pw.Text('No: ${receipt.number}'),
          pw.Text('Kasir: ${receipt.cashier}'),
          pw.Text('Waktu: ${receipt.date}'),
          if (receipt.customer != '-')
            pw.Text('Pelanggan: ${receipt.customer}'),
          pw.Divider(),
          ...receipt.items.map(
            (item) => pw.Padding(
              padding: const pw.EdgeInsets.symmetric(vertical: 2),
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Expanded(
                    child: pw.Text('${item['nama']} x${item['jumlah']}'),
                  ),
                  pw.Text(rupiah(asInt(item['total']))),
                ],
              ),
            ),
          ),
          pw.Divider(),
          pw.Text(
            'TOTAL: ${rupiah(receipt.total)}',
            style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
          ),
          pw.Text('Metode: ${receipt.method.toUpperCase()}'),
          pw.Text('Dibayar: ${rupiah(receipt.paid)}'),
          pw.Text('Kembali: ${rupiah(receipt.change)}'),
          pw.SizedBox(height: 15),
          pw.SizedBox(height: 15),

          pw.Container(
            width: double.infinity,
            alignment: pw.Alignment.center,
            child: pw.Text(
              'Terima kasih!',
              textAlign: pw.TextAlign.center,
              style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold),
            ),
          ),

          pw.SizedBox(height: 8),
        ],
      ),
    ),
  );
  await Printing.layoutPdf(
    name: 'Struk_${receipt.number}',
    onLayout: (_) => document.save(),
  );
}
