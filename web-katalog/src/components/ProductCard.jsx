import { Link } from 'react-router-dom'
import { formatRupiah } from '../utils/mockData'
import { ArrowRightIcon } from './icons'
import './ProductCard.css'

function ProductCard({ product }) {
  return (
    <Link to={`/produk/${product.id}`} className="product-card-link">
      <article className="product-card">
        <div className="product-image">
          {product.gambar ? (
            <img src={product.gambar} alt={product.nama} loading="lazy" />
          ) : (
            <div className="product-image-placeholder" role="img" aria-label={product.nama}></div>
          )}
          <span className="product-tag">{product.kategori}</span>
        </div>
        <div className="product-content">
          <h3 className="product-name">{product.nama}</h3>
          <p className="product-description">{product.deskripsi}</p>
          <div className="product-footer">
            <span className="product-price">{formatRupiah(product.harga)}</span>
            <span className="product-action" aria-hidden="true">
              <ArrowRightIcon width="16" height="16" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}

export default ProductCard
