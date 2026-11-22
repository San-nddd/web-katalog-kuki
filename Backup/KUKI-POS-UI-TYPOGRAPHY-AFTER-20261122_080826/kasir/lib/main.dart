import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'core/theme.dart';
import 'widgets/common.dart';
import 'screens/login_screen.dart';
import 'screens/pos_shell.dart';
import 'state/pos_controller.dart';
import 'thermal_printer_test_page.dart';

// Navigator utama untuk membuka halaman pengaturan printer thermal.
final GlobalKey<NavigatorState> kukiNavigatorKey = GlobalKey<NavigatorState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (!kIsWeb) {
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
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
        !controller.locked &&
        !controller.sessionExpired) {
      controller.syncPending(automatic: true);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    controller.dispose();
    super.dispose();
  }

  // Membuka halaman pemilihan printer untuk pencetakan struk nyata.
  void openPrinterSettings() {
    kukiNavigatorKey.currentState?.push(
      MaterialPageRoute<void>(
        builder: (_) => KukiPrinterSettingsPage(controller: controller),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Kuki Bakehouse POS',
      theme: kukiTheme(),
      debugShowCheckedModeBanner: false,

      // Navigator aplikasi.
      navigatorKey: kukiNavigatorKey,

      home: AnimatedBuilder(
        animation: controller,
        builder: (context, _) {
          // Loading awal aplikasi.
          if (controller.initializing) {
            return const Scaffold(
              body: Center(
                child: Card(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.all(Radius.circular(KukiRadius.lg)),
                    side: BorderSide(color: KukiColors.line),
                  ),
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 36,
                          height: 36,
                          child: CircularProgressIndicator(strokeWidth: 3),
                        ),
                        SizedBox(height: 16),
                        Text('Menyiapkan kasir...', style: KukiText.headlineSmall),
                        SizedBox(height: 4),
                        Text(
                          'Menyiapkan data Kuki Bakehouse.',
                          style: KukiText.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }

          // Autentikasi kasir.
          if (!controller.authenticated ||
              controller.locked ||
              controller.sessionExpired) {
            return LoginScreen(controller: controller);
          }

          // Recovery data SQLite jika gagal.
          if (controller.drafts.isEmpty) {
            return _PosDataRecovery(controller: controller);
          }

          // Dashboard POS setelah berhasil login.
          return Stack(
            children: [
              // Halaman kasir asli.
              PosShell(controller: controller),

              // Akses cepat ke pengaturan printer thermal.
              Positioned(
                top: 12,
                right: 12,
                child: SafeArea(
                  child: Material(
                    color: Colors.transparent,
                    child: IconButton.filledTonal(
                      tooltip: 'Pengaturan printer thermal',
                      icon: const Icon(Icons.print_outlined),
                      onPressed: openPrinterSettings,
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Jangan membangun layar kasir kalau SQLite
/// gagal memuat draft.
///
/// Tidak menghapus atau membuat ulang
/// database perangkat.
class _PosDataRecovery extends StatelessWidget {
  final PosController controller;

  const _PosDataRecovery({required this.controller});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: KukiSpace.all(context, percent: 2.4, min: 16, max: 28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 500),
              child: Container(
                padding: KukiSpace.all(context, percent: 2.4, min: 18, max: 32),
                decoration: BoxDecoration(
                  color: KukiColors.paper,
                  borderRadius: BorderRadius.circular(KukiRadius.lg),
                  border: Border.all(color: KukiColors.line),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          color: KukiColors.peach,
                          borderRadius: BorderRadius.circular(KukiRadius.md),
                          border: Border.all(color: KukiColors.line),
                        ),
                        child: const Icon(
                          Icons.storage_outlined,
                          color: KukiColors.mocha,
                          size: 34,
                        ),
                      ),
                    ),

                    SizedBox(height: KukiSpace.loose(context)),

                    const Text(
                      'Data kasir belum dapat dibuka',
                      textAlign: TextAlign.center,
                      style: KukiText.headlineSmall,
                    ),

                    SizedBox(height: KukiSpace.normal(context)),

                    Text(
                      controller.error ?? 'Periksa konfigurasi SQLite perangkat.',
                      textAlign: TextAlign.center,
                      maxLines: 4,
                      overflow: TextOverflow.ellipsis,
                      style: KukiText.bodyMedium.copyWith(
                        color: KukiColors.inkSoft,
                      ),
                    ),

                    SizedBox(height: KukiSpace.loose(context)),

                    FilledButton(
                      onPressed: controller.busy
                          ? null
                          : () => controller.retryLoadData(),
                      child: const Text('Coba buka data kembali'),
                    ),

                    SizedBox(height: KukiSpace.tight(context)),

                    TextButton(
                      onPressed: controller.busy
                          ? null
                          : () async {
                              try {
                                await controller.logout();
                              } catch (e) {
                                if (context.mounted) showError(context, e);
                              }
                            },
                      child: const Text(
                        'Kembali ke login (data tetap tersimpan)',
                      ),
                    ),

                    SizedBox(height: KukiSpace.tight(context)),

                    const Text(
                      'Jangan hapus aplikasi atau database. '
                      'Simpan pesan error ini untuk diperiksa.',
                      textAlign: TextAlign.center,
                      style: KukiText.bodySmall,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
