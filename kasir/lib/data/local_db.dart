import 'dart:convert';
import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';
import '../core/models.dart';

class LocalDb {
  Database? _db;
  String fileName;
  LocalDb({this.fileName = 'kuki_pos.db'});
  bool get isOpen => _db != null;

  Future<void> open() async {
    if (_db != null) return;
    final dir = await getDatabasesPath();
    _db = await openDatabase(p.join(dir, fileName), version: 1, onCreate: (db, _) async {
      await db.execute('CREATE TABLE products (id TEXT PRIMARY KEY, name TEXT NOT NULL, category_id TEXT, category_name TEXT, sku TEXT, barcode TEXT, image_url TEXT, price INTEGER NOT NULL, stock INTEGER NOT NULL, minimum_stock INTEGER NOT NULL DEFAULT 0)');
      await db.execute('CREATE TABLE drafts (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
      await db.execute('CREATE TABLE shifts (id TEXT PRIMARY KEY, cashier TEXT NOT NULL, opened_at TEXT NOT NULL, opening_cash INTEGER NOT NULL, closed_at TEXT, closing_cash INTEGER, note TEXT)');
      await db.execute('CREATE TABLE sales (uuid TEXT PRIMARY KEY, created_at TEXT NOT NULL, cashier TEXT NOT NULL, shift_id TEXT NOT NULL, method TEXT NOT NULL, status TEXT NOT NULL, subtotal INTEGER NOT NULL, discount INTEGER NOT NULL, total INTEGER NOT NULL, paid INTEGER NOT NULL, note TEXT NOT NULL, error TEXT)');
      await db.execute('CREATE TABLE sale_lines (id INTEGER PRIMARY KEY AUTOINCREMENT, sale_uuid TEXT NOT NULL, product_id TEXT NOT NULL, name TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price INTEGER NOT NULL)');
    }, onOpen: _verifySchema);
  }

  /// Periksa struktur saja. Jangan ubah/hapus database kasir lama secara otomatis.
  Future<void> _verifySchema(Database db) async {
    const required = <String, List<String>>{
      'products': ['id', 'name', 'price', 'stock', 'minimum_stock', 'category_id', 'category_name', 'sku', 'barcode', 'image_url'],
      'drafts': ['id', 'data'],
      'shifts': ['id', 'cashier', 'opened_at', 'opening_cash', 'closed_at', 'closing_cash', 'note'],
      'sales': ['uuid', 'created_at', 'cashier', 'shift_id', 'method', 'status', 'subtotal', 'discount', 'total', 'paid', 'note', 'error'],
      'sale_lines': ['id', 'sale_uuid', 'product_id', 'name', 'quantity', 'unit_price'],
    };
    for (final table in required.entries) {
      final rows = await db.rawQuery('PRAGMA table_info(${table.key})');
      final current = rows.map((row) => asText(row['name'])).toSet();
      final missing = table.value.where((column) => !current.contains(column)).toList();
      if (missing.isNotEmpty) {
        throw StateError('Skema database $fileName tidak cocok. Tabel ${table.key}: '
          'kolom tidak ditemukan (${missing.join(', ')}). Jangan hapus database; '
          'backup file dan periksa migrasi dari versi kasir sebelumnya.');
      }
    }
  }

  Database get db {
    final value = _db;
    if (value == null) throw StateError('Database belum dibuka');
    return value;
  }
  Future<void> close() async { await _db?.close(); _db = null; }
  Future<List<Product>> products() async => (await db.query('products', orderBy: 'name COLLATE NOCASE')).map(Product.fromDb).toList();
  Future<Product?> byBarcode(String value) async {
    final key = value.trim();
    final rows = await db.query('products', where: 'barcode = ? OR sku = ?', whereArgs: [key, key], limit: 1);
    return rows.isEmpty ? null : Product.fromDb(rows.first);
  }
  Future<void> replaceCatalog(List<Product> catalog) async {
    // Kurangi stok server dengan transaksi lokal yang belum diterima server.
    final pending = await db.rawQuery("SELECT l.product_id, SUM(l.quantity) AS reserved FROM sale_lines l JOIN sales s ON s.uuid = l.sale_uuid WHERE s.status != 'synced' GROUP BY l.product_id");
    final reserved = {for (final row in pending) asText(row['product_id']): asInt(row['reserved'])};
    await db.transaction((txn) async {
      final batch = txn.batch();
      for (final item in catalog) {
        final remaining = (item.stock - (reserved[item.id] ?? 0)).clamp(0, item.stock).toInt();
        batch.insert('products', item.withStock(remaining).toDb(), conflictAlgorithm: ConflictAlgorithm.replace);
      }
      await batch.commit(noResult: true);
    });
  }
  Future<List<OrderDraft>> loadDrafts() async => (await db.query('drafts')).map((e) => OrderDraft.parse(asText(e['data']))).toList();
  Future<void> saveDraft(OrderDraft draft) => db.insert('drafts', {'id': draft.id, 'data': draft.serialize()}, conflictAlgorithm: ConflictAlgorithm.replace).then((_) {});
  Future<void> deleteDraft(String id) => db.delete('drafts', where: 'id = ?', whereArgs: [id]).then((_) {});
  Future<Map<String, Object?>?> openShift() async {
    final rows = await db.query('shifts', where: 'closed_at IS NULL', orderBy: 'opened_at DESC', limit: 1);
    return rows.isEmpty ? null : rows.first;
  }
  Future<void> startShift(String id, String cashier, int openingCash) async {
    if (await openShift() != null) throw StateError('Masih ada shift yang terbuka');
    await db.insert('shifts', {'id': id, 'cashier': cashier, 'opened_at': DateTime.now().toIso8601String(), 'opening_cash': openingCash});
  }
  Future<void> closeShift(String id, int closingCash, String note) async {
    await db.update('shifts', {
      'closed_at': DateTime.now().toIso8601String(), 'closing_cash': closingCash, 'note': note,
    }, where: 'id = ? AND closed_at IS NULL', whereArgs: [id]);
  }
  Future<Sale> checkout({required OrderDraft draft, required String cashier,
    required String shiftId, required String method, required int paid}) async {
    if (draft.lines.isEmpty) throw StateError('Keranjang masih kosong');
    if (draft.total < 1) throw StateError('Total transaksi harus positif');
    if (method == 'cash' && paid < draft.total) throw StateError('Uang tunai belum mencukupi');
    if (!['cash', 'transfer', 'qris_manual'].contains(method)) throw StateError('Metode pembayaran tidak didukung');
    final uid = uuid.v4();
    final time = DateTime.now();
    await db.transaction((txn) async {
      final shiftRows = await txn.query('shifts', columns: ['id'], where: 'id = ? AND closed_at IS NULL', whereArgs: [shiftId], limit: 1);
      if (shiftRows.isEmpty) throw StateError('Shift sudah ditutup. Buka shift baru.');
      for (final line in draft.lines) {
        final stockRows = await txn.query('products', columns: ['stock'], where: 'id = ?', whereArgs: [line.product.id], limit: 1);
        if (stockRows.isEmpty) throw StateError('Produk ${line.product.name} tidak ditemukan');
        if (asInt(stockRows.first['stock']) < line.quantity) throw StateError('Stok ${line.product.name} tidak cukup');
      }
      await txn.insert('sales', {
        'uuid': uid, 'created_at': time.toIso8601String(), 'cashier': cashier,
        'shift_id': shiftId, 'method': method, 'status': 'pending',
        'subtotal': draft.subtotal, 'discount': draft.discount, 'total': draft.total,
        'paid': paid, 'note': [
          'Tipe: ${draft.orderType == 'dine_in' ? 'Makan di tempat' : 'Bawa pulang'}',
          if (draft.tableNumber.isNotEmpty) 'Meja: ${draft.tableNumber}',
          if (draft.name.isNotEmpty) 'Pesanan: ${draft.name}',
          if (draft.note.isNotEmpty) 'Catatan: ${draft.note}',
        ].join(' | '),
      });
      for (final line in draft.lines) {
        await txn.insert('sale_lines', {
          'sale_uuid': uid, 'product_id': line.product.id, 'name': line.product.name,
          'quantity': line.quantity, 'unit_price': line.product.price,
        });
        await txn.rawUpdate('UPDATE products SET stock = stock - ? WHERE id = ?', [line.quantity, line.product.id]);
      }
      await txn.delete('drafts', where: 'id = ?', whereArgs: [draft.id]);
    });
    return (await getSale(uid))!;
  }
  Future<Sale?> getSale(String id) async {
    final result = await db.query('sales', where: 'uuid = ?', whereArgs: [id], limit: 1);
    return result.isEmpty ? null : _saleFromRow(result.first);
  }
  Future<Sale> _saleFromRow(Map<String, Object?> row) async {
    final lines = await db.query('sale_lines', where: 'sale_uuid = ?', whereArgs: [row['uuid']]);
    return Sale(
      uuid: asText(row['uuid']), createdAt: DateTime.parse(asText(row['created_at'])),
      cashier: asText(row['cashier']), shiftId: asText(row['shift_id']),
      method: asText(row['method']), status: asText(row['status']),
      subtotal: asInt(row['subtotal']), discount: asInt(row['discount']),
      total: asInt(row['total']), paid: asInt(row['paid']), note: asText(row['note']),
      error: row['error']?.toString(),
      lines: lines.map((e) => {
        'product_id': e['product_id'], 'name': e['name'], 'quantity': e['quantity'], 'unit_price': e['unit_price']
      }).toList(),
    );
  }
  Future<List<Sale>> sales({int limit = 300, String? status, DateTime? from, DateTime? to}) async {
    final conditions = <String>[];
    final args = <Object?>[];
    if (status != null && status != 'all') { conditions.add('status = ?'); args.add(status); }
    if (from != null) {conditions.add('created_at >= ?'); args.add(from.toIso8601String());}
    if (to != null) {conditions.add('created_at < ?'); args.add(to.toIso8601String());}
    final rows = await db.query('sales', where: conditions.isEmpty ? null : conditions.join(' AND '), whereArgs: args,
      orderBy: 'created_at DESC', limit: limit);
    final result = <Sale>[];
    for (final row in rows) {result.add(await _saleFromRow(row));}
    return result;
  }
  Future<int> pendingCount() async {
    final rows = await db.rawQuery("SELECT COUNT(*) AS count FROM sales WHERE status = 'pending'");
    return asInt(rows.first['count']);
  }
  Future<void> markSynced(String id) async => db.update('sales', {'status': 'synced', 'error': null}, where: 'uuid = ? AND status = ?', whereArgs: [id, 'pending']).then((_) {});
  Future<void> markConflict(String id, String reason) async => db.update('sales', {'status': 'conflict', 'error': reason}, where: 'uuid = ? AND status = ?', whereArgs: [id, 'pending']).then((_) {});
  Future<String> exportSalesJson() async => jsonEncode((await sales(limit: 5000)).map((s) => {
    'client_uuid': s.uuid, 'created_at': s.createdAt.toIso8601String(), 'method': s.method,
    'status': s.status, 'total': s.total, 'lines': s.lines,
  }).toList());
}
