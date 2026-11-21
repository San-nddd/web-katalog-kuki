import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:kuki_pos/core/models.dart';
import 'package:kuki_pos/data/api_client.dart';
import 'package:kuki_pos/data/local_db.dart';
import 'package:kuki_pos/state/pos_controller.dart';

http.Response _json(int status, Object body) => http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json'},
    );

class _StubLocalDb extends LocalDb {
  _StubLocalDb({
    this.fakeShifts = const [],
    this.fakeSales = const [],
    this.onStartShift,
    this.onCloseShift,
  });

  final List<Map<String, Object?>> fakeShifts;
  final List<Sale> fakeSales;
  final Future<void> Function(Map<String, dynamic>)? onStartShift;
  final Future<void> Function(Map<String, dynamic>)? onCloseShift;
  final List<String> syncedIds = [];
  final List<String> requeuedIds = [];
  final List<Map<String, Object?>> cancellations = [];

  @override
  bool get isOpen => true;

  @override
  Future<List<Map<String, Object?>>> shiftsForCashier({
    required String cashierId,
    required String cashierName,
  }) async => fakeShifts;

  @override
  Future<List<Sale>> sales({
    int limit = 300,
    String? status,
    DateTime? from,
    DateTime? to,
    String? shiftId,
    String? cashierId,
    String? cashierName,
  }) async => fakeSales;

  @override
  Future<int> pendingCount({String? cashierId, String? cashierName}) async => 0;

  @override
  Future<int> unresolvedCount({String? cashierId, String? cashierName}) async =>
      fakeSales.where((sale) => sale.status == 'conflict').length;

  @override
  Future<void> markSynced(String id) async => syncedIds.add(id);

  @override
  Future<void> requeueSale(String id, {bool verified = false}) async =>
      requeuedIds.add(id);

  @override
  Future<void> applyCancellation(
    String id, {
    required String status,
    required String jenis,
    required String reason,
    required String actor,
    DateTime? at,
  }) async {
    cancellations.add({
      'id': id,
      'status': status,
      'jenis': jenis,
      'reason': reason,
      'actor': actor,
    });
  }

  @override
  Future<void> startShift({
    required String id,
    required String cashier,
    required String cashierId,
    required int openingCash,
    String? serverShiftId,
  }) async {
    await onStartShift?.call({
      'id': id,
      'cashier': cashier,
      'cashierId': cashierId,
      'openingCash': openingCash,
      'serverShiftId': serverShiftId,
    });
  }

  @override
  Future<void> closeShift({
    required String id,
    required String cashierId,
    required String cashierName,
    required int closingCash,
    required String note,
  }) async {
    await onCloseShift?.call({
      'id': id,
      'closingCash': closingCash,
      'note': note,
    });
  }
}

Sale _sale(
  String status, {
  String transactionStatus = 'completed',
}) => Sale(
      uuid: 'sale-1',
      createdAt: DateTime(2026),
      cashier: 'Kasir Kuki',
      shiftId: 'shift-1',
      method: 'cash',
      status: status,
      subtotal: 1000,
      discount: 0,
      total: 1000,
      paid: 1000,
      note: '',
      transactionStatus: transactionStatus,
      lines: [
        {
          'product_id': '1',
          'name': 'Roti',
          'quantity': 1,
          'unit_price': 1000,
        },
      ],
    );

PosController _controller({String role = 'kasir'}) {
  final controller = PosController();
  controller.role = role;
  controller.api.baseUrl = 'http://localhost:8000';
  controller.api.token = 'token';
  controller.cashierId = '1';
  controller.cashierName = 'Kasir Kuki';
  return controller;
}

