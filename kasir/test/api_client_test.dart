import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:kuki_pos/core/models.dart';
import 'package:kuki_pos/data/api_client.dart';

http.Response _jsonResponse(int status, {required Map<String, dynamic> data}) =>
    http.Response(
      jsonEncode({'success': true, 'data': data}),
      status,
      headers: {'content-type': 'application/json'},
    );

void main() {
  test('default server memakai konfigurasi API POS', () {
    expect(ApiClient().baseUrl, defaultPosApiBaseUrl);
  });

  test(
    'login memakai kode pegawai dan PIN pada endpoint POS Laravel',
    () async {
      http.Request? loginRequest;
      final client = MockClient((request) async {
        loginRequest = request;
        return http.Response(
          jsonEncode({
            'success': true,
            'data': {
              'token': 'session-token',
              'pegawai': {'kode': 'KASIR01', 'nama': 'Kasir Kuki'},
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });
      addTearDown(client.close);

      final session = await http.runWithClient(
        () => ApiClient(
          baseUrl: 'http://localhost:8000',
        ).login(' kasir01 ', '0123'),
        () => client,
      );

      expect(loginRequest?.url.path, '/api/pos/login');
      expect(jsonDecode(loginRequest!.body), {
        'kode': 'KASIR01',
        'pin': '0123',
      });
      expect(session.name, 'Kasir Kuki');
      expect(session.role, 'kasir');
    },
  );

  test('login memakai peran yang diberikan API', () async {
    final client = MockClient((request) async {
      return _jsonResponse(
        200,
        data: {
          'token': 'session-token',
          'pegawai': {
            'id': '7',
            'nama': 'Owner Kuki',
            'role': 'owner',
          },
        },
      );
    });
    addTearDown(client.close);

    final session = await http.runWithClient(
      () => ApiClient(baseUrl: 'http://localhost:8000').login('owner01', '0123'),
      () => client,
    );

    expect(session.role, 'owner');
    expect(session.cashierId, '7');
  });

  test('pembatalan transaksi memakai UUID client dan alasan', () async {
    http.Request? cancelRequest;
    final client = MockClient((request) async {
      cancelRequest = request;
      return _jsonResponse(
        200,
        data: {'id_client': 'sale-1', 'status_transaksi': 'void'},
      );
    });
    addTearDown(client.close);
    final api = ApiClient(baseUrl: 'http://localhost:8000');

    final result = await http.runWithClient(
      () => api.cancelSale(
        'sale-1',
        jenis: 'void',
        alasan: 'Salah input kasir',
      ),
      () => client,
    );

    expect(cancelRequest?.method, 'POST');
    expect(cancelRequest?.url.path, '/api/pos/transactions/sale-1/pembatalan');
    expect(jsonDecode(cancelRequest!.body), {
      'jenis': 'void',
      'alasan': 'Salah input kasir',
    });
    expect(result['status_transaksi'], 'void');
  });

  test('sinkronisasi transfer memakai status verifikasi yang tersimpan', () async {
    http.Request? checkoutRequest;
    final client = MockClient((request) async {
      checkoutRequest = request;
      return http.Response(
        jsonEncode({'success': true, 'data': {'nomor': 'KP-1'}}),
        200,
        headers: {'content-type': 'application/json'},
      );
    });
    addTearDown(client.close);
    final api = ApiClient(baseUrl: 'http://localhost:8000');
    final sale = Sale(
      uuid: '11111111-1111-4111-8111-111111111111',
      createdAt: DateTime.now(),
      cashier: 'Kasir Kuki',
      shiftId: 'shift-1',
      method: 'transfer',
      status: 'pending',
      subtotal: 20000,
      discount: 0,
      total: 20000,
      paid: 20000,
      note: 'Tipe: Bawa pulang | Pesanan: Pelanggan',
      verified: true,
      lines: [
        {
          'product_id': '12',
          'name': 'Roti',
          'quantity': 2,
          'unit_price': 10000,
        },
      ],
    );

    await http.runWithClient(() => api.sendSale(sale), () => client);

    final body = jsonDecode(checkoutRequest!.body);
    expect(body['id_client'], sale.uuid);
    expect(body['metode_bayar'], 'transfer');
    expect(body['verifikasi_manual'], isTrue);
  });

  test('request terautentikasi mengirim token ke API POS', () async {
    http.Request? apiRequest;
    final client = MockClient((request) async {
      apiRequest = request;
      return http.Response(
        jsonEncode({
          'data': {
            'pegawai': {'nama': 'Kasir Kuki'},
          },
        }),
        200,
        headers: {'content-type': 'application/json'},
      );
    });
    addTearDown(client.close);

    final api = ApiClient(baseUrl: 'http://localhost:8000')
      ..token = 'session-token';
    await http.runWithClient(() => api.me(), () => client);

    expect(apiRequest?.url.path, '/api/pos/me');
    expect(apiRequest?.headers['authorization'], 'Bearer session-token');
  });
}
