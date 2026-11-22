/** Pure helpers: card produk berasal dari getProduk(), bukan dari teks AI buatan. */
const PRODUCT_CUES = /\b(produk|menu|katalog|harga|berapa|stok|tersedia|varian|rasa|rekomendasi|rekomendasikan|pilihan|favorit|terlaris|best seller|kue|roti|cake|cookies?|brownies|tiramisu|sodok|saltbread|hadiah|cemilan|camilan|dessert|pesan produk)\b/i
const STRONG_PRODUCT_CUES = /\b(produk|menu|katalog|harga|stok|varian|rasa|rekomendasi|rekomendasikan|pilihan|kue|roti|cake|cookies?|tiramisu|sodok|saltbread|dessert)\b/i
const OTHER_CUES = /\b(lokasi|alamat|maps|peta|jalan ke|jam buka|jam operasional|kontak|nomor telepon|whatsapp|chat admin|bicara dengan admin)\b/i
const IGNORE_WORDS = new Set([
  'ada','apa','apaaja','apa','saja','yang','di','ke','dari','dan','atau','buat','untuk','saya','aku','kamu','kuki','bakehouse','tolong','dong','boleh','mau','ingin','coba','lihat','tunjukkan','tampilkan','produk','menu','katalog','harga','berapa','stok','tersedia','varian','rasa','rekomendasi','rekomendasikan','pilihan','favorit','terlaris','enak','paling','best','seller','nya','ini','itu','sedang','sekarang','hari','pilih','bisa','kasih','tentang','semua','serta','apakah','nih','ya','ga','nggak','ada','order','pesan','buatkan','daftar','list','berapa','harganya','produknya','menuju','sih','kak','dong','ingin','cari','mencari','butuh','direkomendasikan','beserta','harganya','apaaja','cocok','sebagai','untuk','ulang','tahun','acara','pelanggan','saya','kira','kira','kalau','berikut','kasih','daftar','beberapa','ide',
])

const clean = (value) => String(value ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const words = (value) => clean(value).split(/\s+/).filter(Boolean)

export function isProductQuestion(question, products = []) {
  const text = clean(question)
  if (!text) return false
  if (OTHER_CUES.test(text) && !STRONG_PRODUCT_CUES.test(text)) return false
  if (PRODUCT_CUES.test(text)) return true
  return products.some((product) => {
    const name = clean(product.nama ?? product.nama_produk)
    const category = clean(product.kategori)
    return (name.length >= 4 && text.includes(name)) || (category.length >= 4 && text.includes(category))
      || words(name).some((token) => token.length > 4 && words(text).includes(token))
  })
}

/**
 * Sort only known in-stock catalog entries. No claim of bestseller ranking.
 * If question specifies a product/category, return matched items only.
 */
export function selectProductsForChat(products, question, currentProduct = null, limit = 4) {
  const source = Array.isArray(products) ? products : []
  if (!isProductQuestion(question, source)) return []
  const available = source.filter((p) => p && p.id != null && Number(p.stok ?? 0) > 0)
  if (!available.length) return []

  const terms = words(question).filter((t) => t.length >= 3 && !IGNORE_WORDS.has(t))
  const currentId = currentProduct?.id == null ? null : String(currentProduct.id)
  const scored = available.map((p, index) => {
    const name = clean(p.nama ?? p.nama_produk)
    const category = clean(p.kategori ?? p.kategoriNama)
    const nameTokens = words(name)
    const categoryTokens = words(category)
    let score = 0
    for (const term of terms) {
      if (nameTokens.includes(term)) score += 8
      else if (name.includes(term)) score += 5
      if (categoryTokens.includes(term)) score += 5
      else if (category.includes(term)) score += 3
    }
    if (currentId && String(p.id) === currentId && terms.length === 0) score += 3
    return { p, score, index }
  })

  // A genuinely specific query should not surface unrelated products.
  const specific = terms.filter((t) => !['kue','roti','cake','cookie','cookies','dessert','cemilan','camilan','hadiah','enak'].includes(t))
  const matched = scored.filter((entry) => entry.score > 0)
  const chosen = matched.length ? matched : (specific.length ? [] : scored)
  return chosen.sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(1, Math.min(4, limit)))
    .map(({ p }) => p)
}

export const formatRupiah = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(Number(value ?? 0))
