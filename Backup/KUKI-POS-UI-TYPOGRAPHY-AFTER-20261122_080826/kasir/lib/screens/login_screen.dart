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
  final serverNode = FocusNode();
  final kodeNode = FocusNode();
  final pinNode = FocusNode();
  bool working = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _focusAndShow(widget.controller.locked ? pinNode : kodeNode);
    });
  }

  @override
  void dispose() {
    kode.dispose();
    server.dispose();
    pin.dispose();
    serverNode.dispose();
    kodeNode.dispose();
    pinNode.dispose();
    super.dispose();
  }

  void _focusAndShow(FocusNode node) {
    if (!node.hasFocus) node.requestFocus();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      node.requestFocus();
      SystemChannels.textInput.invokeMethod<void>('TextInput.show');
    });
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
    resizeToAvoidBottomInset: true,
    body: SafeArea(
      child: LayoutBuilder(
        builder: (ctx, size) {
          final keyboardBottom = MediaQuery.viewInsetsOf(ctx).bottom;
          final compact = size.maxHeight < 500 || keyboardBottom > 0;
          final wide = size.maxWidth >= 800 && !compact;
          return Center(
            child: SingleChildScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: EdgeInsets.only(
                bottom: keyboardBottom + KukiSpace.normal(ctx),
              ),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: KukiSpace.of(
                    size.maxWidth,
                    98,
                    min: 320,
                    max: 1250,
                  ),
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
      borderRadius: BorderRadius.circular(KukiRadius.lg),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: KukiColors.cream,
                borderRadius: BorderRadius.circular(KukiRadius.sm),
              ),
              child: const Icon(
                Icons.bakery_dining_outlined,
                color: KukiColors.cocoa,
              ),
            ),
            SizedBox(width: KukiSpace.normal(context)),
            Text(
              'KUKI BAKEHOUSE',
              style: KukiText.titleMedium.copyWith(
                color: KukiColors.cream,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
        SizedBox(height: KukiSpace.loose(context)),
        Text(
          'Where Crumbs\nBecome Art.',
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: KukiText.displayMedium.copyWith(color: KukiColors.cream),
        ),
        SizedBox(height: KukiSpace.normal(context)),
        Text(
          'POS untuk pelayanan yang lebih cepat, rapi, dan menyenangkan.',
          maxLines: 3,
          overflow: TextOverflow.ellipsis,
          style: KukiText.onDark,
        ),
        SizedBox(height: KukiSpace.loose(context)),
        Container(
          padding: EdgeInsets.all(KukiSpace.section(context)),
          decoration: BoxDecoration(
            color: KukiColors.mocha,
            borderRadius: BorderRadius.circular(KukiRadius.md),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.point_of_sale_outlined,
                color: KukiColors.cream,
                size: 32,
              ),
              SizedBox(width: KukiSpace.normal(context)),
              Expanded(
                child: Text(
                  'Katalog · Pesanan · Pembayaran · Riwayat',
                  style: KukiText.onDark,
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
          style: KukiText.captionOnDark.copyWith(fontSize: 11),
        ),
      ],
    ),
  );

  Widget _loginPanel(BuildContext context, {required bool compact}) {
    final ctrl = widget.controller;
    return Container(
      decoration: BoxDecoration(
        color: KukiColors.paper,
        borderRadius: BorderRadius.circular(KukiRadius.lg),
        border: Border.all(color: KukiColors.line),
      ),
      child: Padding(
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
                  ctrl.locked ? Icons.lock_outline : Icons.storefront_outlined,
                  color: KukiColors.cocoa,
                  size: 26,
                ),
              ),
              SizedBox(height: KukiSpace.loose(context)),
              Text(
                ctrl.locked ? 'Buka kunci kasir' : 'Masuk ke Kasir',
                style: KukiText.displaySmall,
              ),
              SizedBox(height: KukiSpace.tight(context)),
              Text(
                ctrl.locked
                    ? 'Gunakan PIN yang tersimpan di tablet ini.'
                    : 'Masukkan akun kasir Kuki Bakehouse.',
                style: KukiText.bodySmall,
              ),
              if (ctrl.sessionExpired) ...[
                SizedBox(height: KukiSpace.normal(context)),
                Container(
                  padding: KukiSpace.all(context, percent: 1, min: 10, max: 14),
                  decoration: BoxDecoration(
                    color: KukiColors.dangerSurface,
                    borderRadius: BorderRadius.circular(KukiRadius.md),
                    border: Border.all(color: KukiColors.peach),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.timer_off_outlined,
                        size: 20,
                        color: KukiColors.danger,
                      ),
                      SizedBox(width: KukiSpace.tight(context)),
                      const Expanded(
                        child: Text(
                          'Sesi kasir habis. Masuk ulang untuk melanjutkan sinkronisasi; data transaksi lokal tetap tersimpan.',
                          style: TextStyle(
                            color: KukiColors.inkSoft,
                            fontSize: 12,
                            height: 1.45,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              SizedBox(height: KukiSpace.loose(context)),
              if (ctrl.locked) ...[
                TextField(
                  controller: pin,
                  focusNode: pinNode,
                  autofocus: true,
                  obscureText: true,
                  keyboardType: TextInputType.number,
                  maxLength: 8,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  textInputAction: TextInputAction.done,
                  onTap: () => _focusAndShow(pinNode),
                  onSubmitted: (_) => unlock(),
                  decoration: const InputDecoration(
                    labelText: 'PIN perangkat',
                    counterText: '',
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
                        if (!context.mounted) return;
                        showError(context, e);
                      }
                    },
                    child: const Text('Masuk dengan akun lain'),
                  ),
                ),
              ] else ...[
                TextField(
                  controller: server,
                  focusNode: serverNode,
                  keyboardType: TextInputType.url,
                  autocorrect: false,
                  enableSuggestions: false,
                  textInputAction: TextInputAction.next,
                  onTap: () => _focusAndShow(serverNode),
                  onSubmitted: (_) => _focusAndShow(kodeNode),
                  decoration: const InputDecoration(
                    labelText: 'Alamat server POS',
                    hintText: 'http://192.168.0.103:8000',
                  ),
                ),
                SizedBox(height: KukiSpace.normal(context)),
                TextField(
                  controller: kode,
                  focusNode: kodeNode,
                  autofocus: true,
                  textCapitalization: TextCapitalization.characters,
                  autocorrect: false,
                  enableSuggestions: false,
                  textInputAction: TextInputAction.next,
                  onTap: () => _focusAndShow(kodeNode),
                  onSubmitted: (_) => _focusAndShow(pinNode),
                  decoration: const InputDecoration(
                    labelText: 'Kode pegawai',
                    hintText: 'Contoh: KASIR01',
                  ),
                ),
                SizedBox(height: KukiSpace.normal(context)),
                TextField(
                  controller: pin,
                  focusNode: pinNode,
                  obscureText: true,
                  keyboardType: TextInputType.number,
                  maxLength: 8,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  textInputAction: TextInputAction.done,
                  onTap: () => _focusAndShow(pinNode),
                  onSubmitted: (_) => login(),
                  decoration: const InputDecoration(
                    labelText: 'PIN',
                    hintText: 'Contoh: 12345678',
                    counterText: '',
                  ),
                ),
                SizedBox(height: KukiSpace.loose(context)),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: working ? null : login,
                    child: working
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              color: KukiColors.cocoa,
                              strokeWidth: 2,
                            ),
                          )
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
                    style: KukiText.labelSmall,
                  ),
                ],
              ],
            ],
          ),
        ),
      ),
    );
  }
}
