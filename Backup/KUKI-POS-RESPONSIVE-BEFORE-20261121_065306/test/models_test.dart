import 'package:flutter_test/flutter_test.dart';
import 'package:kuki_pos/core/models.dart';

void main() {
  test('Perhitungan keranjang dan diskon tetap dalam rupiah integer', () {
    final p = sampleProducts.first;
    final order = OrderDraft(id: 'test', name: 'Pesanan Test', lines: [CartLine(p, 2)], discount: 3000);
    expect(order.subtotal, p.price * 2);
    expect(order.total, p.price * 2 - 3000);
    expect(order.itemCount, 2);
  });
  test('Draft multi-order dapat di-serialize', () {
    final source = OrderDraft(id: '1', name: 'Pesanan 1', lines: [CartLine(sampleProducts.first)]);
    final loaded = OrderDraft.parse(source.serialize());
    expect(loaded.lines.single.product.sku, 'SAL-OG');
    expect(loaded.lines.single.quantity, 1);
  });
  test('API katalog Laravel dipetakan menjadi satu produk per rasa/ukuran', () {
    final result = Product.fromApi({'id': 123, 'nama_produk': 'Saltbread OG', 'kategori_id': 5,
      'kategori': {'nama': 'Saltbread'}, 'harga_produk': 14000, 'stok': 10, 'barcode': '89900000'});
    expect(result.id, '123');
    expect(result.categoryName, 'Saltbread');
    expect(result.price, 14000);
  });
  test('API POS memetakan kategori dan gambar dari respons katalog Laravel', () {
    final result = Product.fromApi({
      'id': 123,
      'nama': 'Saltbread OG',
      'kategori': 'Saltbread',
      'harga': 14000,
      'stok': 10,
      'barcode': '89900000',
      'gambar': 'https://example.test/saltbread.jpg',
    });
    expect(result.categoryName, 'Saltbread');
    expect(result.imageUrl, 'https://example.test/saltbread.jpg');
  });
}
