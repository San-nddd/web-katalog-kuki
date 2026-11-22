import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../core/models.dart';
import 'models.dart' as legacy;

class ApiProblem implements Exception {
  final int status;
  final String message;
  const ApiProblem(this.status, this.message);
  @override
  String toString() => message;
}

class LoginResult {
  final String token;
  final String name;
  final String role;
  const LoginResult(this.token, this.name, this.role);
}

class ApiClient {
  static final ApiClient instance = ApiClient();

  String baseUrl;
  String? token;
  String? staffName;
  String? staffCode;
  ApiClient({this.baseUrl = 'http://10.0.2.2:8000'});

  Future<dynamic> request(
    String method,
    String path, {
    Object? data,
    String? idempotencyKey,
  }) async {
    final server = Uri.tryParse(baseUrl.trim());
    if (server == null ||
        !['http', 'https'].contains(server.scheme) ||
        server.host.isEmpty) {
      throw const ApiProblem(
        0,
        'Alamat server harus berupa http://IP:8000 atau https://domain.',
      );
    }
    // Alamat yang dimasukkan adalah akar Laravel, bukan URL /api.
    if (server.path.isNotEmpty && server.path != '/') {
      throw const ApiProblem(
        0,
        'Isi alamat server tanpa /api atau path tambahan. Contoh: http://192.168.1.10:8000',
      );
    }
    final uri = server.replace(path: path);
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (token != null && token!.isNotEmpty) {
      headers['Authorization'] = 'Bearer ${token!}';
    }
    if (idempotencyKey != null) headers['Idempotency-Key'] = idempotencyKey;
    late http.Response result;
    try {
      final body = data == null ? null : jsonEncode(data);
      if (method == 'POST') {
        result = await http
            .post(uri, headers: headers, body: body)
            .timeout(const Duration(seconds: 15));
      } else if (method == 'GET') {
        result = await http
            .get(uri, headers: headers)
            .timeout(const Duration(seconds: 15));
      } else {
        throw StateError('Metode HTTP tidak didukung');
      }
    } on TimeoutException {
      throw ApiProblem(
        0,
        'Server tidak merespons dalam 15 detik. Pastikan Laravel menyala, IP komputer benar, dan Android tersambung ke jaringan yang sama.',
      );
    } on http.ClientException catch (error) {
      throw ApiProblem(0, 'Gagal menghubungi server: ${error.message}');
    }
    dynamic parsed;
    try {
      parsed = jsonDecode(result.body);
    } catch (_) {
      parsed = null;
    }
    if (result.statusCode < 200 || result.statusCode >= 300) {
      final content = unwrapMap(parsed);
      final message = asText(content['message']).isNotEmpty
          ? asText(content['message'])
          : 'HTTP ${result.statusCode} pada $path';
      throw ApiProblem(result.statusCode, message);
    }
    return parsed;
  }

  Future<LoginResult> login(String kode, String pin) async {
    final res = unwrapMap(
      await request(
        'POST',
        '/api/pos/login',
        data: {'kode': kode.trim().toUpperCase(), 'pin': pin},
      ),
    );
    final data = unwrapMap(res['data']);
    final pegawai = unwrapMap(data['pegawai']);
    final value = asText(data['token']);
    if (value.isEmpty) {
      throw const ApiProblem(
        400,
        'Login berhasil tetapi API tidak mengembalikan token POS.',
      );
    }
    token = value;
    staffName = asText(pegawai['nama']);
    staffCode = asText(pegawai['kode']);
    return LoginResult(value, asText(pegawai['nama'] ?? kode), 'kasir');
  }

  Future<void> logout() async {
    try {
      if (token?.isNotEmpty ?? false) {
        await request('POST', '/api/pos/logout');
      }
    } finally {
      token = null;
      staffName = null;
      staffCode = null;
    }
  }

  Future<List<legacy.PosProduct>> catalog() async {
    final result = unwrapMap(await request('GET', '/api/pos/catalog'));
    return unwrapList(result['data']).map(legacy.PosProduct.fromJson).toList();
  }

  Future<Map<String, dynamic>> shift() async {
    final result = unwrapMap(await request('GET', '/api/pos/shift'));
    return unwrapMap(result['data']);
  }

  Future<void> startShift() async {
    await request('POST', '/api/pos/shift/start');
  }

  Future<void> endShift() async {
    await request('POST', '/api/pos/shift/end');
  }

  Future<legacy.PosReceipt> checkout(
    legacy.LocalOrder order, {
    required String method,
    required int paid,
    required bool verified,
  }) async {
    final result = unwrapMap(
      await request(
        'POST',
        '/api/pos/transactions',
        data: {
          'id_client': order.clientId,
          'items': order.payload,
          'jenis_pesanan': order.type,
          'nomor_meja': order.table.isEmpty ? null : order.table,
          'nama_pelanggan': order.name.isEmpty ? null : order.name,
          'catatan': order.notes.isEmpty ? null : order.notes,
          'metode_bayar': method,
          'dibayar': paid,
          'verifikasi_manual': verified,
        },
        idempotencyKey: order.clientId,
      ),
    );
    return legacy.PosReceipt(result['data']);
  }

  Future<Map<String, dynamic>> history({int page = 1}) async {
    final result = unwrapMap(
      await request('GET', '/api/pos/transactions?page=$page'),
    );
    return unwrapMap(result['data']);
  }

  Future<Map<String, dynamic>> report(String from, String until) async {
    final query = Uri(queryParameters: {'dari': from, 'sampai': until}).query;
    final result = unwrapMap(await request('GET', '/api/pos/report?$query'));
    return unwrapMap(result['data']);
  }

  Future<void> sendSale(Sale sale) async {
    final body = {
      'client_uuid': sale.uuid,
      'client_created_at': sale.createdAt.toUtc().toIso8601String(),
      'cashier': sale.cashier,
      'shift_client_uuid': sale.shiftId,
      'payment_method': sale.method,
      'subtotal': sale.subtotal,
      'discount': sale.discount,
      'total': sale.total,
      'paid': sale.paid,
      'note': sale.note,
      'items': sale.lines
          .map(
            (line) => {
              'produk_id': line['product_id'],
              'jumlah': line['quantity'],
              'harga_satuan': line['unit_price'],
            },
          )
          .toList(),
    };
    // Laravel HARUS memvalidasi stok & harga, menjamin client_uuid unik, dan mengembalikan 2xx untuk replay.
    await request(
      'POST',
      '/api/pos/transaksi',
      data: body,
      idempotencyKey: sale.uuid,
    );
  }
}