void main() {
  setUp(() {
    FlutterSecureStorage.setMockInitialValues(<String, String>{
      'token': 'token',
      'cashier': 'Kasir Kuki',
      'cashier_id': '1',
      'role': 'kasir',
    });
  });

  test('logout ditolak saat shift lokal masih terbuka', () async {
    final controller = _controller();
    addTearDown(controller.dispose);
    controller.activeShift = 'shift-1';

    await expectLater(
      controller.logout(),
      throwsA(
        isA<StateError>().having(
          (e) => e.toString(),
          'pesan',
          contains('Tutup shift terlebih dahulu'),
        ),
      ),
    );

    expect(controller.api.token, 'token');
    expect(controller.authenticated, isTrue);
  });

  test('logout ditolak saat sinkronisasi sedang berlangsung', () async {
    final controller = _controller();
    addTearDown(controller.dispose);
    controller.syncing = true;

    await expectLater(
      controller.logout(),
      throwsA(
        isA<StateError>().having(
          (e) => e.toString(),
          'pesan',
          contains('Sinkronisasi sedang berlangsung'),
        ),
      ),
    );

    expect(controller.api.token, 'token');
  });

  test('logout DEMO tidak memanggil Laravel dan tidak menghapus database demo',
      () async {
    var called = false;
    final client = MockClient((request) async {
      called = true;
      return _json(200, {'data': {}});
    });
    final controller = PosController();
    addTearDown(controller.dispose);
    controller.demo = true;
    controller.cashierId = 'demo';
    controller.local = LocalDb(fileName: 'kuki_pos_demo.db');

    await http.runWithClient(() => controller.logout(), () => client);

    expect(called, isFalse);
    expect(controller.authenticated, isFalse);
    expect(controller.local.fileName, 'kuki_pos_demo.db');
    expect(await const FlutterSecureStorage().read(key: 'token'), 'token');
  });

  test('logout ditolak jika server masih mencatat shift aktif', () async {
    var logoutCalled = false;
    final client = MockClient((request) async {
      if (request.url.path == '/api/pos/shift') {
        return _json(200, {'data': {'active': {'id': 7}}});
      }
      if (request.url.path == '/api/pos/logout') logoutCalled = true;
      return _json(200, {'data': {}});
    });
    final controller = _controller();
    addTearDown(controller.dispose);

    await expectLater(
      () => http.runWithClient(() => controller.logout(), () => client),
      throwsA(
        isA<StateError>().having(
          (e) => e.toString(),
          'pesan',
          contains('shift aktif'),
        ),
      ),
    );

    expect(logoutCalled, isFalse);
    expect(controller.api.token, 'token');
    expect(await const FlutterSecureStorage().read(key: 'token'), 'token');
  });

  test('logout ditolak jika masih ada transaksi conflict', () async {
    final controller = _controller();
    addTearDown(controller.dispose);
    controller.local = _StubLocalDb(
      fakeShifts: [
        {
          'id': 'shift-1',
          'closed_at': '2026-11-20T10:00:00',
          'server_shift_id': '9',
          'server_closed_at': '2026-11-20T10:05:00',
        },
      ],
      fakeSales: [_sale('conflict')],
    );

    await expectLater(
      controller.logout(),
      throwsA(
        isA<StateError>().having(
          (e) => e.toString(),
          'pesan',
          contains('conflict'),
        ),
      ),
    );

    expect(controller.api.token, 'token');
  });

  test('logout ditolak jika penutupan shift lokal belum terkonfirmasi di server',
      () async {
    final client = MockClient((request) async {
      if (request.url.path == '/api/pos/shift') {
        return _json(200, {'data': {'active': {'id': 8}}});
      }
      return _json(200, {'data': {}});
    });
    final controller = _controller();
    addTearDown(controller.dispose);
    controller.local = _StubLocalDb(
      fakeShifts: [
        {
          'id': 'shift-1',
          'closed_at': '2026-11-20T10:00:00',
          'server_shift_id': '9',
          'server_closed_at': null,
        },
      ],
    );

    await expectLater(
      () => http.runWithClient(() => controller.logout(), () => client),
      throwsA(
        isA<StateError>().having(
          (e) => e.toString(),
          'pesan',
          contains('belum terkonfirmasi'),
        ),
      ),
    );

    expect(controller.api.token, 'token');
  });

  test('kegagalan logout server tidak menghapus token lokal', () async {
    final requests = <http.Request>[];
    final client = MockClient((request) async {
      requests.add(request);
      if (request.url.path == '/api/pos/shift') {
        return _json(200, {'data': {'active': null}});
      }
      return _json(500, {'message': 'Gagal logout'});
    });
    final controller = _controller();
    addTearDown(controller.dispose);

    await expectLater(
      () => http.runWithClient(() => controller.logout(), () => client),
      throwsA(isA<ApiProblem>().having((e) => e.status, 'status', 500)),
    );

    expect(
      requests.map((request) => request.url.path),
      contains('/api/pos/logout'),
    );
    expect(controller.api.token, 'token');
    expect(controller.authenticated, isTrue);
    expect(await const FlutterSecureStorage().read(key: 'token'), 'token');
    expect(await const FlutterSecureStorage().read(key: 'cashier_id'), '1');
  });

  test('logout berhasil mencabut sesi server lalu membersihkan identitas lokal',
      () async {
    final requests = <http.Request>[];
    final client = MockClient((request) async {
      requests.add(request);
      if (request.url.path == '/api/pos/shift') {
        return _json(200, {'data': {'active': null}});
      }
      return _json(200, {'data': {'message': 'Sesi telah berakhir.'}});
    });
    final controller = _controller();
    addTearDown(controller.dispose);

    await http.runWithClient(() => controller.logout(), () => client);

    final logout = requests.firstWhere(
      (request) => request.url.path == '/api/pos/logout',
    );
    expect(logout.method, 'POST');
    expect(logout.headers['authorization'], 'Bearer token');
    expect(controller.api.token, isNull);
    expect(controller.authenticated, isFalse);
    expect(controller.cashierId, isEmpty);
    expect(await const FlutterSecureStorage().read(key: 'token'), isNull);
    expect(await const FlutterSecureStorage().read(key: 'cashier'), isNull);
    expect(await const FlutterSecureStorage().read(key: 'cashier_id'), isNull);
    expect(await const FlutterSecureStorage().read(key: 'role'), isNull);
  });

  test('gangguan jaringan saat logout tetap menyimpan token lokal', () async {
    final client = MockClient((request) async {
      if (request.url.path == '/api/pos/shift') {
        return _json(200, {'data': {'active': null}});
      }
      throw http.ClientException('offline');
    });
    addTearDown(client.close);
    final controller = _controller();
    addTearDown(controller.dispose);

    await expectLater(
      () => http.runWithClient(() => controller.logout(), () => client),
      throwsA(isA<ApiProblem>().having((e) => e.status, 'status', 0)),
    );

    expect(controller.api.token, 'token');
    expect(await const FlutterSecureStorage().read(key: 'token'), 'token');
    expect(controller.authenticated, isTrue);
  });

  test('pembukaan shift lokal tetap membuat shift server', () async {
    Map<String, dynamic>? saved;
    final client = MockClient((request) async {
      if (request.url.path == '/api/pos/shift') {
        return _json(200, {'data': {'active': null}});
      }
      if (request.url.path == '/api/pos/shift/start') {
        return _json(201, {
          'data': {'id': 9, 'pulang_pada': null},
        });
      }
      return _json(200, {'data': {}});
    });
    addTearDown(client.close);
    final controller = _controller();
    addTearDown(controller.dispose);
    controller.local = _StubLocalDb(
      onStartShift: (value) async => saved = value,
    );

    await http.runWithClient(() => controller.openShift(), () => client);

    expect(saved?['serverShiftId'], '9');
    expect(saved?['openingCash'], 0);
    expect(controller.activeShift, isNotNull);
  });

  test('sinkronisasi transaksi pending tetap mengirim transaksi ke Laravel',
      () async {
    final requests = <http.Request>[];
    final client = MockClient((request) async {
      requests.add(request);
      if (request.url.path == '/api/pos/shift') {
        return _json(200, {'data': {'active': {'id': 9}}});
      }
      return _json(201, {'data': {'id_client': 'sale-1'}});
    });
    addTearDown(client.close);
    final stub = _StubLocalDb(
      fakeShifts: [
        {
          'id': 'shift-1',
          'closed_at': null,
          'server_shift_id': '9',
          'server_closed_at': null,
        },
      ],
      fakeSales: [_sale('pending')],
    );
    final controller = _controller();
    addTearDown(controller.dispose);
    controller.local = stub;

    await http.runWithClient(() => controller.syncPending(), () => client);

    expect(
      requests.map((request) => request.url.path),
      contains('/api/pos/transactions'),
    );
    expect(stub.syncedIds, contains('sale-1'));
  });

  test('transaksi konflik dapat dikirim ulang tanpa menghapus data lokal',
      () async {
    final client = MockClient((request) async {
      if (request.url.path == '/api/pos/shift') {
        return _json(200, {'data': {'active': {'id': 9}}});
      }
      return _json(201, {'data': {'id_client': 'sale-1'}});
    });
    addTearDown(client.close);
    final stub = _StubLocalDb(
      fakeShifts: [
        {
          'id': 'shift-1',
          'closed_at': null,
          'server_shift_id': '9',
          'server_closed_at': null,
        },
      ],
      fakeSales: [_sale('conflict')],
    );
    final controller = _controller();
    addTearDown(controller.dispose);
    controller.local = stub;

    await http.runWithClient(() => controller.retryConflict('sale-1'), () => client);

    expect(stub.requeuedIds, contains('sale-1'));
    expect(controller.history, isNotEmpty);
  });

  test('kasir biasa tidak dapat membatalkan transaksi', () async {
    final controller = _controller();
    addTearDown(controller.dispose);

    expect(controller.canCancel, isFalse);
    await expectLater(
      controller.cancelSale(
        _sale('synced'),
        jenis: 'void',
        alasan: 'Salah input',
      ),
      throwsA(isA<StateError>()),
    );
  });

  test('owner dapat membatalkan transaksi tersinkron tanpa menghapus riwayat',
      () async {
    final client = MockClient((request) async {
      if (request.url.path ==
          '/api/pos/transactions/sale-1/pembatalan') {
        return _json(200, {
          'success': true,
          'data': {
            'id_client': 'sale-1',
            'status_transaksi': 'void',
            'dibatalkan_oleh': 'Owner Kuki',
            'dibatalkan_pada': '2026-11-20T10:00:00Z',
          },
        });
      }
      return _json(200, {'data': {'active': null, 'history': []}});
    });
    addTearDown(client.close);
    final stub = _StubLocalDb(fakeSales: [_sale('synced')]);
    final controller = _controller(role: 'owner');
    addTearDown(controller.dispose);
    controller.local = stub;

    await http.runWithClient(
      () => controller.cancelSale(
        _sale('synced'),
        jenis: 'void',
        alasan: 'Salah input pelanggan',
      ),
      () => client,
    );

    expect(controller.canCancel, isTrue);
    expect(stub.cancellations, hasLength(1));
    expect(stub.cancellations.first['status'], 'void');
    expect(stub.cancellations.first['actor'], 'Owner Kuki');
  });

  test('penutupan shift tetap menyimpan uang akhir dan catatan', () async {
    Map<String, dynamic>? closed;
    final controller = _controller();
    addTearDown(controller.dispose);
    controller.activeShift = 'shift-1';
    controller.local = _StubLocalDb(
      onCloseShift: (value) async => closed = value,
    );

    await controller.endShift(12500, 'Selisis 12.500');

    expect(closed?['id'], 'shift-1');
    expect(closed?['closingCash'], 12500);
    expect(closed?['note'], 'Selisis 12.500');
    expect(controller.activeShift, isNull);
  });
}
