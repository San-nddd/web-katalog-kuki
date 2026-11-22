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
    _db = await openDatabase(
      p.join(dir, fileName),
      version: 5,
      onCreate: (db, _) async {
        await db.execute('CREATE TABLE products (id TEXT PRIMARY KEY, name TEXT NOT NULL, category_id TEXT, category_name TEXT, sku TEXT, barcode TEXT, image_url TEXT, price INTEGER NOT NULL, stock INTEGER NOT NULL, minimum_stock INTEGER NOT NULL DEFAULT 0, aktif INTEGER NOT NULL DEFAULT 1)');
        await db.execute('CREATE TABLE drafts (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
        await db.execute('CREATE TABLE shifts (id TEXT PRIMARY KEY, cashier TEXT NOT NULL, cashier_id TEXT, opened_at TEXT NOT NULL, opening_cash INTEGER NOT NULL, closed_at TEXT, closing_cash INTEGER, note TEXT, server_shift_id TEXT, server_closed_at TEXT)');
        await db.execute("CREATE TABLE sales (uuid TEXT PRIMARY KEY, created_at TEXT NOT NULL, cashier TEXT NOT NULL, cashier_id TEXT, shift_id TEXT NOT NULL, method TEXT NOT NULL, status TEXT NOT NULL, subtotal INTEGER NOT NULL, discount INTEGER NOT NULL, total INTEGER NOT NULL, paid INTEGER NOT NULL, verified INTEGER NOT NULL DEFAULT 0, transaction_status TEXT NOT NULL DEFAULT 'completed', jenis_pembatalan TEXT, alasan_pembatalan TEXT, dibatalkan_oleh TEXT, dibatalkan_pada TEXT, note TEXT NOT NULL, error TEXT)");
        await db.execute('CREATE TABLE sale_lines (id INTEGER PRIMARY KEY AUTOINCREMENT, sale_uuid TEXT NOT NULL, product_id TEXT NOT NULL, name TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price INTEGER NOT NULL)');
        await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS shifts_one_open_per_cashier ON shifts(cashier_id) WHERE closed_at IS NULL AND cashier_id IS NOT NULL");
      },
      onUpgrade: (db, oldVersion, newVersion) async {
        if (oldVersion < 2) {
          await _addColumnIfMissing(db, 'shifts', 'cashier_id', 'TEXT');
          await _addColumnIfMissing(db, 'shifts', 'server_shift_id', 'TEXT');
          await _addColumnIfMissing(db, 'shifts', 'server_closed_at', 'TEXT');
          await _addColumnIfMissing(db, 'sales', 'cashier_id', 'TEXT');
          await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS shifts_one_open_per_cashier ON shifts(cashier_id) WHERE closed_at IS NULL AND cashier_id IS NOT NULL");
        }
        if (oldVersion < 3) {
          await _addColumnIfMissing(db, 'sales', 'verified', 'INTEGER NOT NULL DEFAULT 0');
          await db.execute("UPDATE sales SET verified = 1 WHERE method IN ('transfer', 'qris_manual') AND status = 'pending'");
        }
        if (oldVersion < 4) {
          await _addColumnIfMissing(db, 'sales', 'transaction_status', "TEXT NOT NULL DEFAULT 'completed'");
          await _addColumnIfMissing(db, 'sales', 'jenis_pembatalan', 'TEXT');
          await _addColumnIfMissing(db, 'sales', 'alasan_pembatalan', 'TEXT');
          await _addColumnIfMissing(db, 'sales', 'dibatalkan_oleh', 'TEXT');
          await _addColumnIfMissing(db, 'sales', 'dibatalkan_pada', 'TEXT');
        }
        if (oldVersion < 5) {
          await _addColumnIfMissing(db, 'products', 'aktif', 'INTEGER NOT NULL DEFAULT 1');
          await db.execute('UPDATE products SET aktif = 1 WHERE aktif IS NULL');
        }
      },
      onOpen: _verifySchema,
    );
  }

  Future<void> _addColumnIfMissing(
    Database db,
    String table,
    String column,
    String type,
  ) async {
    final rows = await db.rawQuery('PRAGMA table_info($table)');
    final columns = rows.map((row) => asText(row['name'])).toSet();
    if (!columns.contains(column)) {
      await db.execute('ALTER TABLE $table ADD COLUMN $column $type');
    }
  }

  /// Periksa struktur saja. Jangan ubah/hapus database kasir lama secara otomatis.
  Future<void> _verifySchema(Database db) async {
    const required = <String, List<String>>{
      'products': ['id', 'name', 'price', 'stock', 'minimum_stock', 'category_id', 'category_name', 'sku', 'barcode', 'image_url', 'aktif'],
      'drafts': ['id', 'data'],
      'shifts': ['id', 'cashier', 'cashier_id', 'opened_at', 'opening_cash', 'closed_at', 'closing_cash', 'note', 'server_shift_id', 'server_closed_at'],
      'sales': ['uuid', 'created_at', 'cashier', 'cashier_id', 'shift_id', 'method', 'status', 'subtotal', 'discount', 'total', 'paid', 'verified', 'transaction_status', 'jenis_pembatalan', 'alasan_pembatalan', 'dibatalkan_oleh', 'dibatalkan_pada', 'note', 'error'],
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
  Future<List<Product>> products() async => (await db.query('products', where: 'aktif = 1', orderBy: 'name COLLATE NOCASE')).map(Product.fromDb).toList();
  Future<Product?> byBarcode(String value) async {
    final key = value.trim();
    final rows = await db.query('products', where: '(barcode = ? OR sku = ?) AND aktif = 1', whereArgs: [key, key], limit: 1);
    return rows.isEmpty ? null : Product.fromDb(rows.first);
  }
  Future<void> replaceCatalog(List<Product> catalog) async {
    // Kurangi stok server dengan transaksi lokal yang belum diterima server.
    final pending = await db.rawQuery("SELECT l.product_id, SUM(l.quantity) AS reserved FROM sale_lines l JOIN sales s ON s.uuid = l.sale_uuid WHERE s.status != 'synced' GROUP BY l.product_id");
    final reserved = {for (final row in pending) asText(row['product_id']): asInt(row['reserved'])};
    await db.transaction((txn) async {
      final ids = catalog.map((item) => item.id).toList();
      if (ids.isEmpty) {
        await txn.update('products', {'aktif': 0}, where: 'aktif != 0');
      } else {
        final placeholders = List.filled(ids.length, '?').join(', ');
        await txn.update('products', {'aktif': 0},
          where: 'id NOT IN ($placeholders) AND aktif != 0', whereArgs: ids);
      }
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
  String _cashierClause(String cashierId) => cashierId.isNotEmpty
      ? '(cashier_id = ? OR (cashier_id IS NULL AND cashier = ?))'
      : 'cashier = ?';

  List<Object?> _cashierArgs(String cashierId, String cashierName) =>
      cashierId.isNotEmpty ? [cashierId, cashierName] : [cashierName];

  Future<Map<String, Object?>?> openShift({
    required String cashierId,
    required String cashierName,
  }) async {
    final rows = await db.query(
      'shifts',
      where: 'closed_at IS NULL AND ${_cashierClause(cashierId)}',
      whereArgs: _cashierArgs(cashierId, cashierName),
      orderBy: 'opened_at DESC',
      limit: 1,
    );
    return rows.isEmpty ? null : rows.first;
  }

  Future<List<Map<String, Object?>>> shiftsForCashier({
    required String cashierId,
    required String cashierName,
  }) => db.query(
    'shifts',
    where: _cashierClause(cashierId),
    whereArgs: _cashierArgs(cashierId, cashierName),
    orderBy: 'opened_at ASC',
  );

  Future<Map<String, Object?>?> shiftById(String id) async {
    final rows = await db.query('shifts', where: 'id = ?', whereArgs: [id], limit: 1);
    return rows.isEmpty ? null : rows.first;
  }

  Future<void> startShift({
    required String id,
    required String cashier,
    required String cashierId,
    required int openingCash,
    String? serverShiftId,
  }) async {
    await db.transaction((txn) async {
      final existing = await txn.query(
        'shifts',
        columns: ['id'],
        where: 'closed_at IS NULL AND ${_cashierClause(cashierId)}',
        whereArgs: _cashierArgs(cashierId, cashier),
        limit: 1,
      );
      if (existing.isNotEmpty) {
        throw StateError('Kasir ini masih memiliki shift yang terbuka.');
      }
      await txn.insert('shifts', {
        'id': id,
        'cashier': cashier,
        'cashier_id': cashierId.isEmpty ? null : cashierId,
        'opened_at': DateTime.now().toIso8601String(),
        'opening_cash': openingCash,
        'server_shift_id': serverShiftId,
        'server_closed_at': null,
      });
    });
  }

  Future<void> closeShift({
    required String id,
    required String cashierId,
    required String cashierName,
  }) async {
    final changed = await db.update(
      'shifts',
      {
        'closed_at': DateTime.now().toIso8601String(),
        'closing_cash': null,
        'note': null,
      },
      where: 'id = ? AND closed_at IS NULL AND ${_cashierClause(cashierId)}',
      whereArgs: [id, ..._cashierArgs(cashierId, cashierName)],
    );
    if (changed == 0) {
      throw StateError('Shift tidak ditemukan, sudah ditutup, atau bukan milik kasir ini.');
    }
  }

  Future<void> setServerShiftId(String localShiftId, String serverShiftId) async {
    await db.update(
      'shifts',
      {'server_shift_id': serverShiftId, 'server_closed_at': null},
      where: 'id = ?',
      whereArgs: [localShiftId],
    );
  }

  Future<void> markServerShiftClosed(String localShiftId) async {
    await db.update(
      'shifts',
      {'server_closed_at': DateTime.now().toIso8601String()},
      where: 'id = ?',
      whereArgs: [localShiftId],
    );
  }

  Future<Sale> checkout({
    required OrderDraft draft,
    required String cashier,
    required String cashierId,
    required String shiftId,
    required String method,
    required int paid,
    required bool verified,
  }) async {
    if (draft.lines.isEmpty) throw StateError('Keranjang masih kosong');
    if (draft.total < 1) throw StateError('Total transaksi harus positif');
    if (method == 'cash' && paid < draft.total) throw StateError('Uang tunai belum mencukupi');
    if (!['cash', 'transfer', 'qris_manual'].contains(method)) throw StateError('Metode pembayaran tidak didukung');
    if (method != 'cash' && !verified) {
      throw StateError('Verifikasi pembayaran manual belum dilakukan');
    }
    final uid = uuid.v4();
    final time = DateTime.now();
    await db.transaction((txn) async {
      final shiftRows = await txn.query(
        'shifts',
        columns: ['id'],
        where: 'id = ? AND closed_at IS NULL AND ${_cashierClause(cashierId)}',
        whereArgs: [shiftId, ..._cashierArgs(cashierId, cashier)],
        limit: 1,
      );
      if (shiftRows.isEmpty) throw StateError('Shift sudah ditutup. Buka shift baru.');
      for (final line in draft.lines) {
        final stockRows = await txn.query('products', columns: ['stock', 'aktif'], where: 'id = ?', whereArgs: [line.product.id], limit: 1);
        if (stockRows.isEmpty) throw StateError('Produk ${line.product.name} tidak ditemukan');
        if (!asBool(stockRows.first['aktif'] ?? 1)) throw StateError('Produk ${line.product.name} sudah diarsipkan');
        if (asInt(stockRows.first['stock']) < line.quantity) throw StateError('Stok ${line.product.name} tidak cukup');
      }
      await txn.insert('sales', {
        'uuid': uid, 'created_at': time.toIso8601String(), 'cashier': cashier,
        'cashier_id': cashierId.isEmpty ? null : cashierId, 'shift_id': shiftId, 'method': method, 'status': 'pending', 'transaction_status': 'completed',
        'subtotal': draft.subtotal, 'discount': draft.discount, 'total': draft.total,
        'paid': paid, 'verified': method == 'cash' || verified ? 1 : 0, 'note': draft.saleNote,
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
      total: asInt(row['total']), paid: asInt(row['paid']),
      verified: asInt(row['verified']) == 1, note: asText(row['note']),
      error: row['error']?.toString(),
      transactionStatus: asText(row['transaction_status']).isEmpty
          ? 'completed'
          : asText(row['transaction_status']),
      voidedBy: row['dibatalkan_oleh']?.toString(),
      voidedAt: row['dibatalkan_pada'] == null
          ? null
          : DateTime.tryParse(asText(row['dibatalkan_pada'])),
      voidReason: row['alasan_pembatalan']?.toString(),
      lines: lines.map((e) => {
        'product_id': e['product_id'], 'name': e['name'], 'quantity': e['quantity'], 'unit_price': e['unit_price']
      }).toList(),
    );
  }
  Future<List<Sale>> sales({
    int limit = 300,
    String? status,
    DateTime? from,
    DateTime? to,
    String? shiftId,
    String? cashierId,
    String? cashierName,
  }) async {
    final conditions = <String>[];
    final args = <Object?>[];
    if (status != null && status != 'all') {
      conditions.add('status = ?');
      args.add(status);
    }
    if (from != null) {
      conditions.add('created_at >= ?');
      args.add(from.toIso8601String());
    }
    if (to != null) {
      conditions.add('created_at < ?');
      args.add(to.toIso8601String());
    }
    if (shiftId != null && shiftId.isNotEmpty) {
      conditions.add('shift_id = ?');
      args.add(shiftId);
    }
    if (cashierId != null && cashierName != null) {
      conditions.add(_cashierClause(cashierId));
      args.addAll(_cashierArgs(cashierId, cashierName));
    }
    final rows = await db.query(
      'sales',
      where: conditions.isEmpty ? null : conditions.join(' AND '),
      whereArgs: args,
      orderBy: 'created_at DESC',
      limit: limit,
    );
    final result = <Sale>[];
    for (final row in rows) {
      result.add(await _saleFromRow(row));
    }
    return result;
  }

  Future<int> pendingCount({String? cashierId, String? cashierName}) async {
    final conditions = <String>["status = 'pending'"];
    final args = <Object?>[];
    if (cashierId != null && cashierName != null) {
      conditions.add(_cashierClause(cashierId));
      args.addAll(_cashierArgs(cashierId, cashierName));
    }
    final rows = await db.rawQuery(
      'SELECT COUNT(*) AS count FROM sales WHERE ${conditions.join(' AND ')}',
      args,
    );
    return asInt(rows.first['count']);
  }

  Future<int> unresolvedCount({String? cashierId, String? cashierName}) async {
    final conditions = <String>["status IN ('pending', 'conflict')"];
    final args = <Object?>[];
    if (cashierId != null && cashierName != null) {
      conditions.add(_cashierClause(cashierId));
      args.addAll(_cashierArgs(cashierId, cashierName));
    }
    final rows = await db.rawQuery(
      'SELECT COUNT(*) AS count FROM sales WHERE ${conditions.join(' AND ')}',
      args,
    );
    return asInt(rows.first['count']);
  }

  Future<void> markSynced(String id) async => db.update('sales', {'status': 'synced', 'error': null}, where: 'uuid = ? AND status = ?', whereArgs: [id, 'pending']).then((_) {});
  Future<void> markConflict(String id, String reason) async => db.update('sales', {'status': 'conflict', 'error': reason}, where: 'uuid = ? AND status = ?', whereArgs: [id, 'pending']).then((_) {});
  Future<void> requeueSale(String id, {bool verified = false}) async {
    final values = <String, Object?>{'status': 'pending', 'error': null};
    if (verified) values['verified'] = 1;
    await db.update('sales', values, where: 'uuid = ? AND status = ?', whereArgs: [id, 'conflict']);
  }

  Future<void> applyCancellation(
    String id, {
    required String status,
    required String jenis,
    required String reason,
    required String actor,
    DateTime? at,
  }) async {
    await db.update('sales', {
      'status': 'synced',
      'error': null,
      'transaction_status': status,
      'jenis_pembatalan': jenis,
      'alasan_pembatalan': reason,
      'dibatalkan_oleh': actor,
      'dibatalkan_pada': (at ?? DateTime.now()).toIso8601String(),
    }, where: 'uuid = ?', whereArgs: [id]);
  }
  Future<String> exportSalesJson() async => jsonEncode((await sales(limit: 5000)).map((s) => {
    'client_uuid': s.uuid, 'created_at': s.createdAt.toIso8601String(), 'method': s.method,
    'status': s.status, 'total': s.total, 'lines': s.lines,
  }).toList());
}
