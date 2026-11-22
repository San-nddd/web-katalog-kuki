import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
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
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(KukiRadius.lg),
              side: const BorderSide(color: KukiColors.line),
            ),
            child: Padding(
              padding: KukiSpace.all(context, percent: 1.9, min: 14, max: 36),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SectionLabel(
                    ctrl.shiftOpen ? 'Shift kasir aktif' : 'Buka shift kasir',
                    caption: kIsWeb
                        ? 'Status shift tersimpan di Laravel.'
                        : 'Untuk memulai operasional kasir.',
                  ),
                  SizedBox(height: KukiSpace.normal(context)),
                  if (ctrl.shiftOpen) ...[
                    const Chip(
                      label: Text('SHIFT TERBUKA', style: KukiText.labelMedium),
                      backgroundColor: KukiColors.successSurface,
                      side: BorderSide(color: KukiColors.success),
                    ),
                    Text(
                      'Kasir: ${ctrl.cashierName}',
                      style: KukiText.bodyMedium,
                    ),
                    Text(
                      'ID: ${ctrl.activeShift}',
                      style: KukiText.bodySmall,
                    ),
                    SizedBox(height: KukiSpace.normal(context)),
                    FilledButton.icon(
                      icon: const Icon(Icons.lock_clock),
                      label: const Text('Tutup shift'),
                      onPressed: () async {
                        final confirm = await showDialog<bool>(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            scrollable: true,
                            title: const Text('Tutup shift sekarang?'),
                            content: const Text(
                              'Shift akan ditutup dan transaksi tertunda tetap disinkronkan saat koneksi tersedia.',
                              style: KukiText.bodyMedium,
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(ctx, false),
                                child: const Text('Batal'),
                              ),
                              FilledButton(
                                onPressed: () => Navigator.pop(ctx, true),
                                child: const Text('Tutup shift'),
                              ),
                            ],
                          ),
                        );
                        if (confirm != true) return;
                        try {
                          await ctrl.endShift();
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
                      style: KukiText.bodyMedium,
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
                        ? 'API menyimpan waktu buka dan tutup shift.'
                        : 'Catatan: Shift dan transaksi diselaraskan dengan Laravel. Jika sesi habis, masuk ulang; data lokal tetap tersimpan.',
                    style: KukiText.bodySmall,
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
