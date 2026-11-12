import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:kuki_pos/data/api_client.dart';

void main() {
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
