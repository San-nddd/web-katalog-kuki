import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:kuki_pos/data/api_client.dart';

void main() {
  test('server reachable saat API memberikan respons HTTP', () async {
    final client = MockClient((request) async {
      expect(request.url.path, '/api/pos/me');
      return http.Response('Tidak terautentikasi', 401);
    });
    addTearDown(client.close);

    final reachable = await http.runWithClient(
      () => ApiClient(baseUrl: 'http://localhost:8000').isServerReachable(),
      () => client,
    );

    expect(reachable, isTrue);
  });

  test('server tidak reachable saat request gagal di transport', () async {
    final client = MockClient(
      (_) async => throw http.ClientException('offline'),
    );
    addTearDown(client.close);

    final reachable = await http.runWithClient(
      () => ApiClient(baseUrl: 'http://localhost:8000').isServerReachable(),
      () => client,
    );

    expect(reachable, isFalse);
  });
}
