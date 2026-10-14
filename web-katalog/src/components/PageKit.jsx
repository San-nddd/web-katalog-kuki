import { Link } from 'react-router-dom'
import { ArrowRightIcon } from './icons'
import { useInView } from '../hooks/useInView'

/* Elemen yang muncul (fade + naik/geser) saat di-scroll. delay dalam ms untuk efek bertahap */
export function Reveal({ children, variant = 'up', delay = 0, className = '' }) {
  const [ref, visible] = useInView(0.15)
  return (
    <div
      ref={ref}
      className={`reveal reveal-${variant} ${visible ? 'is-visible' : ''} ${className}`}
      style={{ '--d': `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/*
  Judul halaman/section: tiap baris naik dari balik masker.
  label (opsional) = stiker oranye miring; theme: 'cream' | 'dark' | 'orange'
*/
export function SectionTitle({ label, lines, theme = 'cream' }) {
  const [ref, visible] = useInView(0.5)
  return (
    <header
      ref={ref}
      className={`section-title section-title-${theme} ${visible ? 'is-visible' : ''}`}
    >
      <div className="section-title-inner">
        <h2 className="section-title-text display-font">
          {lines.map((line, i) => (
            <span className="title-mask" key={line}>
              <span className="title-line" style={{ '--i': i }}>
                {line}
              </span>
            </span>
          ))}
        </h2>
        {label && (
          <span className="title-sticker display-font" aria-hidden="true">
            {label}
          </span>
        )}
      </div>
    </header>
  )
}

/* Teks tombol yang bergulir ke atas saat hover */
export function Roll({ text }) {
  return (
    <span className="roll">
      <span className="roll-in" data-text={text}>
        {text}
      </span>
    </span>
  )
}

export function CategoryTile({ category }) {
  const image = category.image || category.gambar || category.img
  return (
    <Link
      to={`/katalog?kategori=${encodeURIComponent(category.name)}`}
      className="category-tile"
    >
      <span className="category-img">
        {image ? <img src={image} alt="" /> : <span className="category-img-ph"></span>}
      </span>
      <span className="category-label display-font">{category.name}</span>
    </Link>
  )
}

export function BlogTile({ post }) {
  const image = post.image || post.gambar || post.img
  const title = post.title || post.judul || post.nama
  return (
    <article className="blog-tile">
      <div className="blog-tile-photo">
        {image ? <img src={image} alt="" /> : <span className="blog-tile-ph"></span>}
      </div>
      <div className="blog-tile-body">
        <h3 className="blog-tile-title">{title}</h3>
        <a href={post.url || '#blog'} className="btn btn-primary blog-tile-btn">
          <Roll text="View Details" /> <ArrowRightIcon />
        </a>
      </div>
    </article>
  )
}
