import 'package:flutter_test/flutter_test.dart';
import 'package:kuki_pos/main.dart';

void main() {
  testWidgets('Kuki POS membuka halaman login pegawai saat belum masuk',
      (WidgetTester tester) async {
    await tester.pumpWidget(const KukiPosApp());
    await tester.pumpAndSettle();

    expect(find.text('Masuk Kasir'), findsOneWidget);
    expect(find.text('Kode pegawai'), findsOneWidget);
    expect(find.text('PIN'), findsOneWidget);
  });
}
