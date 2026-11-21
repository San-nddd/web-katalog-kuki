import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

  testWidgets('login landscape kecil tidak overflow', (tester) async {
    tester.view.physicalSize = const Size(800, 360);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const KukiApp());
    await tester.pumpAndSettle();

    expect(find.text('Masuk ke Kasir'), findsOneWidget);
    expect(find.text('Kode pegawai'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('login portrait tidak overflow', (tester) async {
    tester.view.physicalSize = const Size(600, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const KukiApp());
    await tester.pumpAndSettle();

    expect(find.text('Masuk ke Kasir'), findsOneWidget);
    expect(find.text('Kode pegawai'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('tap field PIN meminta keyboard tampil', (tester) async {
    tester.view.physicalSize = const Size(1024, 600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final messenger =
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    final methods = <String>[];
    messenger.setMockMethodCallHandler(SystemChannels.textInput, (call) async {
      methods.add(call.method);
      return null;
    });
    addTearDown(() {
      messenger.setMockMethodCallHandler(SystemChannels.textInput, null);
    });

    await tester.pumpWidget(const KukiApp());
    await tester.pumpAndSettle();

    final pinField = find.byWidgetPredicate(
      (widget) => widget is TextField && widget.decoration?.labelText == 'PIN',
    );
    expect(pinField, findsOneWidget);

    await tester.tap(pinField);
    await tester.pumpAndSettle();

    expect(methods, contains('TextInput.show'));
    expect(FocusManager.instance.primaryFocus, isNotNull);
    expect(tester.takeException(), isNull);
  });

  testWidgets('tab fields login berpindah ke field berikutnya', (tester) async {
    tester.view.physicalSize = const Size(1024, 600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const KukiApp());
    await tester.pumpAndSettle();

    TextField fieldWithLabel(String label) => tester.widgetList<TextField>(
      find.byType(TextField),
    ).firstWhere((field) => field.decoration?.labelText == label);

    final kodeField = fieldWithLabel('Kode pegawai');
    final pinField = fieldWithLabel('PIN');
    expect(kodeField.focusNode, isNotNull);
    expect(pinField.focusNode, isNotNull);

    kodeField.focusNode!.requestFocus();
    await tester.pumpAndSettle();
    kodeField.onSubmitted?.call('KASIR01');
    await tester.pumpAndSettle();

    expect(pinField.focusNode!.hasFocus, isTrue);
    expect(tester.takeException(), isNull);
  });
}
