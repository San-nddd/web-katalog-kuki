import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'models.dart';

class ApiError implements Exception {
  final String message;
  final int status;
  ApiError(this.message, [this.status = 0]);
  @override String toString() => message;
}

class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();
  static const String baseUrl = String.fromEnvironment('API_BASE_URL',
      defaultValue: 'http://10.0.2.2:8000/api');
  static const _storage = FlutterSecureStorage();
  String? _token;
  String? staffName;
  String? staffCode;

  Future<void> restore() async { _token = await _storage.read(key: 'kuki_pos_token'); }
  bool get signedIn => _token?.isNotEmpty ?? false;
  Future<dynamic> request(String method, String path, {Map<String, dynamic>? body}) async {
    final uri = Uri.parse('$baseUrl$path');
    try {
      // Avoid reusing mutable Request across retries; each call constructs a new one.
      final req = http.Request(method, uri);
      req.headers.addAll({'Accept': 'application/json', 'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token'});
      if (body != null) req.body = jsonEncode(body);
      final client = http.Client();
      late final String responseBody;
      late final int statusCode;
      try {
        final streamed = await client.send(req).timeout(const Duration(seconds: 18));
        statusCode = streamed.statusCode;
        responseBody = await streamed.stream.bytesToString().timeout(const Duration(seconds: 18));
      } finally { client.close(); }
      final decoded = responseBody.isEmpty ? <String, dynamic>{} : jsonDecode(responseBody);
      final data = asMap(decoded);
      if (statusCode < 200 || statusCode >= 300) {
        final fieldErrors = asMap(data['errors']);
        final firstError = fieldErrors.values.isNotEmpty ? fieldErrors.values.first : null;
        final msg = firstError is List && firstError.isNotEmpty
            ? '${firstError.first}' : '${data['message'] ?? 'Server menolak permintaan.'}';
        throw ApiError(msg, statusCode);
      }
      return data['data'];
    } on ApiError { rethrow; }
      on TimeoutException { throw ApiError('Koneksi ke server habis waktu. Periksa jaringan dan status transaksi.'); }
      on FormatException { throw ApiError('Response Laravel tidak berbentuk JSON yang valid.'); }
      catch (_) { throw ApiError('Tidak dapat terhubung ke Laravel API. Periksa URL server dan jaringan.'); }
  }

  Future<void> login(String code, String pin) async {
    final data = asMap(await request('POST', '/pos/login', body: {'kode': code, 'pin': pin}));
    final token = data['token']?.toString();
    if (token == null || token.isEmpty) throw ApiError('Token login tidak ditemukan.');
    _token = token;
    final staff = asMap(data['pegawai']);
    staffName = '${staff['nama'] ?? ''}';
    staffCode = '${staff['kode'] ?? ''}';
    await _storage.write(key: 'kuki_pos_token', value: token);
  }
  Future<bool> validate() async {
    if (!signedIn) return false;
    try {
      final data = asMap(await request('GET', '/pos/me'));
      final staff = asMap(data['pegawai']);
      staffName = '${staff['nama'] ?? ''}';
      staffCode = '${staff['kode'] ?? ''}';
      return true;
    } on ApiError catch (e) {
      if (e.status == 401) { await clear(); return false; }
      rethrow;
    }
  }
  Future<void> clear() async {
    _token = null; staffName = null; staffCode = null;
    await _storage.delete(key: 'kuki_pos_token');
  }
  Future<void> logout() async {
    try { if (signedIn) await request('POST', '/pos/logout'); } finally { await clear(); }
  }
  Future<List<PosProduct>> catalog() async {
    final data = await request('GET','/pos/catalog');
    return (data as List).map(PosProduct.fromJson).toList();
  }
  Future<Map<String, dynamic>> shift() async => asMap(await request('GET','/pos/shift'));
  Future<void> startShift() async => await request('POST','/pos/shift/start');
  Future<void> endShift() async => await request('POST','/pos/shift/end');
  Future<PosReceipt> checkout(LocalOrder order, {required String method, required int paid,
      required bool verified}) async {
    final data = await request('POST','/pos/transactions', body: {
      'id_client': order.clientId, 'items': order.payload,
      'jenis_pesanan': order.type, 'nomor_meja': order.table.isEmpty ? null : order.table,
      'nama_pelanggan': order.name.isEmpty ? null : order.name,
      'catatan': order.notes.isEmpty ? null : order.notes,
      'metode_bayar': method, 'dibayar': paid, 'verifikasi_manual': verified,
    });
    return PosReceipt(data);
  }
  Future<Map<String, dynamic>> history({String? from, String? until, int page = 1}) async {
    final p = <String, String>{
      'page': '$page',
      'dari': ?from,
      'sampai': ?until,
    };
    return asMap(await request('GET','/pos/transactions?${Uri(queryParameters:p).query}'));
  }
  Future<Map<String, dynamic>> report(String from, String until) async =>
    asMap(await request('GET','/pos/report?${Uri(queryParameters:{'dari': from,'sampai': until}).query}'));
}
