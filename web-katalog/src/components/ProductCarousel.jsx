import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon, ArrowRightIcon } from './icons'
import { formatRupiah } from '../utils/mockData'
import './ProductCarousel.css'

const RESUME_DELAY = 1500

function ProductCarousel({
  products = [],
  title = 'Produk Unggulan',
  subtitle,
  showNav = true,
  autoPlay = false,
  autoPlayInterval = 4000,
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [translateX, setTranslateX] = useState(0)
  const [shake, setShake] = useState(false)
  const [isInteracting, setIsInteracting] = useState(false)
  const [itemsPerView, setItemsPerView] = useState(4)
  const [jumping, setJumping] = useState(false)

  const trackRef = useRef(null)
  const itemWidthRef = useRef(0)
  const currentIndexRef = useRef(0)
  const resumeTimeoutRef = useRef(null)
  const loopTimeoutRef = useRef(null)

  const duplicatedProducts = products.length > 0
    ? [
        ...products.slice(-itemsPerView),
        ...products,
        ...products.slice(0, itemsPerView),
      ]
    : []

  const baseIndex = itemsPerView

  const setIndexAndTranslate = useCallback((index, animate = true) => {
    if (animate) {
      setShake(true)
      window.setTimeout(() => setShake(false), 300)
    }

    currentIndexRef.current = index
    setCurrentIndex(index)
    setTranslateX(-index * itemWidthRef.current)
  }, [])

  const jumpTo = useCallback((index) => {
    setJumping(true)
    currentIndexRef.current = index
    setCurrentIndex(index)
    setTranslateX(-index * itemWidthRef.current)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setJumping(false))
    })
  }, [])

  const measureAndSync = useCallback(() => {
    const track = trackRef.current
    if (!track || track.children.length === 0) return

    const firstChild = track.children[0]
    const style = window.getComputedStyle(track)
    const gap = Number.parseFloat(style.columnGap || style.gap || '0') || 0
    const width = firstChild.getBoundingClientRect().width

    if (!width) return

    itemWidthRef.current = width + gap
    setTranslateX(-currentIndexRef.current * itemWidthRef.current)
  }, [])

  useEffect(() => {
    const updateItemsPerView = () => {
      const width = window.innerWidth

      if (width >= 1200) setItemsPerView(4)
      else if (width >= 900) setItemsPerView(3)
      else if (width >= 600) setItemsPerView(2)
      else setItemsPerView(1)
    }

    updateItemsPerView()
    window.addEventListener('resize', updateItemsPerView)

    return () => window.removeEventListener('resize', updateItemsPerView)
  }, [])

  // Penting: produk dari API datang setelah render pertama.
  // Karena itu ukuran kartu diukur lagi setiap products/itemsPerView berubah.
  useEffect(() => {
    if (!products.length) return undefined

    const frame = requestAnimationFrame(() => {
      measureAndSync()
      jumpTo(baseIndex)
    })

    const track = trackRef.current
    const observer =
      track && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => measureAndSync())
        : null

    if (track && observer) observer.observe(track)

    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [products.length, itemsPerView, baseIndex, measureAndSync, jumpTo])

  const stepNext = useCallback((withShake = false) => {
    if (!products.length || itemWidthRef.current <= 0) return

    const nextIndex = currentIndexRef.current + 1
    setIndexAndTranslate(nextIndex, withShake)

    if (loopTimeoutRef.current) {
      clearTimeout(loopTimeoutRef.current)
    }

    if (nextIndex >= baseIndex + products.length) {
      loopTimeoutRef.current = window.setTimeout(() => {
        jumpTo(baseIndex)
      }, 430)
    }
  }, [products.length, baseIndex, setIndexAndTranslate, jumpTo])

  const stepPrev = useCallback((withShake = true) => {
    if (!products.length || itemWidthRef.current <= 0) return

    const prevIndex = currentIndexRef.current - 1
    setIndexAndTranslate(prevIndex, withShake)

    if (loopTimeoutRef.current) {
      clearTimeout(loopTimeoutRef.current)
    }

    if (prevIndex < baseIndex) {
      loopTimeoutRef.current = window.setTimeout(() => {
        jumpTo(baseIndex + products.length - 1)
      }, 430)
    }
  }, [products.length, baseIndex, setIndexAndTranslate, jumpTo])

  const pauseAutoPlay = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current)
    }

    setIsInteracting(true)
  }, [])

  const scheduleResumeAutoPlay = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current)
    }

    resumeTimeoutRef.current = window.setTimeout(() => {
      setIsInteracting(false)
    }, RESUME_DELAY)
  }, [])

  const handleDragStart = useCallback((event) => {
    if (event.type === 'mousedown' && event.button !== 0) return

    const clientX =
      event.type === 'mousedown'
        ? event.clientX
        : event.touches?.[0]?.clientX

    if (clientX == null) return

    setIsDragging(true)
    setDragStartX(clientX)
    pauseAutoPlay()
  }, [pauseAutoPlay])

  const handleDragMove = useCallback((event) => {
    if (!isDragging) return

    const clientX =
      event.type === 'mousemove'
        ? event.clientX
        : event.touches?.[0]?.clientX

    if (clientX == null) return

    const deltaX = clientX - dragStartX
    const currentTranslate = -currentIndexRef.current * itemWidthRef.current

    setTranslateX(currentTranslate + deltaX)
  }, [isDragging, dragStartX])

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return

    setIsDragging(false)

    const baseTranslate = -currentIndexRef.current * itemWidthRef.current
    const dragDistance = translateX - baseTranslate
    const threshold = itemWidthRef.current * 0.15

    if (dragDistance < -threshold) {
      stepNext(true)
    } else if (dragDistance > threshold) {
      stepPrev(true)
    } else {
      setTranslateX(baseTranslate)
    }

    scheduleResumeAutoPlay()
  }, [isDragging, translateX, stepNext, stepPrev, scheduleResumeAutoPlay])

  // Autoplay sengaja TIDAK pause hanya karena mouse sedang berada di atas carousel.
  // Pause hanya saat user benar-benar drag/touch/klik tombol navigasi.
  useEffect(() => {
    if (!autoPlay || !products.length || isInteracting) return undefined

    const id = window.setInterval(() => {
      if (!document.hidden) {
        stepNext(false)
      }
    }, autoPlayInterval)

    return () => window.clearInterval(id)
  }, [autoPlay, autoPlayInterval, products.length, isInteracting, stepNext])

  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current)
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current)
    }
  }, [])

  if (!products.length) return null

  return (
    <section className="section section-dark products-section">
      <div className="container">
        {(title || subtitle) && (
          <div
            className="products-header"
            style={{ textAlign: 'center', marginBottom: '2.5rem' }}
          >
            {subtitle && (
              <span className="products-subtitle">{subtitle}</span>
            )}

            {title && (
              <h2 className="products-title display-font">{title}</h2>
            )}
          </div>
        )}

        <div className="product-carousel-wrapper">
          {showNav && (
            <button
              type="button"
              className="carousel-arrow carousel-prev"
              onClick={() => stepPrev(true)}
              onMouseDown={pauseAutoPlay}
              onMouseUp={scheduleResumeAutoPlay}
              onTouchStart={pauseAutoPlay}
              onTouchEnd={scheduleResumeAutoPlay}
              aria-label="Produk sebelumnya"
            >
              <ArrowLeftIcon width="20" height="20" />
            </button>
          )}

          <div className="product-carousel-viewport">
            <div
              ref={trackRef}
              className={`product-carousel-track ${shake ? 'shake' : ''}`}
              style={{
                transform: `translate3d(${translateX}px, 0, 0)`,
                '--translate-x': `${translateX}px`,
                transition:
                  isDragging || jumping
                    ? 'none'
                    : 'transform 0.42s cubic-bezier(0.2, 0.7, 0.2, 1)',
              }}
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
            >
              {duplicatedProducts.map((product, index) => (
                <Link
                  key={`carousel-${index}-${product.id}`}
                  to={`/produk/${product.id}`}
                  className="product-carousel-item-link"
                  draggable="false"
                >
                  <article className="product-carousel-card">
                    <div className="product-carousel-image">
                      {product.gambar ? (
                        <img
                          src={product.gambar}
                          alt={product.nama}
                          loading="lazy"
                          draggable="false"
                        />
                      ) : (
                        <div
                          className="product-carousel-image-placeholder"
                          role="img"
                          aria-label={product.nama}
                        />
                      )}

                      <span className="product-carousel-tag">
                        {product.kategori}
                      </span>
                    </div>

                    <div className="product-carousel-content">
                      <h3 className="product-carousel-name">{product.nama}</h3>
                      <p className="product-carousel-description">
                        {product.deskripsi}
                      </p>

                      <div className="product-carousel-footer">
                        <span className="product-carousel-price">
                          {formatRupiah(product.harga)}
                        </span>

                        <span className="product-carousel-action" aria-hidden="true">
                          <ArrowRightIcon width="16" height="16" />
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>

          {showNav && (
            <button
              type="button"
              className="carousel-arrow carousel-next"
              onClick={() => stepNext(true)}
              onMouseDown={pauseAutoPlay}
              onMouseUp={scheduleResumeAutoPlay}
              onTouchStart={pauseAutoPlay}
              onTouchEnd={scheduleResumeAutoPlay}
              aria-label="Produk berikutnya"
            >
              <ArrowRightIcon width="20" height="20" />
            </button>
          )}
        </div>

        <div className="section-cta" style={{ marginTop: '2.5rem' }}>
          <Link to="/katalog" className="btn btn-primary">
            Lihat Semua Produk <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </section>
  )
}

export default ProductCarousel
