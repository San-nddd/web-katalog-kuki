import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import KukiAssistant from '../components/KukiAssistant'
import { ArrowLeftIcon } from '../components/icons'
import { getProdukById } from '../services/produkService'
import { formatRupiah, products as mockProducts } from '../utils/mockData'
import './DetailProdukPage.css'

function mapMock(product) {
  return {
    id: product.id,
    nama: product.nama,
    deskripsi: product.deskripsi,
    harga: product.harga,
    gambar: product.gambar,
    kategori: product.kategori,
    stok: null,
    metadataAi: null,
    tersedia: null,
  }
}

function DetailProdukPage() {
  const { id } = useParams()
  // Status selalu diturunkan dari hasil muat terakhir agar tidak ada setState sinkron di effect.
  const [loaded, setLoaded] = useState({ key: null, status: 'ready', product: null })
  const [assistantOpen, setAssistantOpen] = useState(false)

  const key = String(id)
  const status = loaded.key === key ? loaded.status : 'loading'
  const product = loaded.key === key ? loaded.product : null

  useEffect(() => {
    let active = true

    getProdukById(id)
      .then((data) => {
        if (!active) return
        setLoaded({ key, status: 'ready', product: data })
      })
      .catch(() => {
        if (!active) return
        const mock = mockProducts.find((item) => String(item.id) === key)
        setLoaded(
          mock
            ? { key, status: 'ready', product: mapMock(mock) }
            : { key, status: 'missing', product: null },
        )
      })

    return () => {
      active = false
    }
  }, [id, key])

  return (
    <div className="detail-page">
      <Navbar />

      <section className="section section-dark detail-section">
        <div className="container">
          <Link to="/katalog" className="detail-back">
            <ArrowLeftIcon width="16" height="16" /> Kembali ke katalog
          </Link>

          {status === 'loading' && (
            <p className="detail-status" role="status">
              Memuat produk...
            </p>
          )}

          {status === 'missing' && (
            <div className="detail-status">
              <h1 className="display-font">Produk Tidak Ditemukan</h1>
              <p>Produk yang kamu cari tidak tersedia saat ini.</p>
              <Link to="/katalog" className="btn btn-primary">
                Lihat katalog
              </Link>
            </div>
          )}

          {status === 'ready' && product && (
            <div className="detail-grid">
              <div className="detail-media">
                {product.gambar ? (
                  <img src={product.gambar} alt={product.nama} />
                ) : (
                  <div className="detail-media-placeholder" role="img" aria-label={product.nama} />
                )}
                {product.kategori && <span className="detail-tag">{product.kategori}</span>}
              </div>

              <div className="detail-info">
                <h1 className="detail-title display-font">{product.nama}</h1>
                <p className="detail-price">{formatRupiah(product.harga)}</p>

                {product.tersedia !== null && (
                  <span className={`detail-stock ${product.tersedia ? 'available' : 'sold'}`}>
                    {product.tersedia ? 'Tersedia' : 'Tidak tersedia'}
                  </span>
                )}

                <p className="detail-desc">{product.deskripsi}</p>

                {product.metadataAi && (
                  <div className="detail-meta">
                    <h2 className="display-font">Bahan &amp; Info Tambahan</h2>
                    <p>{product.metadataAi}</p>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-primary detail-cta"
                  onClick={() => setAssistantOpen(true)}
                >
                  Tanya Kuki tentang produk ini
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <KukiAssistant product={product} open={assistantOpen} onOpenChange={setAssistantOpen} />

      <Footer />
    </div>
  )
}

export default DetailProdukPage
