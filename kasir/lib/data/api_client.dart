import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../core/models.dart';

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
  String baseUrl;
  String? token;
  ApiClient({this.baseUrl = 'http://10.0.2.2:8000'});

  Future<dynamic> request(
    String method,
    String path, {
    Object? data,
    String? idempotencyKey,
    Map<String, String>? queryParameters,
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
    final uri = server.replace(path: path, queryParameters: queryParameters);
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (token != null && token!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
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
    return LoginResult(value, asText(pegawai['nama'] ?? kode), 'kasir');
  }

  Future<Map<String, dynamic>> me() async {
    final result = unwrapMap(await request('GET', '/api/pos/me'));
    return unwrapMap(unwrapMap(result['data'])['pegawai']);
  }

  Future<bool> isServerReachable() async {
    try {
      await request('GET', '/api/pos/me');
      return true;
    } on ApiProblem catch (problem) {
      return problem.status != 0;
    }
  }

  Future<List<Product>> catalog() async {
    final result = unwrapMap(await request('GET', '/api/pos/catalog'));
    return unwrapList(
      result['data'],
    ).map((item) => Product.fromApi(unwrapMap(item))).toList();
  }

  Future<Map<String, dynamic>> shift() async {
    final result = unwrapMap(await request('GET', '/api/pos/shift'));
    return unwrapMap(result['data']);
  }

  Future<Map<String, dynamic>> startShift() async {
    final result = unwrapMap(await request('POST', '/api/pos/shift/start'));
    return unwrapMap(result['data']);
  }

  Future<void> endShift() async {
    await request('POST', '/api/pos/shift/end');
  }

  Future<void> logout() async {
    await request('POST', '/api/pos/logout');
    token = null;
  }

  Future<Map<String, dynamic>> transactions({int page = 1}) async {
    final result = unwrapMap(
      await request(
        'GET',
        '/api/pos/transactions',
        queryParameters: {'page': '$page'},
      ),
    );
    return unwrapMap(result['data']);
  }

  Future<Map<String, dynamic>> report({
    required DateTime from,
    required DateTime until,
  }) async {
    String date(DateTime value) =>
        '${value.year.toString().padLeft(4, '0')}-'
        '${value.month.toString().padLeft(2, '0')}-'
        '${value.day.toString().padLeft(2, '0')}';
    final result = unwrapMap(
      await request(
        'GET',
        '/api/pos/report',
        queryParameters: {'dari': date(from), 'sampai': date(until)},
      ),
    );
    return unwrapMap(result['data']);
  }

  Future<Map<String, dynamic>> checkout({
    required String id,
    required List<Map<String, dynamic>> items,
    required String method,
    required int paid,
    required bool verified,
    required String orderType,
    required String table,
    required String customer,
    required String note,
  }) async {
    final result = unwrapMap(
      await request(
        'POST',
        '/api/pos/transactions',
        data: {
          'id_client': id,
          'items': items,
          'metode_bayar': method,
          'dibayar': paid,
          'verifikasi_manual': verified,
          'jenis_pesanan': orderType,
          'nomor_meja': table.isEmpty ? null : table,
          'nama_pelanggan': customer.isEmpty ? null : customer,
          'catatan': note.isEmpty ? null : note,
        },
        idempotencyKey: id,
      ),
    );
    return unwrapMap(result['data']);
  }

  Future<void> sendSale(Sale sale) async {
    if (sale.discount != 0) {
      throw const ApiProblem(422, 'Diskon belum didukung oleh API POS.');
    }
    final noteParts = sale.note.split(' | ');
    String? valueFor(String prefix) {
      for (final part in noteParts) {
        if (part.startsWith(prefix)) return part.substring(prefix.length);
      }
      return null;
    }

    final method = switch (sale.method) {
      'cash' => 'tunai',
      'qris_manual' => 'qris',
      'transfer' => 'transfer',
      _ => throw const ApiProblem(
        422,
        'Metode pembayaran tidak didukung API POS.',
      ),
    };
    final items = sale.lines.map((line) {
      final productId = int.tryParse(asText(line['product_id']));
      if (productId == null) {
        throw const ApiProblem(422, 'ID produk tidak valid untuk API POS.');
      }
      return {'produk_id': productId, 'jumlah': asInt(line['quantity'])};
    }).toList();
    await checkout(
      id: sale.uuid,
      items: items,
      method: method,
      paid: sale.paid,
      verified: method == 'tunai' || sale.method == 'qris_manual',
      orderType: valueFor('Tipe: ') == 'Makan di tempat'
          ? 'dine_in'
          : 'takeaway',
      table: valueFor('Meja: ') ?? '',
      customer: valueFor('Pesanan: ') ?? '',
      note: valueFor('Catatan: ') ?? '',
    );
  }
}
