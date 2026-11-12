import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import { getProduk } from '../services/produkService'
import '../styles/kukiExperience.css'

const formatRupiah = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(Number(value) || 0)

export default function KukiRecommendedProducts({ currentProduct = null, maxItems = 8, title = 'Pilihan lain dari Kuki' }) {
  const [products, setProducts] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    getProduk()
      .then((items) => { if (alive) setProducts(Array.isArray(items) ? items : []) })
      .catch(() => { if (alive) setError('Rekomendasi belum dapat dimuat.') })
    return () => { alive = false }
  }, [])

  const recommendations = useMemo(() => {
    const currentId = currentProduct?.id
    const currentCategory = currentProduct?.kategoriId
    return products
      .filter((item) => String(item.id) !== String(currentId ?? ''))
      .filter((item) => item.tersedia !== false)
      .sort((a, b) => Number(Boolean(currentCategory && b.kategoriId === currentCategory)) - Number(Boolean(currentCategory && a.kategoriId === currentCategory)))
      .slice(0, Math.max(0, Math.min(20, maxItems)))
  }, [currentProduct, maxItems, products])

  if (error || recommendations.length === 0) return null

  return (
    <section className="kuki-experience-recs" aria-label="Rekomendasi produk dari katalog">
      <div className="kuki-experience-recs-head">
        <h3>{title}</h3>
        <span>Produk asli dari katalog</span>
      </div>
      <Swiper spaceBetween={12} slidesPerView={1.35} breakpoints={{ 420: { slidesPerView: 2 }, 760: { slidesPerView: 3 } }}>
        {recommendations.map((item) => (
          <SwiperSlide key={item.id}>
            <Link className="kuki-experience-product" to={`/produk/${encodeURIComponent(item.id)}`}>
              {item.gambar && <img src={item.gambar} alt={item.nama || 'Produk Kuki'} loading="lazy" />}
              <strong>{item.nama}</strong>
              <span>{formatRupiah(item.harga)}</span>
              <small>Lihat detail</small>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  )
}
