import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../state/pos_controller.dart';
import '../widgets/common.dart';

class SettingsScreen extends StatelessWidget {
  final PosController controller;
  const SettingsScreen({super.key, required this.controller});
  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(20),
    children: [
      const SectionLabel(
        'Pengaturan kasir',
        caption: 'Preferensi perangkat dan informasi sinkronisasi.',
      ),
      const SizedBox(height: 18),
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
                  if (v != null) controller.setReceiptWidth(v);
                },
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 14),
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
      const SizedBox(height: 14),
      Card(
        child: ListTile(
          title: const Text('Sinkronisasi transaksi'),
          subtitle: Text(
            controller.demo
                ? 'Mode DEMO tidak pernah mengirim transaksi.'
                : '${controller.networkStatusError ?? 'Server ${controller.serverReachable == null
                              ? 'sedang diperiksa'
                              : controller.serverReachable!
                              ? 'dapat dijangkau'
                              : 'tidak dapat dijangkau'}.'} '
                      'Tertunda ${controller.pending}. Transaksi disinkronkan otomatis saat server dapat dijangkau.',
          ),
          trailing: FilledButton(
            onPressed: controller.demo || controller.syncing
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
      const SizedBox(height: 14),
      Card(
        child: ListTile(
          title: const Text('Keluar akun'),
          subtitle: const Text(
            'Penjualan lokal yang belum sinkron tetap tersimpan di perangkat.',
          ),
          trailing: OutlinedButton(
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Keluar dari POS?'),
                  content: const Text(
                    'Pastikan transaksi tertunda ditangani. Data lokal tidak dihapus.',
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
              if (confirm == true) await controller.logout();
            },
            child: const Text('Keluar'),
          ),
        ),
      ),
      const SizedBox(height: 10),
      const Text(
        'PENTING: printer Bluetooth ESC/POS langsung, payment gateway QRIS, dan sync shift ke backend belum diaktifkan. Cetak struk memakai dialog printer sistem.',
        style: TextStyle(fontSize: 12, color: KukiColors.muted),
      ),
    ],
  );
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
