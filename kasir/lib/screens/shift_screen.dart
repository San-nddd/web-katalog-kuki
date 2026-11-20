import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../core/models.dart';
import '../core/theme.dart';
import '../state/pos_controller.dart';
import '../widgets/common.dart';

class ShiftScreen extends StatefulWidget {
  final PosController controller;
  const ShiftScreen({super.key, required this.controller});
  @override
  State<ShiftScreen> createState() => _ShiftScreenState();
}

class _ShiftScreenState extends State<ShiftScreen> {
  final note = TextEditingController();
  @override
  void dispose() {
    note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = widget.controller;
    return Center(
      child: SingleChildScrollView(
        padding: KukiSpace.all(context, percent: 1.9, min: 14, max: 36),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: KukiSpace.width(context, 55, min: 320, max: 720),
          ),
          child: Card(
            child: Padding(
              padding: KukiSpace.all(context, percent: 1.9, min: 14, max: 36),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SectionLabel(
                    ctrl.shiftOpen ? 'Shift kasir aktif' : 'Buka shift kasir',
                    caption: kIsWeb
                        ? 'Status shift tersimpan di Laravel. API belum menyediakan rekonsiliasi kas akhir.'
                        : 'Untuk memulai operasional kasir dan melihat estimasi kas shift.',
                  ),
                  SizedBox(height: KukiSpace.normal(context)),
                  if (ctrl.shiftOpen) ...[
                    const Chip(
                      label: Text('SHIFT TERBUKA'),
                      backgroundColor: KukiColors.peach,
                    ),
                    Text('Kasir: ${ctrl.cashierName}'),
                    Text(
                      'ID: ${ctrl.activeShift}',
                      style: const TextStyle(fontSize: 11),
                    ),
                    SizedBox(height: KukiSpace.normal(context)),
                    if (!kIsWeb)
                      FutureBuilder<int>(
                        future: ctrl.expectedCash(),
                        builder: (_, snapshot) => Text(
                          'Estimasi kas (modal + penjualan tunai lokal): ${money(snapshot.data ?? 0)}',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                    SizedBox(height: KukiSpace.normal(context)),
                    if (!kIsWeb)
                      TextField(
                        controller: note,
                        maxLines: 2,
                        decoration: const InputDecoration(
                          labelText: 'Catatan penutupan (opsional)',
                        ),
                      ),
                    SizedBox(height: KukiSpace.normal(context)),
                    FilledButton.icon(
                      icon: const Icon(Icons.lock_clock),
                      label: const Text('Tutup shift'),
                      onPressed: () async {
                        final amount = kIsWeb
                            ? 0
                            : await askAmount(
                                context,
                                title: 'Kas fisik akhir shift',
                              );
                        if (amount == null) return;
                        try {
                          await ctrl.endShift(amount, note.text);
                        } catch (e) {
                          if (context.mounted) showError(context, e);
                        }
                      },
                    ),
                  ] else ...[
                    Text(
                      kIsWeb
                          ? 'Buka shift di Laravel sebelum menerima pembayaran.'
                          : 'Buka shift sebelum menerima pembayaran.',
                    ),
                    SizedBox(height: KukiSpace.normal(context)),
                    FilledButton.icon(
                      icon: const Icon(Icons.play_arrow),
                      label: const Text('Buka shift'),
                      onPressed: () async {
                        try {
                          await ctrl.openShift();
                        } catch (e) {
                          if (context.mounted) showError(context, e);
                        }
                      },
                    ),
                  ],
                  SizedBox(height: KukiSpace.loose(context)),
                  Text(
                    kIsWeb
                        ? 'API menyimpan waktu buka/tutup shift. Rekonsiliasi kas akhir dan catatan shift belum tersedia.'
                        : 'Catatan: Shift dan transaksi diselaraskan dengan Laravel saat koneksi tersedia.',
                    style: const TextStyle(
                      fontSize: 12,
                      color: KukiColors.muted,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
