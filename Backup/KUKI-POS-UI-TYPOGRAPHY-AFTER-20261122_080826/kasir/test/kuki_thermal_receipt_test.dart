import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kuki_pos/core/models.dart';
import 'package:kuki_pos/services/kuki_thermal_printer.dart';
import 'package:kuki_pos/services/kuki_thermal_receipt.dart';

String asciiFromBytes(List<int> bytes) => String.fromCharCodes(
      bytes.where((byte) => byte == 10 || (byte >= 32 && byte <= 126)),
    );

Sale sampleSale({
  String method = 'cash',
  int discount = 2000,
  String transactionStatus = 'completed',
}) {
  return Sale(
    uuid: 'ABC12345-pos',
    createdAt: DateTime(2026, 11, 20, 9, 30),
    cashier: 'Budi Kasir',
    shiftId: 'shift-1',
    method: method,
    status: 'synced',
    subtotal: 32000,
    discount: discount,
    total: 30000,
    paid: 50000,
    note: '',
    transactionStatus: transactionStatus,
    lines: [
      {
        'name': 'Saltbread Cheese',
        'quantity': 1,
        'unit_price': 18000,
      },
      {
        'name': 'Tiramisu Matcha',
        'quantity': 1,
        'unit_price': 14000,
      },
    ],
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('struk thermal memakai data transaksi aktual', () async {
    final bytes = await KukiThermalReceipt.buildSaleBytes(
      sampleSale(),
      paperWidthMm: 58,
    );
    final text = asciiFromBytes(bytes);

    expect(text, contains('KUKI BAKEHOUSE'));
    expect(text, contains('No: ABC12345'));
    expect(text, contains('Tanggal: 20/11/2026 09:30'));
    expect(text, contains('Kasir: Budi Kasir'));
    expect(text, contains('Saltbread Cheese'));
    expect(text, contains('Tiramisu Matcha'));
    expect(text, contains('1 x Rp18.000'));
    expect(text, contains('Subtotal: Rp32.000'));
    expect(text, contains('Diskon: Rp2.000'));
    expect(text, contains('TOTAL: Rp30.000'));
    expect(text, contains('Metode: Tunai'));
    expect(text, contains('Dibayar: Rp50.000'));
    expect(text, contains('Kembalian: Rp20.000'));
    expect(text, contains('Terima kasih sudah berbelanja!'));
    expect(text, isNot(contains('TEST PRINT')));
  });

  test('struk thermal menyembunyikan diskon nol dan menampilkan metode non-tunai', () async {
    final bytes = await KukiThermalReceipt.buildSaleBytes(
      sampleSale(method: 'qris_manual', discount: 0),
      paperWidthMm: 80,
    );
    final text = asciiFromBytes(bytes);

    expect(text, isNot(contains('Diskon:')));
    expect(text, contains('Metode: QRIS (manual)'));
    expect(text, isNot(contains('Dibayar:')));
    expect(text, isNot(contains('Kembalian:')));
  });

  test('struk thermal menandai transaksi yang dibatalkan', () async {
    final bytes = await KukiThermalReceipt.buildSaleBytes(
      sampleSale(transactionStatus: 'retur'),
      paperWidthMm: 58,
    );
    final text = asciiFromBytes(bytes);

    expect(text, contains('Status: RETUR'));
  });

  test('pesan error printer ramah pengguna', () {
    expect(
      KukiPrinterErrors.messageFor(
        PlatformException(code: 'USB_DEVICE_NOT_FOUND', message: 'missing'),
      ),
      contains('Printer USB tidak terdeteksi'),
    );
    expect(
      KukiPrinterErrors.messageFor(
        const KukiPrinterException('Belum ada printer dipilih.'),
      ),
      'Belum ada printer dipilih.',
    );
  });
}
