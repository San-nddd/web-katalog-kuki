import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:kuki_pos/core/models.dart';
import 'package:kuki_pos/data/local_db.dart';
import 'package:kuki_pos/state/pos_controller.dart';

class _FakeLocalDb extends LocalDb {
  final List<OrderDraft> savedDrafts = [];
  final List<OrderDraft> checkedOutDrafts = [];
  final List<Sale> storedSales = [];
  final Map<String, Sale> saleById = {};
  bool failCheckout = false;

  @override
  Future<void> saveDraft(OrderDraft draft) async {
    savedDrafts.add(OrderDraft.parse(draft.serialize()));
  }

  @override
  Future<Sale> checkout({
    required OrderDraft draft,
    required String cashier,
    required String cashierId,
    required String shiftId,
    required String method,
    required int paid,
    required bool verified,
  }) async {
    if (failCheckout) throw StateError('Pembayaran gagal');
    checkedOutDrafts.add(OrderDraft.parse(draft.serialize()));
    final sale = Sale(
      uuid: 'sale-${checkedOutDrafts.length}',
      createdAt: DateTime.now(),
      cashier: cashier,
      shiftId: shiftId,
      method: method,
      status: 'pending',
      subtotal: draft.subtotal,
      discount: draft.discount,
      total: draft.total,
      paid: paid,
      note: draft.saleNote,
      verified: verified,
      lines: draft.lines
          .map(
            (line) => {
              'product_id': line.product.id,
              'name': line.product.name,
              'quantity': line.quantity,
              'unit_price': line.product.price,
            },
          )
          .toList(),
    );
    storedSales.add(sale);
    saleById[sale.uuid] = sale;
    return sale;
  }

  @override
  Future<Sale?> getSale(String id) async => saleById[id];

  @override
  Future<List<Sale>> sales({
    int limit = 300,
    String? status,
    DateTime? from,
    DateTime? to,
    String? shiftId,
    String? cashierId,
    String? cashierName,
  }) async =>
      List.unmodifiable(storedSales);

  @override
  Future<int> pendingCount({String? cashierId, String? cashierName}) async => 0;

  @override
  Future<int> unresolvedCount({String? cashierId, String? cashierName}) async =>
      0;

  @override
  Future<List<Product>> products() async => sampleProducts;

  @override
  Future<void> replaceCatalog(List<Product> catalog) async {}
}

class _TestPosController extends PosController {
  @override
  Future<void> refreshShiftHistory() async {}
}

_TestPosController _controller(_FakeLocalDb local) {
  final controller = _TestPosController()
    ..demo = true
    ..activeShift = 'shift-1'
    ..cashierName = 'Kasir Kuki'
    ..cashierId = 'kasir-1'
    ..products = sampleProducts
    ..local = local;
  addTearDown(controller.dispose);
  return controller;
}

