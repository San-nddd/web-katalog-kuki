import 'dart:convert';
import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';

final _rupiah = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
String money(int amount) => _rupiah.format(amount);
const uuid = Uuid();

int asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.round();
  return int.tryParse(value?.toString().replaceAll('.00', '') ?? '') ?? 0;
}

String asText(dynamic value) => value?.toString() ?? '';

Map<String, dynamic> unwrapMap(dynamic value) => value is Map ? Map<String, dynamic>.from(value) : {};
List<dynamic> unwrapList(dynamic value) {
  if (value is List) return value;
  if (value is Map) {
    for (final key in ['data', 'products', 'produk', 'categories', 'kategori', 'items']) {
      final nested = value[key];
      if (nested is List) return nested;
      if (nested is Map && nested['data'] is List) return nested['data'] as List;
    }
  }
  return [];
}

class Product {
  final String id;
  final String name;
  final String categoryId;
  final String categoryName;
  final String sku;
  final String barcode;
  final String? imageUrl;
  final int price;
  final int stock;
  final int minimumStock;
  const Product({required this.id, required this.name, required this.categoryId,
    required this.categoryName, required this.sku, required this.barcode,
    this.imageUrl, required this.price, required this.stock, this.minimumStock = 0});
  Product withStock(int stock) => Product(id: id, name: name, categoryId: categoryId,
    categoryName: categoryName, sku: sku, barcode: barcode, imageUrl: imageUrl,
    price: price, stock: stock, minimumStock: minimumStock);
  factory Product.fromApi(Map<String, dynamic> json) {
    final category = unwrapMap(json['kategori']);
    return Product(
      id: asText(json['id']),
      name: asText(json['nama_produk'] ?? json['nama'] ?? json['name']),
      categoryId: asText(json['kategori_id'] ?? json['category_id'] ?? category['id']),
      categoryName: asText(json['nama_kategori'] ?? json['category_name'] ?? category['nama'] ?? 'Lainnya'),
      sku: asText(json['sku']),
      barcode: asText(json['barcode']),
      imageUrl: (json['gambar_url'] ?? json['gambar_produk_url'] ?? json['image_url'])?.toString(),
      price: asInt(json['harga_produk'] ?? json['harga'] ?? json['price']),
      stock: asInt(json['stok'] ?? json['stock']),
      minimumStock: asInt(json['stok_minimum'] ?? json['minimum_stock']),
    );
  }
  Map<String, Object?> toDb() => {
    'id': id, 'name': name, 'category_id': categoryId, 'category_name': categoryName,
    'sku': sku, 'barcode': barcode, 'image_url': imageUrl,
    'price': price, 'stock': stock, 'minimum_stock': minimumStock,
  };
  factory Product.fromDb(Map<String, Object?> r) => Product(
    id: asText(r['id']), name: asText(r['name']),
    categoryId: asText(r['category_id']), categoryName: asText(r['category_name']),
    sku: asText(r['sku']), barcode: asText(r['barcode']),
    imageUrl: r['image_url']?.toString(), price: asInt(r['price']),
    stock: asInt(r['stock']), minimumStock: asInt(r['minimum_stock']),
  );
}

class CartLine {
  final Product product;
  int quantity;
  CartLine(this.product, [this.quantity = 1]);
  int get total => quantity * product.price;
  Map<String, dynamic> toJson() => {'product': product.toDb(), 'quantity': quantity};
  factory CartLine.fromJson(Map<String, dynamic> json) => CartLine(
    Product.fromDb(Map<String, Object?>.from(unwrapMap(json['product']))),
    asInt(json['quantity']),
  );
}

class OrderDraft {
  final String id;
  String name;
  final List<CartLine> lines;
  int discount;
  String note;
  String orderType;
  String tableNumber;
  OrderDraft({required this.id, required this.name, List<CartLine>? lines,
    this.discount = 0, this.note = '', this.orderType = 'takeaway', this.tableNumber = ''})
    : lines = lines ?? [];
  int get subtotal => lines.fold(0, (sum, item) => sum + item.total);
  int get total => (subtotal - discount).clamp(0, subtotal).toInt();
  int get itemCount => lines.fold(0, (sum, item) => sum + item.quantity);
  String serialize() => jsonEncode({
    'id': id, 'name': name, 'lines': lines.map((e) => e.toJson()).toList(),
    'discount': discount, 'note': note, 'order_type': orderType, 'table_number': tableNumber,
  });
  factory OrderDraft.parse(String value) {
    final json = unwrapMap(jsonDecode(value));
    return OrderDraft(
      id: asText(json['id']), name: asText(json['name']),
      discount: asInt(json['discount']), note: asText(json['note']),
      orderType: asText(json['order_type']).isEmpty ? 'takeaway' : asText(json['order_type']),
      tableNumber: asText(json['table_number']),
      lines: unwrapList(json['lines']).map((e) => CartLine.fromJson(unwrapMap(e))).toList(),
    );
  }
}

class Sale {
  final String uuid;
  final DateTime createdAt;
  final String cashier;
  final String shiftId;
  final String method;
  final String status;
  final int subtotal;
  final int discount;
  final int total;
  final int paid;
  final String note;
  final String? error;
  final List<Map<String, dynamic>> lines;
  const Sale({required this.uuid, required this.createdAt, required this.cashier,
    required this.shiftId, required this.method, required this.status,
    required this.subtotal, required this.discount, required this.total,
    required this.paid, required this.note, required this.lines, this.error});
  int get change => method == 'cash' ? paid - total : 0;
}

const sampleProducts = <Product>[
  Product(id: 'demo-101', name: 'Saltbread OG', categoryId: 'sal', categoryName: 'Saltbread', sku: 'SAL-OG', barcode: '899000000001', price: 14000, stock: 45, minimumStock: 8),
  Product(id: 'demo-102', name: 'Saltbread Cheese', categoryId: 'sal', categoryName: 'Saltbread', sku: 'SAL-CH', barcode: '899000000002', price: 18000, stock: 26, minimumStock: 8),
  Product(id: 'demo-103', name: 'Saltbread Choco', categoryId: 'sal', categoryName: 'Saltbread', sku: 'SAL-CO', barcode: '899000000003', price: 18000, stock: 20, minimumStock: 8),
  Product(id: 'demo-104', name: 'Tiramisu Original', categoryId: 'tir', categoryName: 'Tiramisu Sodok', sku: 'TIR-OG', barcode: '899000000004', price: 28000, stock: 18, minimumStock: 5),
  Product(id: 'demo-105', name: 'Tiramisu Matcha', categoryId: 'tir', categoryName: 'Tiramisu Sodok', sku: 'TIR-MA', barcode: '899000000005', price: 32000, stock: 14, minimumStock: 5),
  Product(id: 'demo-106', name: 'Tiramisu Cookies', categoryId: 'tir', categoryName: 'Tiramisu Sodok', sku: 'TIR-CO', barcode: '899000000006', price: 32000, stock: 9, minimumStock: 5),
  Product(id: 'demo-107', name: 'Butter Croissant', categoryId: 'pas', categoryName: 'Pastry', sku: 'PAS-BU', barcode: '899000000007', price: 22000, stock: 21, minimumStock: 6),
  Product(id: 'demo-108', name: 'Almond Croissant', categoryId: 'pas', categoryName: 'Pastry', sku: 'PAS-AL', barcode: '899000000008', price: 27000, stock: 17, minimumStock: 6),
  Product(id: 'demo-109', name: 'Chocolate Cookie', categoryId: 'coo', categoryName: 'Cookies', sku: 'COO-CH', barcode: '899000000009', price: 13000, stock: 35, minimumStock: 8),
];
