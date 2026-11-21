import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/theme.dart';
import '../state/pos_controller.dart';
import '../widgets/common.dart';

class LoginScreen extends StatefulWidget {
  final PosController controller;
  const LoginScreen({super.key, required this.controller});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final kode = TextEditingController();
  final pin = TextEditingController();
  late final TextEditingController server = TextEditingController(
    text: widget.controller.api.baseUrl,
  );
  bool working = false;

  @override
  void dispose() {
    kode.dispose();
    server.dispose();
    pin.dispose();
    super.dispose();
  }

  Future<void> login() async {
    if (working) return;
    if (kode.text.trim().isEmpty) {
      showError(context, 'Masukkan ID kasir, contoh KASIR01.');
      return;
    }
    if (!RegExp(r'^[0-9]{4,8}$').hasMatch(pin.text)) {
      showError(context, 'PIN harus terdiri dari 4–8 digit angka.');
      return;
    }
    setState(() => working = true);
    try {
      await widget.controller.login(server.text, kode.text, pin.text);
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => working = false);
    }
  }

  Future<void> startDemo() async {
    if (working) return;
    setState(() => working = true);
    try {
      await widget.controller.startDemo();
    } catch (e) {
      if (mounted) showError(context, 'Mode DEMO gagal dibuka: $e');
    } finally {
      if (mounted) setState(() => working = false);
    }
  }

  Future<void> unlock() async {
    if (!await widget.controller.unlock(pin.text) && mounted) {
      showError(context, 'PIN tidak sesuai');
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: LayoutBuilder(
        builder: (ctx, size) {
          final compact = size.maxHeight < 500;
          final wide = size.maxWidth >= 800 && !compact;
          return Center(
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: KukiSpace.of(size.maxWidth, 98, min: 320, max: 1250),
                maxHeight: KukiSpace.of(size.maxHeight, 96, min: 400, max: 760),
              ),
              child: Padding(
                padding: KukiSpace.all(
                  ctx,
                  percent: compact ? 1 : 1.7,
                  min: compact ? 8 : 12,
                  max: compact ? 14 : 28,
                ),
                child: Row(
                  children: [
                    if (wide) ...[
                      Expanded(flex: 11, child: _brandPanel(ctx)),
                      SizedBox(width: KukiSpace.loose(ctx)),
                    ],
                    Expanded(
                      flex: 10,
                      child: _loginPanel(ctx, compact: compact),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    ),
  );

  Widget _brandPanel(BuildContext context) => Container(
    padding: KukiSpace.all(context, percent: 2.8, min: 18, max: 44),
    decoration: BoxDecoration(
      color: KukiColors.cocoa,
      borderRadius: BorderRadius.circular(22),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: KukiColors.cream,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.bakery_dining_outlined,
                color: KukiColors.cocoa,
              ),
            ),
            SizedBox(width: KukiSpace.normal(context)),
            const Text(
              'KUKI BAKEHOUSE',
              style: TextStyle(
                color: KukiColors.cream,
                fontSize: 18,
                fontWeight: FontWeight.w800,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
        const Spacer(),
        const Text(
          'Where Crumbs\nBecome Art.',
          style: TextStyle(
            color: KukiColors.cream,
            fontSize: 45,
            fontWeight: FontWeight.w800,
            height: 1.12,
          ),
        ),
        SizedBox(height: KukiSpace.normal(context)),
        const Text(
          'POS untuk pelayanan yang lebih cepat, rapi, dan menyenangkan.',
          style: TextStyle(color: KukiColors.peach, fontSize: 15, height: 1.6),
        ),
        const Spacer(),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: KukiColors.mocha,
            borderRadius: BorderRadius.circular(13),
          ),
          child: const Row(
            children: [
              Icon(
                Icons.point_of_sale_outlined,
                color: KukiColors.cream,
                size: 32,
              ),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Katalog · Pesanan · Pembayaran · Riwayat',
                  style: TextStyle(color: KukiColors.cream, fontSize: 13),
                ),
              ),
            ],
          ),
        ),
        SizedBox(height: KukiSpace.loose(context)),
        Text(
          kIsWeb
              ? 'Mode pengembangan Chrome'
              : 'Tablet POS  ·  Android & iPadOS',
          style: TextStyle(color: KukiColors.peach, fontSize: 11),
        ),
      ],
    ),
  );

  Widget _loginPanel(BuildContext context, {required bool compact}) {
    final ctrl = widget.controller;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: KukiColors.line),
      ),
      child: Center(
        child: SingleChildScrollView(
          padding: KukiSpace.symmetric(
            context,
            horizontalPercent: compact ? 1.6 : 2.7,
            verticalPercent: compact ? 2 : 3.8,
            min: compact ? 10 : 14,
            max: compact ? 20 : 40,
          ),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: KukiSpace.width(context, 33, min: 300, max: 440),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                CircleAvatar(
                  radius: 25,
                  backgroundColor: KukiColors.cream,
                  child: Icon(
                    ctrl.locked
                        ? Icons.lock_outline
                        : Icons.storefront_outlined,
                    color: KukiColors.cocoa,
                    size: 26,
                  ),
                ),
                SizedBox(height: KukiSpace.loose(context)),
                Text(
                  ctrl.locked ? 'Buka kunci kasir' : 'Masuk ke Kasir',
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    color: KukiColors.cocoa,
                  ),
                ),
                SizedBox(height: KukiSpace.tight(context)),
                Text(
                  ctrl.locked
                      ? 'Gunakan PIN yang tersimpan di tablet ini.'
                      : 'Masukkan akun kasir Kuki Bakehouse.',
                  style: const TextStyle(fontSize: 13, color: KukiColors.muted),
                ),
                SizedBox(height: KukiSpace.loose(context)),
                if (ctrl.locked) ...[
                  TextField(
                    controller: pin,
                    obscureText: true,
                    keyboardType: TextInputType.number,
                    onSubmitted: (_) => unlock(),
                    decoration: const InputDecoration(
                      labelText: 'PIN perangkat',
                    ),
                  ),
                  SizedBox(height: KukiSpace.normal(context)),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: unlock,
                      child: const Text('Buka POS'),
                    ),
                  ),
                  SizedBox(height: KukiSpace.tight(context)),
                  Center(
                    child: TextButton(
                      onPressed: () async {
                        try {
                          await ctrl.logout();
                        } catch (e) {
                          if (!mounted) return;
                          showError(this.context, e);
                        }
                      },
                      child: const Text('Masuk dengan akun lain'),
                    ),
                  ),
                ] else ...[
                  TextField(
                    controller: server,
                    decoration: const InputDecoration(
                      labelText: 'Alamat server POS',
                      hintText: 'http://192.168.0.103:8000',
                    ),
                  ),
                  SizedBox(height: KukiSpace.normal(context)),
                  TextField(
                    controller: kode,
                    textCapitalization: TextCapitalization.characters,
                    autocorrect: false,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(
                      labelText: 'Kode pegawai',
                      hintText: 'Contoh: KASIR01',
                    ),
                  ),
                  SizedBox(height: KukiSpace.normal(context)),
                  TextField(
                    controller: pin,
                    obscureText: true,
                    keyboardType: TextInputType.number,
                    maxLength: 8,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: const InputDecoration(
                      labelText: 'PIN',
                      hintText: 'Contoh: 12345678',
                      counterText: '',
                    ),
                    onSubmitted: (_) => login(),
                  ),
                  SizedBox(height: KukiSpace.loose(context)),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: working ? null : login,
                      child: working
                          ? const CircularProgressIndicator()
                          : const Text('Masuk ke POS'),
                    ),
                  ),
                  if (!kIsWeb) ...[
                    SizedBox(height: KukiSpace.normal(context)),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: working ? null : startDemo,
                        icon: const Icon(Icons.preview_outlined),
                        label: const Text('Coba mode DEMO'),
                      ),
                    ),
                    SizedBox(height: KukiSpace.normal(context)),
                    const Text(
                      'DEMO menggunakan database terpisah. Transaksi simulasi tidak dikirim ke Laravel.',
                      style: TextStyle(
                        color: KukiColors.muted,
                        fontSize: 11,
                        height: 1.5,
                      ),
                    ),
                  ],
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
