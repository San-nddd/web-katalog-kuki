import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class CameraScanner extends StatefulWidget {
  const CameraScanner({super.key});
  @override
  State<CameraScanner> createState() => _CameraScannerState();
}

class _CameraScannerState extends State<CameraScanner> {
  bool found = false;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Scan barcode produk')),
    body: Column(children: [
      const Padding(padding: EdgeInsets.all(16), child: Text('Arahkan kamera ke barcode Code 128 / EAN.')),
      Expanded(child: MobileScanner(onDetect: (capture) {
        if (found || capture.barcodes.isEmpty) return;
        final value = capture.barcodes.first.rawValue;
        if (value == null || value.isEmpty) return;
        found = true;
        Navigator.of(context).pop(value);
      })),
    ]),
  );
}
