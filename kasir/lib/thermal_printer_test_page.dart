import 'dart:async';

import 'package:flutter/material.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';

import '../core/theme.dart';
import '../services/kuki_thermal_printer.dart';
import '../state/pos_controller.dart';

class KukiPrinterSettingsPage extends StatefulWidget {
  const KukiPrinterSettingsPage({super.key, required this.controller});

  final PosController controller;

  @override
  State<KukiPrinterSettingsPage> createState() => _KukiPrinterSettingsPageState();
}

class _KukiPrinterSettingsPageState extends State<KukiPrinterSettingsPage> {
  final service = KukiThermalPrinter.instance;
  List<BluetoothInfo> bluetooth = [];
  List<KukiUsbPrinter> usb = [];
  bool busy = false;
  String status = 'Pilih printer Bluetooth atau USB OTG untuk mencetak struk transaksi.';

  @override
  void initState() {
    super.initState();
    service.paperWidthMm = widget.controller.receiptWidth;
  }

  void _message(String value) {
    if (!mounted) return;
    setState(() => status = value);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(value)));
  }

  Future<void> _operation(Future<void> Function() action) async {
    if (busy) return;
    setState(() => busy = true);
    try {
      await action();
    } catch (error) {
      _message(KukiPrinterErrors.messageFor(error));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> findBluetooth() => _operation(() async {
    final devices = await service.pairedBluetoothPrinters();
    if (!mounted) return;
    setState(() => bluetooth = devices);
    _message(devices.isEmpty
        ? 'Tidak ada perangkat paired. Pasangkan printer di pengaturan Bluetooth HP.'
        : '${devices.length} perangkat Bluetooth dipasangkan. Ketuk printer untuk memilih.');
  });

  Future<void> findUsb() => _operation(() async {
    final devices = await service.usbPrinters();
    if (!mounted) return;
    setState(() => usb = devices);
    _message(devices.isEmpty
        ? 'Printer USB tidak ditemukan. Cek kabel OTG data, dukungan USB host, dan daya printer.'
        : '${devices.length} perangkat USB ditemukan. Ketuk printer untuk memilih.');
  });

  Future<void> connectBluetooth(BluetoothInfo item) => _operation(() async {
    await service.connectBluetooth(item);
    _message('Printer Bluetooth dipilih: ${item.name}');
  });

  Future<void> connectUsb(KukiUsbPrinter item) => _operation(() async {
    await service.connectUsb(item);
    _message('Printer USB dipilih: ${item.name}');
  });

  Future<void> disconnect() => _operation(() async {
    await service.disconnect();
    _message('Printer diputus. Pilih printer lagi sebelum mencetak struk.');
  });

  Future<void> setWidth(int value) => _operation(() async {
    await widget.controller.setReceiptWidth(value);
    service.paperWidthMm = widget.controller.receiptWidth;
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: true,
      appBar: AppBar(title: const Text('Printer Thermal Kuki')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: KukiSpace.all(context),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: KukiSpace.all(context, percent: 1.2, min: 12, max: 16),
                decoration: BoxDecoration(
                  color: KukiColors.paper,
                  border: Border.all(color: KukiColors.line),
                  borderRadius: BorderRadius.circular(KukiRadius.md),
                ),
                child: const Text(
                  'Gunakan halaman ini hanya untuk memilih printer dan lebar kertas. '
                  'Struk dicetak dari transaksi yang tersimpan, bukan dari teks pengujian.',
                  style: KukiText.bodyMedium,
                ),
              ),
              SizedBox(height: KukiSpace.normal(context)),
              Text(status, style: KukiText.bodySmall),
              SizedBox(height: KukiSpace.normal(context)),
              Row(children: [
                Expanded(child: FilledButton.icon(
                  onPressed: findBluetooth,
                  icon: const Icon(Icons.bluetooth_searching),
                  label: const Text('Cari Bluetooth'),
                )),
                SizedBox(width: KukiSpace.normal(context)),
                Expanded(child: OutlinedButton.icon(
                  onPressed: findUsb,
                  icon: const Icon(Icons.usb),
                  label: const Text('Cari USB OTG'),
                )),
              ]),
              SizedBox(height: KukiSpace.tight(context)),
              Wrap(crossAxisAlignment: WrapCrossAlignment.center, children: [
                const Text('Lebar kertas: ', style: KukiText.bodySmall),
                DropdownButton<int>(
                  value: widget.controller.receiptWidth,
                  style: KukiText.labelMedium,
                  items: const [
                    DropdownMenuItem(value: 58, child: Text('58 mm')),
                    DropdownMenuItem(value: 80, child: Text('80 mm')),
                  ],
                  onChanged: busy ? null : (n) {
                    if (n != null) unawaited(setWidth(n));
                  },
                ),
              ]),
              if (busy) const LinearProgressIndicator(),
              ListView(
                shrinkWrap: true,
                primary: false,
                children: [
                  if (bluetooth.isNotEmpty) const ListTile(title: Text('Bluetooth dipasangkan')),
                  ...bluetooth.map((p) => ListTile(
                    leading: const Icon(Icons.bluetooth),
                    title: Text(p.name),
                    subtitle: Text(p.macAdress),
                    trailing: service.transport == KukiPrinterTransport.bluetooth &&
                            service.bluetoothAddress == p.macAdress
                        ? const Icon(Icons.check_circle, color: KukiColors.success)
                        : null,
                    onTap: busy ? null : () => connectBluetooth(p),
                  )),
                  if (usb.isNotEmpty) const ListTile(title: Text('Printer USB OTG')),
                  ...usb.map((p) => ListTile(
                    leading: const Icon(Icons.usb),
                    title: Text(p.name),
                    subtitle: Text('VID ${p.vendorId} / PID ${p.productId} / ID ${p.deviceId}'),
                    trailing: service.transport == KukiPrinterTransport.usb &&
                            service.usbDeviceId == p.deviceId
                        ? const Icon(Icons.check_circle, color: KukiColors.success)
                        : null,
                    onTap: busy ? null : () => connectUsb(p),
                  )),
                  if (bluetooth.isEmpty && usb.isEmpty)
                    const ListTile(
                      title: Text('Belum ada printer ditemukan'),
                      subtitle: Text('Aktifkan Bluetooth atau colokkan printer melalui OTG data.'),
                    ),
                ],
              ),
              Text('Terpilih: ${service.printerName ?? '-'}',
                  style: KukiText.bodySmall),
              OutlinedButton.icon(
                onPressed: service.transport == null || busy ? null : disconnect,
                icon: const Icon(Icons.link_off),
                label: const Text('Putuskan Printer'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
