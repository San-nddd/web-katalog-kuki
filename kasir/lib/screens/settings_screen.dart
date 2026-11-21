import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/models.dart';
import '../core/theme.dart';
import '../services/kuki_thermal_printer.dart';
import '../state/pos_controller.dart';
import '../widgets/common.dart';

class SettingsScreen extends StatelessWidget {
  final PosController controller;
  const SettingsScreen({super.key, required this.controller});
  @override
  Widget build(BuildContext context) => ListView(
    padding: KukiSpace.all(context),
    children: [
      const SectionLabel(
        'Pengaturan kasir',
        caption: 'Preferensi perangkat dan informasi sinkronisasi.',
      ),
      SizedBox(height: KukiSpace.loose(context)),
      Card(
        child: Column(
          children: [
            ListTile(
              title: const Text('Mode aplikasi'),
              subtitle: Text(controller.modeLabel),
            ),
            const Divider(height: 1),
            ListTile(
              title: const Text('Server Laravel'),
              subtitle: Text(
                controller.demo
                    ? 'Tidak digunakan saat DEMO'
                    : controller.api.baseUrl,
              ),
            ),
            const Divider(height: 1),
            ListTile(
              title: const Text('Kasir saat ini'),
              subtitle: Text('${controller.cashierName} (${controller.role})'),
            ),
            const Divider(height: 1),
            ListTile(
              title: const Text('Ukuran kertas struk'),
              subtitle: Text('${controller.receiptWidth} mm'),
              trailing: DropdownButton<int>(
                value: controller.receiptWidth,
                items: const [
                  DropdownMenuItem(value: 58, child: Text('58 mm')),
                  DropdownMenuItem(value: 80, child: Text('80 mm')),
                ],
                onChanged: (v) {
                  if (v != null) unawaited(controller.setReceiptWidth(v));
                },
              ),
            ),
            const Divider(height: 1),
            ListTile(
              title: const Text('Printer thermal'),
              subtitle: Text(
                KukiThermalPrinter.instance.printerName == null
                    ? 'Belum dipilih. Gunakan ikon printer di kanan atas.'
                    : '${KukiThermalPrinter.instance.printerName} · '
                          '${KukiThermalPrinter.instance.transport == KukiPrinterTransport.usb ? 'USB' : 'Bluetooth'}',
              ),
            ),
          ],
        ),
      ),
      SizedBox(height: KukiSpace.loose(context)),
      Card(
        child: Column(
          children: [
            ListTile(
              title: const Text('PIN pengunci perangkat'),
              subtitle: const Text(
                'PIN lokal sebagai kunci antarmuka, bukan pengganti autentikasi server.',
              ),
              trailing: OutlinedButton(
                onPressed: () => _setPin(context),
                child: const Text('Atur PIN'),
              ),
            ),
            ListTile(
              title: const Text('Kunci layar sekarang'),
              trailing: OutlinedButton(
                onPressed: () async {
                  if (!await controller.hasPin()) {
                    if (context.mounted) {
                      showError(context, 'Atur PIN terlebih dahulu');
                    }
                    return;
                  }
                  await controller.lock();
                },
                child: const Text('Kunci'),
              ),
            ),
            ListTile(
              title: const Text('Hapus PIN lokal'),
              trailing: TextButton(
                onPressed: () async {
                  await controller.removePin();
                },
                child: const Text('Hapus PIN'),
              ),
            ),
          ],
        ),
      ),
      SizedBox(height: KukiSpace.loose(context)),
      Card(
        child: ListTile(
          title: const Text('Sinkronisasi transaksi'),
          subtitle: Text(
            controller.sessionExpired
                ? 'Sesi kasir habis. Masuk ulang untuk melanjutkan sinkronisasi; data lokal tetap tersimpan.'
                : controller.demo
                ? 'Mode DEMO tidak pernah mengirim transaksi.'
                : '${controller.networkStatusError ?? 'Server ${controller.serverReachable == null
                              ? 'sedang diperiksa'
                              : controller.serverReachable!
                              ? 'dapat dijangkau'
                              : 'tidak dapat dijangkau'}.'} '
                      'Tertunda ${controller.pending}, belum selesai ${controller.unresolved}. Transaksi disinkronkan otomatis saat server dapat dijangkau.',
          ),
          trailing: FilledButton(
            onPressed:
                controller.demo ||
                    controller.syncing ||
                    controller.sessionExpired
                ? null
                : () async {
                    await controller.syncPending();
                    if (context.mounted && controller.error != null) {
                      showError(context, controller.error!);
                    }
                  },
            child: const Text('Sinkronkan'),
          ),
        ),
      ),
      SizedBox(height: KukiSpace.loose(context)),
      Card(
        child: ExpansionTile(
          title: const Text('Riwayat & rekonsiliasi shift'),
          subtitle: Text('${controller.shiftSummaries.length} shift tercatat'),
          children: controller.shiftSummaries.isEmpty
              ? const [ListTile(title: Text('Belum ada shift yang tercatat.'))]
              : controller.shiftSummaries.map(_shiftTile).toList(),
        ),
      ),
      SizedBox(height: KukiSpace.loose(context)),
      Card(
        child: ListTile(
          title: const Text('Keluar akun'),
          subtitle: Text(
            controller.shiftOpen
                ? 'Shift masih terbuka. Tutup shift terlebih dahulu sebelum keluar. Data lokal tidak dihapus.'
                : controller.syncing
                ? 'Sinkronisasi sedang berlangsung. Tunggu hingga selesai sebelum keluar. Data lokal tidak dihapus.'
                : 'Shift harus ditutup terlebih dahulu. Penjualan lokal yang belum sinkron tetap tersimpan di perangkat.',
          ),
          trailing: OutlinedButton(
            onPressed: controller.shiftOpen || controller.syncing
                ? null
                : () async {
                    final confirm = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Keluar dari POS?'),
                        content: const Text(
                          'Pastikan shift sudah ditutup dan transaksi tertunda ditangani. Data lokal tidak dihapus.',
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, false),
                            child: const Text('Batal'),
                          ),
                          FilledButton(
                            onPressed: () => Navigator.pop(ctx, true),
                            child: const Text('Keluar'),
                          ),
                        ],
                      ),
                    );
                    if (confirm != true) return;
                    try {
                      await controller.logout();
                    } catch (e) {
                      if (context.mounted) showError(context, e);
                    }
                  },
            child: const Text('Keluar'),
          ),
        ),
      ),
      SizedBox(height: KukiSpace.tight(context)),
      const Text(
        'PENTING: QRIS/transfer dicatat manual dan wajib diverifikasi kasir. Cetak struk memakai printer thermal Bluetooth/USB yang dipilih.',
        style: TextStyle(fontSize: 12, color: KukiColors.muted),
      ),
    ],
  );
  Widget _shiftTile(ShiftSummary shift) {
    String time(String value) {
      final parsed = DateTime.tryParse(value);
      return parsed == null
          ? '-'
          : DateFormat('dd/MM HH:mm').format(parsed.toLocal());
    }

    return ListTile(
      title: Text('Shift ${time(shift.openedAt)} — ${shift.cashier}'),
      subtitle: Text(
        shift.closedAt.isEmpty
            ? 'Masih terbuka'
            : 'Ditutup ${time(shift.closedAt)}',
      ),
      trailing: shift.conflicts
          ? const Icon(Icons.warning_amber_rounded, color: Colors.orange)
          : Icon(
              shift.closedAt.isEmpty
                  ? Icons.play_circle_outline
                  : Icons.check_circle_outline,
              color: shift.closedAt.isEmpty ? null : Colors.green,
            ),
    );
  }

  Future<void> _setPin(BuildContext context) async {
    var typedPin = '';
    final pin = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Buat / ganti PIN perangkat'),
        content: TextFormField(
          keyboardType: TextInputType.number,
          obscureText: true,
          maxLength: 6,
          onChanged: (value) => typedPin = value,
          decoration: const InputDecoration(labelText: 'PIN 4–6 angka'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, typedPin),
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
    if (pin == null) return;
    try {
      await controller.setPin(pin);
    } catch (e) {
      if (context.mounted) showError(context, e);
    }
  }
}
