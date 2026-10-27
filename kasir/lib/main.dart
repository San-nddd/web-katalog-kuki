import 'package:flutter/material.dart';
import 'api_client.dart';
import 'login_page.dart';
import 'pos_shell.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiClient.instance.restore();
  runApp(const KukiPosApp());
}

class KukiPosApp extends StatefulWidget {
  const KukiPosApp({super.key});
  @override State<KukiPosApp> createState() => _KukiPosAppState();
}
class _KukiPosAppState extends State<KukiPosApp> {
  bool logged = false, loading = true;
  @override void initState() { super.initState(); checkLogin(); }
  Future<void> checkLogin() async {
    try {
      final valid = await ApiClient.instance.validate();
      if (mounted) setState(() => logged = valid);
    } catch (_) {
      // Jika offline, jangan tebak identitas dan jangan mengizinkan transaksi.
      if (mounted) setState(() => logged = false);
    } finally { if (mounted) setState(() => loading = false); }
  }
  @override Widget build(BuildContext context) => MaterialApp(
    title: 'Kuki Bakehouse POS', debugShowCheckedModeBanner: false,
    theme: ThemeData(useMaterial3: true, scaffoldBackgroundColor: const Color(0xFFF7F8FA),
      colorScheme: ColorScheme.fromSeed(seedColor: kukiOrange),
      inputDecorationTheme: InputDecorationTheme(filled: true, fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
      cardTheme: const CardThemeData(color: Colors.white, elevation: 0),
    ),
    home: loading ? const Scaffold(body: Center(child: CircularProgressIndicator()))
      : logged ? PosShell(onLogout: () => setState(() => logged = false))
      : LoginPage(onSignedIn: () => setState(() => logged = true)),
  );
}
