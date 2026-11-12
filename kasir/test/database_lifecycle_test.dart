import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kuki_pos/main.dart';
import 'package:kuki_pos/state/pos_controller.dart';

void main() {
  test('sinkronisasi dilewati jika database lokal belum terbuka', () async {
    final controller = PosController()..api.token = 'test-token';
    addTearDown(controller.dispose);

    await controller.syncPending();

    expect(controller.databaseReady, isFalse);
    expect(controller.syncing, isFalse);
  });

  testWidgets('Windows desktop tidak memulai database POS', (tester) async {
    final originalPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.windows;
    try {
      await tester.pumpWidget(const KukiApp());

      expect(
        find.text(
          'Kuki POS memerlukan database lokal dan hanya dapat dijalankan '
          'di aplikasi Android atau iPadOS.',
        ),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    } finally {
      debugDefaultTargetPlatformOverride = originalPlatform;
    }
  });
}
