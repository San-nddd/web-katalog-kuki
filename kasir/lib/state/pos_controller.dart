import 'dart:async';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../core/models.dart';
import '../data/api_client.dart';
import '../data/local_db.dart';
import '../services/kuki_thermal_printer.dart';
import '../services/network_connectivity.dart';

class PosController extends ChangeNotifier {
  final FlutterSecureStorage _secure = const FlutterSecureStorage();
  final ApiClient api = ApiClient();
  LocalDb local = LocalDb();
  List<Product> products = [];
  List<OrderDraft> drafts = [];
  List<Sale> history = [];
  String activeDraftId = '';
  String cashierName = '';
  String cashierId = '';
  String role = '';
  String? activeShift;
  String? error;
  bool initializing = true;
  bool busy = false;
  bool syncing = false;
  bool demo = false;
  bool locked = false;
  int pending = 0;
  int unresolved = 0;
  List<ShiftSummary> shiftSummaries = [];
  int historyPage = 1;
  int historyLastPage = 1;
  int historyTotal = 0;
  int receiptWidth = 80;
  bool? networkConnected;
  bool? serverReachable;
  String? networkStatusError;
  Timer? _syncTimer;
  StreamSubscription<bool>? _connectivitySubscription;
  bool _disposed = false;
  bool _loggingOut = false;
  int _sessionRevision = 0;
  int _connectivityRevision = 0;

  @override
  void notifyListeners() {
    if (!_disposed) super.notifyListeners();
  }

