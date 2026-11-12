import { Link } from 'react-router-dom'
import { ImageOff, ArrowUpRight } from 'lucide-react'
import { formatRupiah } from './chatProductMatcher.mjs'

export default function KukiChatProductCards({ products = [] }) {
  if (!products.length) return null

  return (
    <section className="kuki-product-results" aria-label="Produk Kuki Bakehouse dari katalog">
      <div className="kuki-results-title">
        <strong>Pilihan dari katalog Kuki</strong>
        <span className="kuki-results-count">{products.length} menu</span>
      </div>
      <div className="kuki-product-scroll" role="list">
        {products.map((product) => (
          <article className="kuki-product-card" key={product.id} role="listitem">
            <div className="kuki-product-photo">
              {product.gambar ? (
                <img src={product.gambar} alt={product.nama ?? product.nama_produk} loading="lazy" />
              ) : (
                <span className="kuki-product-photo-fallback" role="img" aria-label="Gambar belum tersedia"><ImageOff size={27} strokeWidth={1.6} aria-hidden="true" /></span>
              )}
              <span className="kuki-product-stock">Tersedia</span>
            </div>
            <div className="kuki-product-info">
              {product.kategori && <span className="kuki-product-category">{product.kategori}</span>}
              <strong title={product.nama ?? product.nama_produk}>{product.nama ?? product.nama_produk}</strong>
              <span className="kuki-product-price">{formatRupiah(product.harga ?? product.harga_produk)}</span>
              <Link to={`/produk/${encodeURIComponent(String(product.id))}`} className="kuki-product-link">
                Lihat detail <ArrowUpRight size={15} strokeWidth={1.8} aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
