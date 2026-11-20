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

  testWidgets('Windows desktop menampilkan layar login POS', (tester) async {
    final originalPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.windows;
    try {
      await tester.pumpWidget(const KukiApp());
      await tester.pumpAndSettle();

      expect(find.text('Masuk ke Kasir'), findsOneWidget);
      expect(tester.takeException(), isNull);
    } finally {
      debugDefaultTargetPlatformOverride = originalPlatform;
    }
  });
}
