import 'dart:ui' show Size;

import 'package:flutter_test/flutter_test.dart';
import 'package:kuki_pos/main.dart';

void main() {
  testWidgets('Kuki POS menampilkan login saat belum masuk',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1280, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const KukiApp());
    await tester.pumpAndSettle();

    expect(find.text('Masuk ke Kasir'), findsOneWidget);
    expect(find.text('Kode pegawai'), findsOneWidget);
    expect(find.text('Contoh: KASIR01'), findsOneWidget);
    expect(find.text('PIN'), findsOneWidget);
    expect(find.text('Alamat API Laravel'), findsNothing);
  });

  testWidgets('tampilan login menyesuaikan layar kecil', (tester) async {
    tester.view.physicalSize = const Size(720, 480);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const KukiApp());
    await tester.pumpAndSettle();

    expect(find.text('Masuk ke Kasir'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('tampilan login menyesuaikan layar tablet', (tester) async {
    tester.view.physicalSize = const Size(1024, 768);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const KukiApp());
    await tester.pumpAndSettle();

    expect(find.text('Masuk ke Kasir'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