  Future<void> retryLoadData() async {
    if (busy) return;
    busy = true;
    error = null;
    notifyListeners();
    try {
      if (!kIsWeb) await local.open();
      if (kIsWeb && authenticated) {
        final staff = await api.me();
        cashierName = asText(staff['nama']);
        cashierId = asText(staff['id']);
        role = asText(staff['role']);
        if (role.isEmpty) role = 'kasir';
        await _loadWebData();
        return;
      }
      await loadData();
    } catch (ex) {
      error = 'Database belum bisa dibaca: $ex';
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  bool get authenticated => demo || (api.token?.isNotEmpty ?? false);
  bool get databaseReady => local.isOpen;
  bool get shiftOpen => activeShift != null;
  OrderDraft get draft => drafts.firstWhere(
    (e) => e.id == activeDraftId,
    orElse: () => drafts.first,
  );
  String get modeLabel => demo ? 'DEMO — DATA SIMULASI' : 'LARAVEL API';
  bool get canCancel =>
      !demo && ['admin', 'owner'].contains(role.toLowerCase().trim());

  Future<void> init() async {
    try {
      if (!kIsWeb) await local.open();
      api.baseUrl = await _secure.read(key: 'base_url') ?? api.baseUrl;
      api.token = await _secure.read(key: 'token');
      cashierName = await _secure.read(key: 'cashier') ?? '';
      cashierId = await _secure.read(key: 'cashier_id') ?? '';
      role = await _secure.read(key: 'role') ?? '';
      receiptWidth = await _secure.read(key: 'receipt_width') == '58' ? 58 : 80;
      KukiThermalPrinter.instance.paperWidthMm = receiptWidth;
      locked = (await _secure.read(key: 'pin_hash')) != null && authenticated;
      if (authenticated) {
        if (kIsWeb) {
          final staff = await api.me();
          cashierName = asText(staff['nama']);
          cashierId = asText(staff['id']);
          await _loadWebData();
        } else {
          if (cashierId.isEmpty) {
            try {
              final staff = await api.me();
              cashierId = asText(staff['id']);
              role = asText(staff['role']);
              if (role.isEmpty) role = 'kasir';
              if (cashierId.isNotEmpty) {
                await _secure.write(key: 'cashier_id', value: cashierId);
              }
            } on ApiProblem {
              // Versi lama tetap dapat membuka database memakai nama kasir sebagai fallback.
            }
          }
          await loadData();
        }
        _startAutoSync();
      }
    } catch (ex) {
      error = 'Gagal menyiapkan aplikasi: $ex';
    } finally {
      initializing = false;
      notifyListeners();
    }
  }

  Future<void> _switchDatabase(String name) async {
    await local.close();
    local = LocalDb(fileName: name);
    await local.open();
  }

  Future<void> login(String baseUrl, String kode, String pin) async {
    busy = true;
    error = null;
    _sessionRevision++;
    _stopAutoSync();
    notifyListeners();
    try {
      if (!baseUrl.startsWith('https://') && !baseUrl.startsWith('http://')) {
        throw StateError('Alamat server harus diawali https:// atau http://');
      }
      api.baseUrl = baseUrl.trim();
      final session = await api.login(kode.trim(), pin);
      cashierName = session.name;
      cashierId = session.cashierId;
      role = session.role;
      demo = false;
      locked = false;
      await _secure.write(key: 'base_url', value: api.baseUrl);
      await _secure.write(key: 'token', value: session.token);
      await _secure.write(key: 'cashier', value: cashierName);
      await _secure.write(key: 'cashier_id', value: cashierId);
      await _secure.write(key: 'role', value: role);
      if (kIsWeb) {
        await _loadWebData();
      } else {
        await _switchDatabase('kuki_pos.db');
        await loadData();
        try {
          await refreshCatalog();
        } catch (e) {
          error = 'Login berhasil; katalog memakai cache: $e';
        }
      }
      _startAutoSync();
    } catch (ex) {
      error = ex.toString();
      // Jangan meninggalkan token tanpa login sukses.
      if (cashierName.isEmpty) api.token = null;
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> startDemo() async {
    if (kIsWeb) {
      throw StateError(
        'Mode DEMO belum tersedia di Chrome. Gunakan API Laravel.',
      );
    }
    busy = true;
    notifyListeners();
    try {
      _stopAutoSync();
      _sessionRevision++;
      demo = true;
      cashierName = 'Kasir Demo';
      cashierId = 'demo';
      role = 'kasir';
      locked = false;
      api.token = null;
      await _switchDatabase('kuki_pos_demo.db');
      if ((await local.products()).isEmpty) {
        await local.replaceCatalog(sampleProducts);
      }
      await loadData();
    } catch (ex) {
      demo = false;
      error = 'Gagal membuka DEMO: $ex';
      cashierName = '';
      cashierId = '';
      role = '';
      drafts = [];
      products = [];
      history = [];
      activeShift = null;
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  String? _logoutBlockedReason() {
    if (shiftOpen) {
      return 'Shift kasir masih terbuka. Tutup shift terlebih dahulu sebelum logout.';
    }
    if (syncing) {
      return 'Sinkronisasi sedang berlangsung. Tunggu hingga selesai sebelum logout.';
    }
    return null;
  }

  Future<void> _checkLocalLogoutReadiness() async {
    if (!databaseReady) return;
    final sales = await local.sales(
      limit: 5000,
      cashierId: cashierId,
      cashierName: cashierName,
    );
    history = sales;
    pending = await local.pendingCount(
      cashierId: cashierId,
      cashierName: cashierName,
    );
    unresolved = await local.unresolvedCount(
      cashierId: cashierId,
      cashierName: cashierName,
    );
    final unresolvedSales = sales
        .where((sale) =>
            sale.status == 'pending' || sale.status == 'conflict')
        .length;
    if (unresolvedSales > 0) {
      throw StateError(
        'Masih ada $unresolvedSales transaksi pending/conflict. '
        'Selesaikan dan sinkronkan transaksi sebelum logout.',
      );
    }

    final shifts = await local.shiftsForCashier(
      cashierId: cashierId,
      cashierName: cashierName,
    );
    for (final shift in shifts) {
      final localShiftId = asText(shift['id']);
      if (asText(shift['closed_at']).isEmpty) {
        throw StateError(
          'Shift lokal $localShiftId masih terbuka. Tutup shift terlebih dahulu.',
        );
      }
      final serverShiftId = asText(shift['server_shift_id']);
      if (serverShiftId.isNotEmpty &&
          asText(shift['server_closed_at']).isEmpty) {
        throw StateError(
          'Penutupan shift lokal $localShiftId belum terkonfirmasi di server. '
          'Sinkronkan ulang sebelum logout.',
        );
      }
    }
  }

  Future<void> _checkServerShiftClosed() async {
    final remote = await api.shift();
    final activeId = asText(unwrapMap(remote['active'])['id']);
    if (activeId.isNotEmpty) {
      throw StateError(
        'Server masih mencatat shift aktif ($activeId). '
        'Tutup shift di server terlebih dahulu sebelum logout.',
      );
    }
  }

  void _clearDemoSession() {
    _stopAutoSync();
    _sessionRevision++;
    api.token = null;
    demo = false;
    locked = false;
    cashierName = '';
    cashierId = '';
    role = '';
    products = [];
    drafts = [];
    history = [];
    activeShift = null;
    pending = 0;
    historyPage = 1;
    historyLastPage = 1;
    historyTotal = 0;
    error = null;
    notifyListeners();
  }

  Future<void> logout() async {
    if (_loggingOut) return;
    if (demo) {
      // DEMO tidak memakai Laravel. Database demo sengaja dibiarkan utuh.
      _clearDemoSession();
      return;
    }

    final blocked = _logoutBlockedReason();
    if (blocked != null) {
      error = blocked;
      notifyListeners();
      throw StateError(blocked);
    }

    _loggingOut = true;
    error = null;
    notifyListeners();
    try {
      if (!kIsWeb) {
        await syncPending();
        await _checkLocalLogoutReadiness();
      }
      await _checkServerShiftClosed();

      // Sesi server harus dicabut lebih dulu. Karena syncPending menangkap
      // exception-nya sendiri, status lokal dan server diperiksa ulang di atas.
      await api.logout();
      api.token = null;
      await _secure.delete(key: 'token');
      await _secure.delete(key: 'cashier');
      await _secure.delete(key: 'cashier_id');
      await _secure.delete(key: 'role');

      _stopAutoSync();
      _sessionRevision++;
      locked = false;
      cashierName = '';
      cashierId = '';
      role = '';
      products = [];
      drafts = [];
      history = [];
      activeShift = null;
      pending = 0;
      historyPage = 1;
      historyLastPage = 1;
      historyTotal = 0;
      demo = false;
      notifyListeners();
    } catch (ex) {
      error = 'Logout gagal: $ex';
      notifyListeners();
      rethrow;
    } finally {
      _loggingOut = false;
      notifyListeners();
    }
  }

  Future<void> loadData() async {
    if (kIsWeb) {
      await _loadWebData();
      return;
    }
    products = await local.products();
    drafts = await local.loadDrafts();
    if (drafts.isEmpty) {
      final first = OrderDraft(id: uuid.v4(), name: 'Pesanan 1');
      drafts.add(first);
      await local.saveDraft(first);
    }
    activeDraftId = drafts.first.id;
    final shift = await local.openShift(
      cashierId: cashierId,
      cashierName: cashierName,
    );
    activeShift = shift == null ? null : asText(shift['id']);
    history = await local.sales(
      limit: 5000,
      cashierId: cashierId,
      cashierName: cashierName,
    );
    pending = await local.pendingCount(
      cashierId: cashierId,
      cashierName: cashierName,
    );
    unresolved = await local.unresolvedCount(
      cashierId: cashierId,
      cashierName: cashierName,
    );
    await refreshShiftHistory();
    notifyListeners();
  }

  Future<void> _loadWebData() async {
    products = await api.catalog();
    if (drafts.isEmpty) {
      final first = OrderDraft(id: uuid.v4(), name: 'Pesanan 1');
      drafts = [first];
      activeDraftId = first.id;
    }
    final shift = await api.shift();
    activeShift = asText(unwrapMap(shift['active'])['id']);
    await refreshHistory();
    await refreshShiftHistory();
  }

  void _stopAutoSync() {
    _syncTimer?.cancel();
    _syncTimer = null;
    _connectivityRevision++;
    unawaited(_connectivitySubscription?.cancel());
    _connectivitySubscription = null;
    networkConnected = null;
    serverReachable = null;
  }

  void _startAutoSync() {
    _stopAutoSync();
    if (demo || kIsWeb || !authenticated) return;

    final connectivity = NetworkConnectivity();
    _connectivitySubscription = connectivity.changes.listen(
      _updateConnectivity,
      onError: (Object exception) {
        networkConnected = false;
        serverReachable = false;
        networkStatusError =
            'Status jaringan tidak dapat diperiksa: $exception';
        notifyListeners();
      },
    );
    unawaited(_checkConnectivity(connectivity, _connectivityRevision));
    _syncTimer = Timer.periodic(const Duration(seconds: 45), (_) async {
      if (networkConnected == true &&
          authenticated &&
          !busy &&
          !syncing &&
          !locked &&
          !_loggingOut) {
        await syncPending(automatic: true);
      }
    });
  }

  Future<void> _checkConnectivity(
    NetworkConnectivity connectivity,
    int revision,
  ) async {
    try {
      final connected = await connectivity.isConnected;
      if (!_disposed && revision == _connectivityRevision) {
        _setNetworkConnected(connected);
      }
    } catch (exception) {
      if (!_disposed && revision == _connectivityRevision) {
        networkConnected = false;
        serverReachable = false;
        networkStatusError =
            'Status jaringan tidak dapat diperiksa: $exception';
        notifyListeners();
      }
    }
  }

  void _updateConnectivity(bool connected) {
    _connectivityRevision++;
    _setNetworkConnected(connected);
  }

  void _setNetworkConnected(bool connected) {
    final wasConnected = networkConnected;
    networkConnected = connected;
    serverReachable = connected ? null : false;
    networkStatusError = null;
    if (connected && wasConnected != true && !_loggingOut) {
      unawaited(syncPending(automatic: true));
    }
    notifyListeners();
  }

  Future<void> refreshCatalog() async {
    if (demo) return;
    final remote = await api.catalog();
    if (kIsWeb) {
      products = remote;
    } else {
      await local.replaceCatalog(remote);
      products = await local.products();
    }
    notifyListeners();
  }

  Future<void> refreshHistory({int page = 1}) async {
    if (kIsWeb) {
      final result = await api.transactions(page: page);
      history = unwrapList(
        result['items'],
      ).map((item) => _saleFromApi(unwrapMap(item))).toList();
      historyPage = asInt(result['page']);
      historyLastPage = asInt(result['last_page']);
      historyTotal = asInt(result['total']);
      pending = 0;
      unresolved = 0;
      notifyListeners();
      return;
    }
    history = await local.sales(
      limit: 5000,
      cashierId: cashierId,
      cashierName: cashierName,
    );
    historyPage = 1;
    historyLastPage = 1;
    historyTotal = history.length;
    pending = await local.pendingCount(
      cashierId: cashierId,
      cashierName: cashierName,
    );
    unresolved = await local.unresolvedCount(
      cashierId: cashierId,
      cashierName: cashierName,
    );
    await refreshShiftHistory();
    notifyListeners();
  }

  Future<void> refreshShiftHistory() async {
    if (kIsWeb) {
      final remote = await api.shift();
      shiftSummaries = unwrapList(remote['history']).map((item) {
        final row = unwrapMap(item);
        return ShiftSummary(
          id: asText(row['id']),
          openedAt: asText(row['masuk_pada']),
          closedAt: asText(row['pulang_pada']),
          cashier: cashierName,
          openingCash: 0,
          closingCash: null,
          expectedCash: 0,
          note: '',
          serverOpened: true,
          serverClosed: asText(row['pulang_pada']).isNotEmpty,
        );
      }).toList();
      notifyListeners();
      return;
    }
    if (!databaseReady || demo) return;
    final shifts = await local.shiftsForCashier(
      cashierId: cashierId,
      cashierName: cashierName,
    );
    final summaries = <ShiftSummary>[];
    for (final shift in shifts) {
      final shiftId = asText(shift['id']);
      final rows = await local.sales(
        limit: 5000,
        shiftId: shiftId,
        cashierId: cashierId,
        cashierName: cashierName,
      );
      final cash = rows
          .where((sale) => sale.method == 'cash')
          .fold<int>(0, (sum, sale) => sum + sale.total);
      summaries.add(ShiftSummary(
        id: shiftId,
        openedAt: asText(shift['opened_at']),
        closedAt: asText(shift['closed_at']),
        cashier: asText(shift['cashier']),
        openingCash: asInt(shift['opening_cash']),
        closingCash: shift['closing_cash'] == null ? null : asInt(shift['closing_cash']),
        expectedCash: asInt(shift['opening_cash']) + cash,
        note: asText(shift['note']),
        serverOpened: asText(shift['server_shift_id']).isNotEmpty,
        serverClosed: asText(shift['server_closed_at']).isNotEmpty,
      ));
    }
    shiftSummaries = summaries;
    notifyListeners();
  }

  Future<void> retryConflict(String id, {bool verified = false}) async {
    if (!databaseReady) return;
    await local.requeueSale(id, verified: verified);
    await refreshHistory();
    if (!demo && authenticated) await syncPending();
  }

  Future<void> cancelSale(
    Sale sale, {
    required String jenis,
    required String alasan,
  }) async {
    if (!canCancel) {
      throw StateError('Hanya pegawai Admin/Owner yang dapat membatalkan transaksi.');
    }
    if (!['void', 'retur'].contains(jenis)) {
      throw StateError('Jenis pembatalan tidak dikenal.');
    }
    if (alasan.trim().length < 5) {
      throw StateError('Alasan pembatalan minimal 5 karakter.');
    }
    if (sale.transactionStatus != 'completed') {
      throw StateError('Transaksi ini sudah dibatalkan.');
    }
    if (sale.status != 'synced') {
      throw StateError('Transaksi harus tersinkron sebelum dibatalkan.');
    }
    busy = true;
    notifyListeners();
    try {
      final updated = await api.cancelSale(
        sale.uuid,
        jenis: jenis,
        alasan: alasan.trim(),
      );
      if (kIsWeb) {
        await refreshHistory();
        return;
      }
      final actor = asText(updated['dibatalkan_oleh']);
      await local.applyCancellation(
        sale.uuid,
        status: asText(updated['status_transaksi']).isEmpty
            ? (jenis == 'retur' ? 'retur' : 'void')
            : asText(updated['status_transaksi']),
        jenis: jenis,
        reason: alasan.trim(),
        actor: actor.isEmpty ? cashierName : actor,
        at: DateTime.tryParse(asText(updated['dibatalkan_pada'])),
      );
      await refreshHistory();
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Sale _saleFromApi(Map<String, dynamic> value) {
    final dateText = asText(value['dibayar_pada']);
    final createdAt = DateTime.tryParse(dateText);
    if (createdAt == null) {
      throw FormatException('Waktu transaksi dari API tidak valid: $dateText');
    }
    final lines = unwrapList(value['items']).map((item) {
      final line = unwrapMap(item);
      return <String, dynamic>{
        'name': asText(line['nama']),
        'quantity': asInt(line['jumlah']),
        'unit_price': asInt(line['harga']),
      };
    }).toList();
    final method = switch (asText(value['metode_bayar'])) {
      'tunai' => 'cash',
      'qris' => 'qris_manual',
      'transfer' => 'transfer',
      final other => other,
    };
    return Sale(
      uuid: asText(value['id_client']).isNotEmpty
          ? asText(value['id_client'])
          : asText(value['nomor']),
      createdAt: createdAt,
      cashier: asText(value['kasir']),
      shiftId: asText(value['shift_id']),
      method: method,
      status: 'synced',
      subtotal: asInt(value['subtotal']),
      discount: 0,
      total: asInt(value['total']),
      paid: asInt(value['dibayar']),
      note: asText(value['catatan']),
      lines: lines,
      transactionStatus: asText(value['status_transaksi']).isEmpty
          ? 'completed'
          : asText(value['status_transaksi']),
      voidedBy: asText(value['dibatalkan_oleh']).isEmpty
          ? null
          : asText(value['dibatalkan_oleh']),
      voidedAt: asText(value['dibatalkan_pada']).isEmpty
          ? null
          : DateTime.tryParse(asText(value['dibatalkan_pada'])),
      voidReason: asText(value['alasan_pembatalan']).isEmpty
          ? null
          : asText(value['alasan_pembatalan']),
    );
  }

  Future<String> _ensureServerShift(Map<String, Object?> localShift, {
    required bool hasPendingTransactions,
  }) async {
    final localShiftId = asText(localShift['id']);
    final savedServerId = asText(localShift['server_shift_id']);
    final localIsClosed = asText(localShift['closed_at']).isNotEmpty;
    final serverWasClosed = asText(localShift['server_closed_at']).isNotEmpty;

    if (serverWasClosed) return '';
    if (localIsClosed && savedServerId.isEmpty && !hasPendingTransactions) {
      return '';
    }

    final remote = await api.shift();
    final remoteActiveId = asText(unwrapMap(remote['active'])['id']);

    if (savedServerId.isNotEmpty) {
      if (remoteActiveId == savedServerId) return savedServerId;
      if (remoteActiveId.isEmpty && localIsClosed) {
        await local.markServerShiftClosed(localShiftId);
        return '';
      }
      throw const ApiProblem(
        409,
        'Status shift di server berbeda dengan shift lokal. Jangan lanjutkan sinkronisasi sebelum diperiksa.',
      );
    }

    if (remoteActiveId.isNotEmpty) {
      if (localIsClosed) {
        throw const ApiProblem(
          409,
          'Ada shift server aktif yang tidak cocok dengan shift lokal tertutup. Sinkronisasi dihentikan agar transaksi tidak masuk ke shift yang salah.',
        );
      }
      await local.setServerShiftId(localShiftId, remoteActiveId);
      return remoteActiveId;
    }

    if (localIsClosed && !hasPendingTransactions) return '';

    final created = await api.startShift();
    final newServerId = asText(created['id']);
    if (newServerId.isEmpty) {
      throw const ApiProblem(500, 'Laravel tidak mengembalikan ID shift.');
    }
    await local.setServerShiftId(localShiftId, newServerId);
    return newServerId;
  }

  Future<void> syncPending({bool automatic = false}) async {
    if (kIsWeb ||
        _disposed ||
        demo ||
        syncing ||
        !authenticated ||
        locked ||
        !databaseReady ||
        (automatic && networkConnected != true)) {
      return;
    }
    syncing = true;
    notifyListeners();
    final revision = _sessionRevision;
    final currentDb = local;
    try {
      if (cashierId.isEmpty) {
        final staff = await api.me();
        cashierId = asText(staff['id']);
        if (cashierId.isNotEmpty) {
          await _secure.write(key: 'cashier_id', value: cashierId);
        }
      }

      if (automatic) {
        final reachable = await api.isServerReachable();
        if (_disposed || revision != _sessionRevision) return;
        serverReachable = reachable;
        networkStatusError = reachable
            ? null
            : 'Server POS tidak dapat dijangkau; transaksi tetap tersimpan di perangkat.';
        notifyListeners();
        if (!reachable) return;
      }

      final shifts = await currentDb.shiftsForCashier(
        cashierId: cashierId,
        cashierName: cashierName,
      );
      var stopAfterCurrentShift = false;

      for (final localShift in shifts) {
        if (_disposed || revision != _sessionRevision || stopAfterCurrentShift) break;
        final localShiftId = asText(localShift['id']);
        final shiftSales = await currentDb.sales(
          limit: 1000,
          shiftId: localShiftId,
          cashierId: cashierId,
          cashierName: cashierName,
        );
        final queue = shiftSales.where((sale) => sale.status == 'pending').toList().reversed.toList();
        final localIsClosed = asText(localShift['closed_at']).isNotEmpty;
        final savedServerId = asText(localShift['server_shift_id']);
        final serverWasClosed = asText(localShift['server_closed_at']).isNotEmpty;

        // Shift lama yang sudah selesai disinkronkan tidak perlu disentuh lagi.
        if (localIsClosed && serverWasClosed && queue.isEmpty) continue;
        if (localIsClosed && savedServerId.isEmpty && queue.isEmpty) continue;

        final serverShiftId = await _ensureServerShift(
          localShift,
          hasPendingTransactions: queue.isNotEmpty,
        );
        if (queue.isNotEmpty && serverShiftId.isEmpty) {
          throw const ApiProblem(409, 'Shift server tidak tersedia untuk transaksi tertunda.');
        }

        var shiftSyncFailed = false;
        for (final sale in queue) {
          if (_disposed || revision != _sessionRevision) break;
          try {
            await api.sendSale(sale);
            if (_disposed || revision != _sessionRevision) break;
            await currentDb.markSynced(sale.uuid);
          } on ApiProblem catch (ex) {
            if (_disposed || revision != _sessionRevision) break;
            if (ex.status == 400 || ex.status == 409 || ex.status == 422) {
              await currentDb.markConflict(sale.uuid, ex.message);
              continue;
            }
            error = ex.status == 404
                ? 'Endpoint /api/pos/transaksi belum dapat diakses di Laravel.'
                : 'Sinkronisasi tertunda: ${ex.message}';
            shiftSyncFailed = true;
            stopAfterCurrentShift = true;
            break;
          }
        }

        if (shiftSyncFailed || _disposed || revision != _sessionRevision) continue;

        final latestShiftSales = await currentDb.sales(
          limit: 1000,
          shiftId: localShiftId,
          cashierId: cashierId,
          cashierName: cashierName,
        );
        final hasUnresolvedSales = latestShiftSales.any((sale) => sale.status != 'synced');
        if (localIsClosed && hasUnresolvedSales) {
          // Jangan mengaitkan shift lokal berikutnya ke shift server lama yang
          // masih terbuka akibat transaksi konflik.
          stopAfterCurrentShift = true;
          continue;
        }
        if (localIsClosed && !hasUnresolvedSales && serverShiftId.isNotEmpty) {
          await api.endShift();
          await currentDb.markServerShiftClosed(localShiftId);
        }
      }

      if (!_disposed && revision == _sessionRevision) {
        history = await currentDb.sales(
          limit: 5000,
          cashierId: cashierId,
          cashierName: cashierName,
        );
        pending = await currentDb.pendingCount(
          cashierId: cashierId,
          cashierName: cashierName,
        );
        unresolved = await currentDb.unresolvedCount(
          cashierId: cashierId,
          cashierName: cashierName,
        );
        await refreshShiftHistory();
      }
    } catch (ex) {
      // Data SQLite tetap utuh; sinkronisasi dapat diulang setelah koneksi pulih.
      if (!_disposed && revision == _sessionRevision) {
        error = 'Sinkronisasi tertunda (data lokal tetap disimpan): $ex';
      }
    } finally {
      syncing = false;
      notifyListeners();
    }
  }

  Future<void> addDraft() async {
    if (drafts.length >= 6) throw StateError('Maksimum 6 pesanan aktif');
    final value = OrderDraft(
      id: uuid.v4(),
      name: 'Pesanan ${drafts.length + 1}',
    );
    drafts.add(value);
    activeDraftId = value.id;
    if (!kIsWeb) await local.saveDraft(value);
    notifyListeners();
  }

  void selectDraft(String id) {
    activeDraftId = id;
    notifyListeners();
  }

  Future<void> removeDraft(String id) async {
    if (drafts.length <= 1) throw StateError('Harus ada minimal satu pesanan');
    drafts.removeWhere((e) => e.id == id);
    if (!kIsWeb) await local.deleteDraft(id);
    if (activeDraftId == id) activeDraftId = drafts.first.id;
    notifyListeners();
  }

  int _inDrafts(String productId) => drafts.fold(
    0,
    (sum, d) =>
        sum +
        d.lines
            .where((e) => e.product.id == productId)
            .fold(0, (s, e) => s + e.quantity),
  );
  Future<void> addProduct(Product p) async {
    if (!p.aktif) throw StateError('Produk ${p.name} sudah diarsipkan');
    if (p.stock <= _inDrafts(p.id)) {
      throw StateError('Stok ${p.name} tidak mencukupi');
    }
    final index = draft.lines.indexWhere((l) => l.product.id == p.id);
    if (index < 0) {
      draft.lines.add(CartLine(p));
    } else {
      draft.lines[index].quantity++;
    }
    if (!kIsWeb) await local.saveDraft(draft);
    notifyListeners();
  }

  Future<void> changeQuantity(String productId, int difference) async {
    final index = draft.lines.indexWhere((l) => l.product.id == productId);
    if (index < 0) return;
    final line = draft.lines[index];
    final latest = products.firstWhere(
      (p) => p.id == productId,
      orElse: () => line.product,
    );
    if (!latest.aktif) throw StateError('Produk ${latest.name} sudah diarsipkan');
    if (difference > 0 && latest.stock <= _inDrafts(productId)) {
      throw StateError('Stok tidak mencukupi');
    }
    line.quantity += difference;
    if (line.quantity <= 0) draft.lines.removeAt(index);
    if (!kIsWeb) await local.saveDraft(draft);
    notifyListeners();
  }

  Future<void> removeLine(String productId) async {
    draft.lines.removeWhere((line) => line.product.id == productId);
    if (!kIsWeb) await local.saveDraft(draft);
    notifyListeners();
  }

  Future<void> setDiscount(int value) async {
    if (kIsWeb && value != 0) {
      throw StateError('Diskon belum didukung oleh API POS.');
    }
    if (value < 0 || value > draft.subtotal) {
      throw StateError('Diskon tidak valid');
    }
    draft.discount = value;
    if (!kIsWeb) await local.saveDraft(draft);
    notifyListeners();
  }

  Future<void> renameDraft(String name) async {
    final cleaned = name.trim();
    if (cleaned.isEmpty) throw StateError('Nama pelanggan tidak boleh kosong');
    draft.name = cleaned;
    if (!kIsWeb) await local.saveDraft(draft);
    notifyListeners();
  }

  Future<void> setOrderType(String type) async {
    if (type != 'takeaway' && type != 'dine_in') return;
    draft.orderType = type;
    if (type == 'takeaway') draft.tableNumber = '';
    if (!kIsWeb) await local.saveDraft(draft);
    notifyListeners();
  }

  Future<void> setTableNumber(String number) async {
    draft.tableNumber = number.trim();
    if (!kIsWeb) await local.saveDraft(draft);
    notifyListeners();
  }

  Future<void> setNote(String text) async {
    draft.note = text;
    if (!kIsWeb) await local.saveDraft(draft);
    notifyListeners();
  }

  Future<Product?> findBarcode(String code) async {
    if (kIsWeb) {
      final value = code.trim().toLowerCase();
      for (final product in products) {
        if (product.barcode.toLowerCase() == value ||
            product.sku.toLowerCase() == value) {
          return product;
        }
      }
      return null;
    }
    return local.byBarcode(code);
  }

  Future<Sale> pay(String method, int paid, {bool verified = false}) async {
    if (activeShift == null) {
      throw StateError('Buka shift kasir terlebih dahulu');
    }
    if (method != 'cash' && !verified) {
      throw StateError('Verifikasi pembayaran manual sebelum melanjutkan.');
    }
    busy = true;
    notifyListeners();
    try {
      final order = draft;
      if (kIsWeb) {
        if (order.discount != 0) {
          throw StateError('Diskon belum didukung oleh API POS.');
        }
        final apiMethod = switch (method) {
          'cash' => 'tunai',
          'qris_manual' => 'qris',
          'transfer' => 'transfer',
          _ => throw StateError('Metode pembayaran tidak didukung API POS.'),
        };
        final result = await api.checkout(
          id: order.id,
          items: order.lines.map((line) {
            final id = int.tryParse(line.product.id);
            if (id == null) {
              throw StateError('ID produk tidak valid untuk API POS.');
            }
            return {'produk_id': id, 'jumlah': line.quantity};
          }).toList(),
          method: apiMethod,
          paid: paid,
          verified: apiMethod == 'tunai' || verified,
          orderType: order.orderType,
          table: order.tableNumber,
          customer: order.name,
          note: order.note,
        );
        final sale = _saleFromApi(result);
        drafts.removeWhere((item) => item.id == order.id);
        if (drafts.isEmpty) {
          final replacement = OrderDraft(id: uuid.v4(), name: 'Pesanan 1');
          drafts.add(replacement);
        }
        activeDraftId = drafts.first.id;
        try {
          await refreshCatalog();
          await refreshHistory(page: historyPage);
        } catch (ex) {
          error =
              'Transaksi tersimpan di server, tetapi data POS gagal diperbarui: $ex';
        }
        return sale;
      }
      if (!demo && order.discount != 0) {
        throw StateError('Diskon belum didukung oleh API POS.');
      }
      final sale = await local.checkout(
        draft: order,
        cashier: cashierName,
        cashierId: cashierId,
        shiftId: activeShift!,
        method: method,
        paid: paid,
        verified: method == 'cash' || verified,
      );
      drafts.removeWhere((d) => d.id == order.id);
      final replacement = OrderDraft(id: uuid.v4(), name: order.name);
      drafts.add(replacement);
      activeDraftId = replacement.id;
      await local.saveDraft(replacement);
      await refreshHistory();
      products = await local.products();
      // Tunggu dialog pembayaran menutup sebelum sinkronisasi.
      // Transaksi sudah tersimpan di SQLite; auto-sync rutin tetap tersedia.
      if (!demo && !_loggingOut) {
        unawaited(
          Future<void>.delayed(
            const Duration(seconds: 2),
            () => syncPending(automatic: true),
          ),
        );
      }
      return (await local.getSale(sale.uuid))!;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> openShift() async {
    if (activeShift != null) {
      throw StateError('Shift kasir ini masih aktif.');
    }
    if (kIsWeb) {
      final shift = await api.startShift();
      activeShift = asText(shift['id']);
      notifyListeners();
      return;
    }

    String? serverShiftId;
    if (!demo && authenticated) {
      // Selesaikan penutupan shift sebelumnya terlebih dahulu agar satu kasir
      // tidak memakai satu shift server untuk dua sesi lokal yang berbeda.
      if (networkConnected != false) await syncPending();
      final priorShifts = await local.shiftsForCashier(
        cashierId: cashierId,
        cashierName: cashierName,
      );
      final unresolvedClose = priorShifts.any((shift) =>
          asText(shift['closed_at']).isNotEmpty &&
          asText(shift['server_shift_id']).isNotEmpty &&
          asText(shift['server_closed_at']).isEmpty);
      if (unresolvedClose) {
        throw StateError(
          'Shift sebelumnya belum selesai disinkronkan ke server. Periksa koneksi lalu coba lagi.',
        );
      }
      try {
        final remote = await api.shift();
        serverShiftId = asText(unwrapMap(remote['active'])['id']);
        if (serverShiftId.isEmpty) {
          final created = await api.startShift();
          serverShiftId = asText(created['id']);
        }
      } on ApiProblem catch (ex) {
        // Shift lokal tetap bisa dibuka saat internet terputus; akan dibuat di server saat sync.
        if (ex.status != 0) rethrow;
      }
    }

    final id = uuid.v4();
    await local.startShift(
      id: id,
      cashier: cashierName,
      cashierId: cashierId,
      openingCash: 0,
      serverShiftId: serverShiftId,
    );
    activeShift = id;
    await refreshShiftHistory();
    notifyListeners();
  }

  Future<void> endShift(int closingCash, String note) async {
    if (activeShift == null) return;
    if (closingCash < 0) throw StateError('Uang akhir tidak valid');
    if (kIsWeb) {
      await api.endShift();
      activeShift = null;
      await refreshShiftHistory();
      notifyListeners();
      return;
    }

    final closingShiftId = activeShift!;
    // Coba kirim transaksi dulu. Jika offline, data tetap lokal dan penutupan server
    // akan dicoba kembali oleh syncPending setelah koneksi tersedia.
    if (!demo && authenticated && networkConnected != false) {
      await syncPending();
    }

    await local.closeShift(
      id: closingShiftId,
      cashierId: cashierId,
      cashierName: cashierName,
      closingCash: closingCash,
      note: note,
    );
    activeShift = null;
    await refreshShiftHistory();
    notifyListeners();

    if (!demo && authenticated && networkConnected != false) {
      await syncPending();
    }
  }

  Future<int> expectedCash() async {
    if (kIsWeb) return 0;
    final current = await local.openShift(
      cashierId: cashierId,
      cashierName: cashierName,
    );
    if (current == null) return 0;
    final sales = await local.sales(
      limit: 5000,
      shiftId: activeShift,
      cashierId: cashierId,
      cashierName: cashierName,
    );
    final cash = sales
        .where((sale) => sale.method == 'cash')
        .fold<int>(0, (sum, sale) => sum + sale.total);
    return asInt(current['opening_cash']) + cash;
  }

  Future<void> setReceiptWidth(int value) async {
    receiptWidth = value == 58 ? 58 : 80;
    KukiThermalPrinter.instance.paperWidthMm = receiptWidth;
    await _secure.write(key: 'receipt_width', value: '$receiptWidth');
    notifyListeners();
  }

  Future<bool> hasPin() async => (await _secure.read(key: 'pin_hash')) != null;
  String _digest(String salt, String pin) =>
      sha256.convert(utf8.encode('$salt:$pin')).toString();
  Future<void> setPin(String pin) async {
    if (!RegExp(r'^\d{4,6}$').hasMatch(pin)) {
      throw StateError('PIN harus 4–6 angka');
    }
    final salt = uuid.v4();
    await _secure.write(key: 'pin_hash', value: '$salt:${_digest(salt, pin)}');
    notifyListeners();
  }

  Future<bool> unlock(String pin) async {
    final saved = await _secure.read(key: 'pin_hash');
    if (saved == null) {
      locked = false;
      notifyListeners();
      return true;
    }
    final split = saved.split(':');
    final ok = split.length == 2 && _digest(split.first, pin) == split.last;
    if (ok) {
      locked = false;
      notifyListeners();
    }
    return ok;
  }

  Future<void> removePin() async {
    await _secure.delete(key: 'pin_hash');
    locked = false;
    notifyListeners();
  }

  Future<void> lock() async {
    if (await hasPin()) {
      locked = true;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _sessionRevision++;
    _stopAutoSync();
    // Penutupan database asynchronous; kesalahan teardown tidak boleh menjadi crash UI.
    unawaited(local.close().catchError((Object _) {}));
    super.dispose();
  }
}