void main() {
  test('nama tab dan nama pelanggan tersimpan sebagai field terpisah', () {
    final legacy = OrderDraft(
      id: 'legacy',
      name: 'Pelanggan A',
      lines: [CartLine(sampleProducts.first)],
    );
    final raw = jsonDecode(legacy.serialize()) as Map<String, dynamic>;
    raw.remove('customer_name');
    final loaded = OrderDraft.parse(jsonEncode(raw));

    expect(loaded.name, 'Pelanggan A');
    expect(loaded.customerName, 'Pelanggan A');

    final fresh = OrderDraft(id: 'fresh', name: 'Pesanan 1');
    expect(fresh.customerName, isEmpty);

    final stored = OrderDraft(
      id: 'stored',
      name: 'Pesanan 2',
      customerName: 'Pelanggan B',
      note: 'Tanpa gula',
    );
    final restored = OrderDraft.parse(stored.serialize());
    expect(restored.name, 'Pesanan 2');
    expect(restored.customerName, 'Pelanggan B');
    expect(restored.saleNote, contains('Pesanan: Pelanggan B'));
    expect(restored.saleNote, contains('Catatan: Tanpa gula'));
    expect(
      noteWithCustomer('Catatan: Tanpa gula', 'Pelanggan B'),
      'Catatan: Tanpa gula | Pesanan: Pelanggan B',
    );
  });

  test('checkout Pelanggan A lalu Pelanggan B tidak mewarisi identitas', () async {
    final local = _FakeLocalDb();
    final controller = _controller(local);
    final first = OrderDraft(
      id: 'draft-1',
      name: 'Pesanan 1',
      lines: [CartLine(sampleProducts.first)],
    );
    final other = OrderDraft(
      id: 'draft-2',
      name: 'Pesanan 2',
      customerName: 'Pelanggan Lain',
      note: 'Catatan draft lain',
      orderType: 'dine_in',
      tableNumber: '5',
      lines: [CartLine(sampleProducts[1])],
    );
    controller.drafts = [first, other];
    controller.activeDraftId = first.id;

    await controller.setCustomerName('Pelanggan A');
    await controller.setNote('Catatan A');
    await controller.setOrderType('dine_in');
    await controller.setTableNumber('7');
    await controller.pay('cash', controller.draft.total);

    expect(local.checkedOutDrafts.single.customerName, 'Pelanggan A');
    expect(controller.history.single.note, contains('Pesanan: Pelanggan A'));
    expect(controller.drafts.any((item) => item.id == first.id), isFalse);

    final replacement = controller.drafts.firstWhere(
      (item) => item.id == controller.activeDraftId,
    );
    expect(replacement.name, 'Pesanan 3');
    expect(replacement.customerName, isEmpty);
    expect(replacement.note, isEmpty);
    expect(replacement.tableNumber, isEmpty);
    expect(replacement.orderType, 'takeaway');
    expect(replacement.lines, isEmpty);
    expect(replacement.discount, 0);

    final untouched = controller.drafts.firstWhere(
      (item) => item.id == other.id,
    );
    expect(untouched.customerName, 'Pelanggan Lain');
    expect(untouched.note, 'Catatan draft lain');
    expect(untouched.tableNumber, '5');
    expect(untouched.orderType, 'dine_in');
    expect(untouched.lines, hasLength(1));

    await controller.setCustomerName('Pelanggan B');
    await controller.addProduct(sampleProducts[2]);
    await controller.pay('cash', controller.draft.total);

    expect(local.checkedOutDrafts.last.customerName, 'Pelanggan B');
    expect(controller.history.last.note, contains('Pesanan: Pelanggan B'));
    expect(controller.history.first.note, contains('Pelanggan A'));
    expect(controller.draft.customerName, isEmpty);
    expect(controller.draft.note, isEmpty);
    expect(controller.draft.lines, isEmpty);
    expect(
      controller.drafts.firstWhere((item) => item.id == other.id).customerName,
      'Pelanggan Lain',
    );
  });

  test('pembayaran gagal tidak menghapus atau mereset draft', () async {
    final local = _FakeLocalDb()..failCheckout = true;
    final controller = _controller(local);
    controller.drafts = [
      OrderDraft(
        id: 'draft-1',
        name: 'Pesanan 1',
        customerName: 'Pelanggan A',
        note: 'Catatan A',
        lines: [CartLine(sampleProducts.first)],
      ),
    ];
    controller.activeDraftId = 'draft-1';

    await expectLater(
      controller.pay('cash', controller.draft.total),
      throwsStateError,
    );

    expect(controller.drafts, hasLength(1));
    expect(controller.draft.id, 'draft-1');
    expect(controller.draft.customerName, 'Pelanggan A');
    expect(controller.draft.note, 'Catatan A');
    expect(controller.draft.lines, hasLength(1));
    expect(local.checkedOutDrafts, isEmpty);
    expect(local.savedDrafts.any((item) => item.id != 'draft-1'), isFalse);
  });
}
