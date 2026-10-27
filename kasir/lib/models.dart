import 'package:intl/intl.dart';

String rupiah(num n) => NumberFormat.currency(locale: 'id_ID', symbol: 'Rp', decimalDigits: 0).format(n);

Map<String, dynamic> asMap(dynamic raw) => raw is Map ? Map<String, dynamic>.from(raw) : {};
int asInt(dynamic n) => n is num ? n.toInt() : int.tryParse('$n') ?? 0;

class PosProduct {
  final int id, price, stock;
  final String name, category, barcode;
  final String? image;
  const PosProduct({required this.id, required this.price, required this.stock, required this.name,
    required this.category, required this.barcode, this.image});
  factory PosProduct.fromJson(dynamic value) {
    final json = asMap(value);
    return PosProduct(id: asInt(json['id']), price: asInt(json['harga']), stock: asInt(json['stok']),
      name: '${json['nama'] ?? '-'}', category: '${json['kategori'] ?? 'Lainnya'}',
      barcode: '${json['barcode'] ?? ''}', image: json['gambar']?.toString());
  }
}

class PosLine {
  final PosProduct product;
  int qty;
  PosLine(this.product, [this.qty = 1]);
  int get total => product.price * qty;
}

class LocalOrder {
  final String draftId;
  final String clientId;
  String name = '', notes = '', type = 'takeaway', table = '';
  final Map<int, PosLine> lines = {};
  LocalOrder(this.draftId, this.clientId);
  int get total => lines.values.fold(0, (sum, item) => sum + item.total);
  int get count => lines.values.fold(0, (sum, item) => sum + item.qty);
  void add(PosProduct product) {
    if (product.stock <= 0) return;
    final item = lines[product.id];
    if (item == null) {
      lines[product.id] = PosLine(product);
    } else if (item.qty < product.stock) {
      item.qty++;
    }
  }
  void remove(PosProduct product) {
    final item = lines[product.id];
    if (item == null) return;
    if (item.qty <= 1) { lines.remove(product.id); } else { item.qty--; }
  }
  List<Map<String, dynamic>> get payload => lines.values.map((e) => {
    'produk_id': e.product.id, 'jumlah': e.qty,
  }).toList();
}

class PosReceipt {
  final Map<String, dynamic> value;
  PosReceipt(dynamic raw): value = asMap(raw);
  String get number => '${value['nomor'] ?? '-'}';
  String get cashier => '${value['kasir'] ?? '-'}';
  String get customer => '${value['nama_pelanggan'] ?? '-'}';
  String get date => '${value['dibayar_pada'] ?? '-'}';
  String get method => '${value['metode_bayar'] ?? '-'}';
  int get total => asInt(value['total']);
  int get paid => asInt(value['dibayar']);
  int get change => asInt(value['kembalian']);
  List<Map<String, dynamic>> get items => (value['items'] as List? ?? [])
      .map((v) => asMap(v)).toList();
}
