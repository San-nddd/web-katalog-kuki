import assert from 'node:assert/strict'
import {
  buildProductCardRows,
  selectProductsForChat,
  isProductQuestion,
  formatRupiah,
} from '../src/components/chatProductMatcher.mjs'

const products = [
  { id: 1, nama: 'Tiramisu Sodok Matcha', kategori: 'Tiramisu', stok: 4, harga: 23000 },
  { id: 2, nama: 'Tiramisu Sodok Original', kategori: 'Tiramisu', stok: 0, harga: 21000 },
  { id: 3, nama: 'Saltbread OG', kategori: 'Saltbread', stok: 7, harga: 18000 },
  { id: 4, nama: 'Cookies Coklat', kategori: 'Cookies', stok: 5, harga: 20000 },
  { id: 5, nama: 'Saltbread Coklat', kategori: 'Saltbread', stok: 4, harga: 20000 },
]

const cases = [
  ['Ada tiramisu apa saja?', [1]],
  ['Tampilkan pilihan produk Kuki Bakehouse yang tersedia.', [1, 3, 4, 5]],
  ['Apa saja pilihan produk Kuki Bakehouse beserta harganya?', [1, 3, 4, 5]],
  ['Di mana lokasi Kuki Bakehouse?', []],
  ['Di mana lokasi toko roti?', []],
  ['Alamat toko tiramisu di mana?', []],
  ['Boleh rekomendasikan produk Kuki Bakehouse yang tersedia?', [1, 3, 4, 5]],
  ['Ada croissant?', []],
  ['Harga saltbread berapa?', [3, 5]],
  ['Saya mau ide hadiah ulang tahun, ada produk?', [1, 3, 4, 5]],
]
for (const [question, expectedIds] of cases) {
  const actualIds = selectProductsForChat(products, question).map((product) => product.id)
  assert.deepEqual(actualIds, expectedIds, question)
}
assert.equal(isProductQuestion('Jam buka toko jam berapa?', products), false)
assert.equal(isProductQuestion('Di mana lokasi toko roti?', products), false)
assert.equal(isProductQuestion('Rekomendasi roti di dekat toko?', products), true)
assert.equal(selectProductsForChat(products, 'Rekomendasi tiramisu', products[2])[0].id, 1)
assert.deepEqual(
  selectProductsForChat(products, 'Harga saltbread', products[0]).map((product) => product.id),
  [3, 5],
)
assert.deepEqual(
  selectProductsForChat(products, 'Berapa harga Saltbread OG?').map((product) => product.id),
  [3],
)
assert.equal(formatRupiah(23000).includes('23.000'), true)
assert.deepEqual(selectProductsForChat([], 'Produk yang tersedia?'), [])

const replyRows = buildProductCardRows(
  [
    { sender: 'user', text: 'Harga saltbread berapa?' },
    { sender: 'user', text: 'Ada tiramisu?' },
    { sender: 'bot', text: 'Balasan pertama' },
    { sender: 'bot', text: 'Balasan kedua' },
  ],
  products,
)
assert.deepEqual(replyRows[2].cardProducts.map((product) => product.id), [3, 5])
assert.deepEqual(replyRows[3].cardProducts.map((product) => product.id), [1])
assert.deepEqual(
  buildProductCardRows(
    [
      { sender: 'user', text: 'Ada tiramisu?' },
      { sender: 'admin', text: 'Admin membalas' },
      { sender: 'bot', text: 'Balasan lama' },
    ],
    products,
  )[2].cardProducts,
  [],
)
console.log('PASS: product intent, reply association, stock filtering, and formatting checks')
