import 'package:flutter/material.dart';
import 'api_client.dart';

const kukiOrange = Color(0xFFFF592F);
const kukiNavy = Color(0xFF182642);
const kukiCream = Color(0xFFFFFAF2);

class LoginPage extends StatefulWidget {
  final VoidCallback onSignedIn;
  const LoginPage({super.key, required this.onSignedIn});
  @override State<LoginPage> createState() => _LoginPageState();
}
class _LoginPageState extends State<LoginPage> {
  final code = TextEditingController();
  final pin = TextEditingController();
  bool loading = false, obscure = true;
  String? error;
  @override void dispose() { code.dispose(); pin.dispose(); super.dispose(); }
  Future<void> submit() async {
    if (loading) return;
    if (code.text.trim().isEmpty || pin.text.length < 4) {
      setState(() => error = 'Masukkan kode pegawai dan PIN 4–8 digit.'); return;
    }
    setState(() { loading = true; error = null; });
    try {
      await ApiClient.instance.login(code.text.trim(), pin.text);
      if (mounted) widget.onSignedIn();
    } catch(e) { if(mounted) setState(() => error = '$e'); }
    finally { if(mounted) setState(() => loading = false); }
  }
  void digit(String d) {
    if (d == 'back') {
      if (pin.text.isNotEmpty) pin.text = pin.text.substring(0, pin.text.length-1);
    } else if (pin.text.length < 8) { pin.text += d; }
    setState(() {});
  }
  @override Widget build(BuildContext context) {
    return Scaffold(backgroundColor: kukiCream, body: SafeArea(child: LayoutBuilder(builder: (ctx, limits) {
      final wide = limits.maxWidth >= 760;
      final brand = Container(
        padding: const EdgeInsets.all(35), decoration: BoxDecoration(
          color: kukiOrange, borderRadius: BorderRadius.circular(20)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Kuki Bakehouse', style: TextStyle(color: Colors.white, fontSize: 33, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          const Text('Where crumbs become art.', style: TextStyle(color: Colors.white, fontSize: 19)),
          const Spacer(),
          Center(child: Container(width: wide ? 205 : 100, height: wide ? 205 : 100,
            decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.white),
            padding: const EdgeInsets.all(6),
            child: ClipOval(child: Image.asset('assets/branding/kuki_logo.png', fit: BoxFit.contain)))),
          const Spacer(),
          const Text('POS Kuki • Kasir & manajemen shift', style: TextStyle(color: Colors.white, fontSize: 13)),
        ]));
      final form = Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 440), child:
        SingleChildScrollView(padding: const EdgeInsets.symmetric(horizontal: 25, vertical: 12), child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Icon(Icons.lock_outline_rounded, size: 37, color: kukiOrange),
          const SizedBox(height: 13),
          const Text('Masuk Kasir', textAlign: TextAlign.center,
            style: TextStyle(fontSize: 27, fontWeight: FontWeight.w800, color: kukiNavy)),
          const SizedBox(height: 5),
          const Text('Gunakan akun dan PIN pegawai Kuki.', textAlign: TextAlign.center,
            style: TextStyle(color: Colors.black54)),
          const SizedBox(height: 30),
          TextField(controller: code, textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(labelText: 'Kode pegawai', hintText: 'Contoh: KASIR01', prefixIcon: Icon(Icons.badge_outlined))),
          const SizedBox(height: 14),
          TextField(controller: pin, obscureText: obscure, keyboardType: TextInputType.number,
            maxLength: 8, onSubmitted: (_) => submit(),
            decoration: InputDecoration(labelText: 'PIN', prefixIcon: const Icon(Icons.pin_outlined),
              counterText: '', suffixIcon: IconButton(
                icon: Icon(obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                onPressed: () => setState(() => obscure = !obscure)))),
          const SizedBox(height: 15),
          ...List.generate(4, (row) => Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: List.generate(3, (col) {
              final label = row == 3 ? (col == 0 ? '' : col == 1 ? '0' : '⌫') : '${row*3+col+1}';
              return SizedBox(width: 70, height: 49, child: label.isEmpty ? const SizedBox.shrink()
                : TextButton(onPressed: () => digit(label == '⌫' ? 'back' : label),
                    child: Text(label, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: kukiNavy))));
            }))),
          if (error != null) Padding(padding: const EdgeInsets.only(top: 8), child:
            Text(error!, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center)),
          const SizedBox(height: 15),
          FilledButton(onPressed: loading ? null : submit,
            style: FilledButton.styleFrom(backgroundColor: kukiOrange, minimumSize: const Size.fromHeight(50)),
            child: Text(loading ? 'Memeriksa...' : 'Masuk & Mulai Shift')),
          const SizedBox(height: 10),
          TextButton(onPressed: () => showDialog<void>(context: context, builder: (context) => AlertDialog(
            title: const Text('Lupa PIN?'), content: const Text('Minta Admin Kuki mengatur ulang PIN pegawai melalui API Admin POS.'),
            actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Tutup'))])),
            child: const Text('Lupa PIN? Hubungi Admin')),
        ]))));
      return Padding(padding: const EdgeInsets.all(12), child: wide
        ? Row(children: [Expanded(flex: 5, child: brand), Expanded(flex: 5, child: form)])
        : Column(children: [SizedBox(height: 285, child: brand), Expanded(child: form)]));
    })));
  }
}
