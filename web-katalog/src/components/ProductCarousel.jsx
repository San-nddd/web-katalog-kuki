import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon, ArrowRightIcon } from './icons'
import { formatRupiah } from '../utils/mockData'
import './ProductCarousel.css'

// Jeda (ms) sebelum putar otomatis lanjut lagi setelah kursor pergi / interaksi selesai
const RESUME_DELAY = 1500

/**
 * Product Carousel dengan infinite loop, swipe, shake effect, dan SVG icons
 */
function ProductCarousel({ products = [], title = 'Produk Unggulan', subtitle, showNav = true, autoPlay = false, autoPlayInterval = 4000 }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [translateX, setTranslateX] = useState(0)
  const [shake, setShake] = useState(false)
  const [isInteracting, setIsInteracting] = useState(false)
  const [itemsPerView, setItemsPerView] = useState(4)
  const [jumping, setJumping] = useState(false)

  const trackRef = useRef(null)
  const autoPlayRef = useRef(null)
  const itemWidthRef = useRef(0)
  const resumeTimeoutRef = useRef(null)

  // Calculate items per view based on screen width
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

  // Duplicate items for infinite loop effect
  const duplicatedProducts = products.length > 0
    ? [...products.slice(-itemsPerView), ...products, ...products.slice(0, itemsPerView)]
    : []

  const baseIndex = itemsPerView // Start at first real item

  // Calculate item width
  useEffect(() => {
    if (trackRef.current && trackRef.current.children.length > 0) {
      const firstChild = trackRef.current.children[0]
      itemWidthRef.current = firstChild.offsetWidth + 28 // width + gap (1.75rem = 28px)
    }
  }, [itemsPerView])

  // Go to specific index with shake effect
  const goToIndex = useCallback((index, animate = true) => {
    if (animate) {
      setShake(true)
      setTimeout(() => setShake(false), 300)
    }

    const targetTranslate = -index * itemWidthRef.current
    setTranslateX(targetTranslate)
    setCurrentIndex(index)
  }, [])

  // Pindah ke index tanpa animasi (dipakai untuk lompat mulus saat loop)
  const jumpTo = useCallback((index) => {
    setJumping(true)
    setTranslateX(-index * itemWidthRef.current)
    setCurrentIndex(index)
    requestAnimationFrame(() => requestAnimationFrame(() => setJumping(false)))
  }, [])

  // Next / Prev (withShake = true untuk klik manual, false untuk putar otomatis)
  const stepNext = useCallback((withShake) => {
    const nextIndex = currentIndex + 1
    goToIndex(nextIndex, withShake)

    // Loop back to start after last real item
    if (nextIndex >= baseIndex + products.length) {
      setTimeout(() => jumpTo(baseIndex), 450) // Wait for transition
    }
  }, [currentIndex, goToIndex, products.length, baseIndex, jumpTo])

  const goNext = useCallback(() => stepNext(true), [stepNext])

  const goPrev = useCallback(() => {
    const prevIndex = currentIndex - 1
    goToIndex(prevIndex)

    // Loop to end before first real item
    if (prevIndex < baseIndex) {
      setTimeout(() => jumpTo(baseIndex + products.length - 1), 450)
    }
  }, [currentIndex, goToIndex, products.length, baseIndex, jumpTo])

  // Interaction handlers - pause auto-play for 5 seconds after any interaction
  const pauseAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current)
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current)
    setIsInteracting(true)
  }, [])

  const scheduleResumeAutoPlay = useCallback(() => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current)
    resumeTimeoutRef.current = setTimeout(() => {
      setIsInteracting(false)
    }, RESUME_DELAY)
  }, [])

  const handleInteractionStart = useCallback(() => {
    pauseAutoPlay()
  }, [pauseAutoPlay])

  const handleInteractionEnd = useCallback(() => {
    scheduleResumeAutoPlay()
  }, [scheduleResumeAutoPlay])

  // Drag / Swipe handlers
  const handleDragStart = useCallback((e) => {
    if (e.type === 'mousedown' && e.button !== 0) return

    setIsDragging(true)
    setDragStartX(e.type === 'mousedown' ? e.clientX : e.touches[0].clientX)
    if (trackRef.current) trackRef.current.style.transition = 'none'
    handleInteractionStart()
  }, [handleInteractionStart])

  const handleDragMove = useCallback((e) => {
    if (!isDragging) return
    const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX
    const deltaX = clientX - dragStartX
    const currentTranslate = -currentIndex * itemWidthRef.current
    setTranslateX(currentTranslate + deltaX)
  }, [isDragging, dragStartX, currentIndex])

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    if (trackRef.current) trackRef.current.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.7, 0.2, 1)'

    const dragDistance = translateX - (-currentIndex * itemWidthRef.current)
    const threshold = itemWidthRef.current * 0.15

    if (dragDistance < -threshold) {
      goNext()
    } else if (dragDistance > threshold) {
      goPrev()
    } else {
      // Snap back
      goToIndex(currentIndex, false)
    }

    handleInteractionEnd()
  }, [isDragging, translateX, currentIndex, goNext, goPrev, handleInteractionEnd, goToIndex])

  const handleTrackMouseLeave = useCallback(() => {
    if (isDragging) {
      handleDragEnd()
    } else {
      handleInteractionEnd()
    }
  }, [isDragging, handleDragEnd, handleInteractionEnd])

  // Auto-play per langkah: geser satu kartu, berputar tanpa putus, berhenti saat hover/interaksi
  useEffect(() => {
    if (!autoPlay || products.length === 0 || isInteracting) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const id = setInterval(() => {
      if (!document.hidden) stepNext(false)
    }, autoPlayInterval)

    return () => clearInterval(id)
  }, [autoPlay, autoPlayInterval, products.length, isInteracting, stepNext])

  // Initialize position
  useEffect(() => {
    jumpTo(baseIndex)
  }, [baseIndex, products.length, jumpTo])

  // Bersihkan timeout saat komponen dilepas
  useEffect(() => () => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current)
  }, [])

  if (products.length === 0) return null

  return (
    <section className="section section-dark products-section" onMouseEnter={handleInteractionStart} onMouseLeave={handleInteractionEnd}>
      <div className="container">
        {(title || subtitle) && (
          <div className="products-header" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            {subtitle && <span className="products-subtitle">{subtitle}</span>}
            {title && <h2 className="products-title display-font">{title}</h2>}
          </div>
        )}

        <div className="product-carousel-wrapper">
          {showNav && (
            <button
              type="button"
              className="carousel-arrow carousel-prev"
              onClick={goPrev}
              onMouseDown={handleInteractionStart}
              onMouseUp={handleInteractionEnd}
              onMouseLeave={handleInteractionEnd}
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
                transform: `translateX(${translateX}px)`,
                '--translate-x': `${translateX}px`,
                transition: (isDragging || jumping) ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0.7, 0.2, 1)',
              }}
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleTrackMouseLeave}
              onMouseEnter={handleInteractionStart}
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
            >
              {duplicatedProducts.map((product, i) => (
                <Link
                  key={`carousel-${i}-${product.id}`}
                  to={`/produk/${product.id}`}
                  className="product-carousel-item-link"
                >
                  <article className="product-carousel-card">
                    <div className="product-carousel-image">
                      {product.gambar ? (
                        <img src={product.gambar} alt={product.nama} loading="lazy" />
                      ) : (
                        <div className="product-carousel-image-placeholder" role="img" aria-label={product.nama} />
                      )}
                      <span className="product-carousel-tag">{product.kategori}</span>
                    </div>
                    <div className="product-carousel-content">
                      <h3 className="product-carousel-name">{product.nama}</h3>
                      <p className="product-carousel-description">{product.deskripsi}</p>
                      <div className="product-carousel-footer">
                        <span className="product-carousel-price">{formatRupiah(product.harga)}</span>
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
              onClick={goNext}
              onMouseDown={handleInteractionStart}
              onMouseUp={handleInteractionEnd}
              onMouseLeave={handleInteractionEnd}
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