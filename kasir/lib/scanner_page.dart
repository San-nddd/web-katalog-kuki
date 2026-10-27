import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class ScannerPage extends StatefulWidget {
  const ScannerPage({super.key});
  @override State<ScannerPage> createState() => _ScannerPageState();
}
class _ScannerPageState extends State<ScannerPage> {
  bool received = false;
  @override Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Scan Barcode Produk')),
    body: MobileScanner(onDetect: (capture) {
      if (received || capture.barcodes.isEmpty) return;
      final code = capture.barcodes.first.rawValue;
      if (code == null || code.isEmpty) return;
      received = true;
      Navigator.pop(context, code);
    }),
  );
}
