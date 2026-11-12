import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/theme.dart';
import 'screens/login_screen.dart';
import 'screens/pos_shell.dart';
import 'state/pos_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (!kIsWeb) {
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
  }
  runApp(const KukiApp());
}

class KukiApp extends StatefulWidget {
  const KukiApp({super.key});
  @override
  State<KukiApp> createState() => _KukiAppState();
}

class _KukiAppState extends State<KukiApp> with WidgetsBindingObserver {
  final PosController controller = PosController();
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    controller.init();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        controller.authenticated &&
        !controller.locked) {
      controller.syncPending(automatic: true);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Kuki Bakehouse POS',
    theme: kukiTheme(),
    debugShowCheckedModeBanner: false,
    home: AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        if (controller.initializing) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        if (!controller.authenticated || controller.locked) {
          return LoginScreen(controller: controller);
        }
        if (controller.drafts.isEmpty) {
          return _PosDataRecovery(controller: controller);
        }
        return PosShell(controller: controller);
      },
    ),
  );
}

/// Jangan membangun layar kasir kalau SQLite gagal memuat draft.
/// Tidak menghapus atau membuat ulang database perangkat.
class _PosDataRecovery extends StatelessWidget {
  final PosController controller;
  const _PosDataRecovery({required this.controller});

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 500),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.storage_outlined, size: 48),
              const SizedBox(height: 12),
              const Text(
                'Data kasir belum dapat dibuka',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              Text(
                controller.error ?? 'Periksa konfigurasi SQLite perangkat.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: controller.busy
                    ? null
                    : () => controller.retryLoadData(),
                child: const Text('Coba buka data kembali'),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: controller.busy ? null : () => controller.logout(),
                child: const Text('Kembali ke login (data tetap tersimpan)'),
              ),
              const SizedBox(height: 8),
              const Text(
                'Jangan hapus aplikasi atau database. Simpan pesan error ini untuk diperiksa.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
