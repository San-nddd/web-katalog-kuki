import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon, ArrowRightIcon } from './icons'
import { formatRupiah } from '../utils/mockData'
import './ProductCarousel.css'

const SLIDE_MS = 420
const INACTIVITY_MS = 5000

function ProductCarousel({
  products = [],
  title = 'Produk Unggulan',
  subtitle,
  showNav = true,
  autoPlay = false,
  autoPlayInterval = 4000,
}) {
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [itemsPerView, setItemsPerView] = useState(4)
  const [jumping, setJumping] = useState(false)

  const trackRef = useRef(null)
  const itemWidthRef = useRef(0)
  const currentIndexRef = useRef(0)
  const dragRef = useRef(null)
  const suppressClickRef = useRef(false)
  const movingRef = useRef(false)
  const moveTimeoutRef = useRef(null)
  const inactivityTimerRef = useRef(null)

  const cloneCount = Math.min(itemsPerView, products.length)
  const duplicatedProducts = products.length
    ? [...products.slice(-cloneCount), ...products, ...products.slice(0, cloneCount)]
    : []
  const baseIndex = cloneCount

  const jumpTo = useCallback((index) => {
    setJumping(true)
    currentIndexRef.current = index
    setTranslateX(-index * itemWidthRef.current)
    requestAnimationFrame(() => requestAnimationFrame(() => setJumping(false)))
  }, [])

  const measureAndSync = useCallback(() => {
    const track = trackRef.current
    if (!track?.firstElementChild) return

    const style = window.getComputedStyle(track)
    const gap = Number.parseFloat(style.columnGap || style.gap || '0') || 0
    const width = track.firstElementChild.getBoundingClientRect().width
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

  useEffect(() => {
    if (!products.length) return undefined

    // API dapat mengisi produk setelah render pertama.
    const frame = requestAnimationFrame(() => {
      measureAndSync()
      jumpTo(baseIndex)
    })

    const track = trackRef.current
    const observer = track && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measureAndSync)
      : null
    if (observer) observer.observe(track)

    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [products.length, itemsPerView, baseIndex, measureAndSync, jumpTo])

  // Perpindahan hanya menggunakan CSS transform; tidak ada animasi shake.
  const finishMove = useCallback(() => {
    if (!movingRef.current) return
    movingRef.current = false
    if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current)
    moveTimeoutRef.current = null

    const index = currentIndexRef.current
    if (index >= baseIndex + products.length) jumpTo(baseIndex)
    else if (index < baseIndex) jumpTo(baseIndex + products.length - 1)
  }, [baseIndex, products.length, jumpTo])

  const moveTo = useCallback((index) => {
    if (!itemWidthRef.current || movingRef.current) return
    movingRef.current = true
    currentIndexRef.current = index
    setTranslateX(-index * itemWidthRef.current)
    // Fallback jika transitionend tidak dikirim browser.
    moveTimeoutRef.current = window.setTimeout(finishMove, SLIDE_MS + 100)
  }, [finishMove])

  const moveBy = useCallback((direction) => {
    if (!products.length || movingRef.current) return
    moveTo(currentIndexRef.current + direction)
  }, [products.length, moveTo])

  // Jeda saat ada aktivitas; setelah 5 detik tanpa interaksi, autoplay lanjut.
  // Saat jari / tombol mouse masih ditekan, hitung mundur belum dimulai.
  const pauseAutoPlay = useCallback((pointerDown = false) => {
    if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current)
    inactivityTimerRef.current = null
    setIsPaused(true)

    if (!pointerDown) {
      inactivityTimerRef.current = window.setTimeout(() => {
        inactivityTimerRef.current = null
        setIsPaused(false)
        // Langsung geser sekali pada detik ke-5, lalu gunakan interval normal.
        if (autoPlay && products.length && !document.hidden) moveBy(1)
      }, INACTIVITY_MS)
    }
  }, [autoPlay, products.length, moveBy])

  // Pointer Events menyatukan mouse dan sentuhan. Scroll vertikal HP tetap normal.
  const handlePointerDown = useCallback((event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (movingRef.current) return

    suppressClickRef.current = false
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      deltaX: 0,
      active: false,
    }
    pauseAutoPlay(true)
  }, [pauseAutoPlay])

  const handlePointerMove = useCallback((event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!drag.active) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        dragRef.current = null // Biarkan halaman scroll vertikal.
        pauseAutoPlay()
        return
      }
      drag.active = true
      setIsDragging(true)
      event.currentTarget.setPointerCapture?.(event.pointerId)
    }

    drag.deltaX = deltaX
    setTranslateX(-currentIndexRef.current * itemWidthRef.current + deltaX)
  }, [pauseAutoPlay])

  const handlePointerEnd = useCallback((event, canceled = false) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    pauseAutoPlay()
    if (!drag.active) return // Ketuk biasa: tautan produk tetap bisa dibuka.

    suppressClickRef.current = true
    setIsDragging(false)
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const threshold = Math.max(36, itemWidthRef.current * 0.15)
    const direction = canceled || Math.abs(drag.deltaX) < threshold
      ? 0
      : drag.deltaX < 0 ? 1 : -1
    moveTo(currentIndexRef.current + direction)
  }, [moveTo, pauseAutoPlay])

  useEffect(() => {
    if (!autoPlay || !products.length || isPaused) return undefined
    const id = window.setInterval(() => {
      if (!document.hidden) moveBy(1)
    }, autoPlayInterval)
    return () => clearInterval(id)
  }, [autoPlay, autoPlayInterval, products.length, isPaused, moveBy])

  useEffect(() => () => {
    if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current)
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
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

        <div
          className="product-carousel-wrapper"
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse' || event.pointerType === 'pen') pauseAutoPlay()
          }}
          onPointerMove={(event) => {
            if (!dragRef.current && (event.pointerType === 'mouse' || event.pointerType === 'pen')) {
              pauseAutoPlay()
            }
          }}
          onFocusCapture={() => pauseAutoPlay()}
        >
          {showNav && (
            <button
              type="button"
              className="carousel-arrow carousel-prev"
              onClick={() => {
                pauseAutoPlay()
                moveBy(-1)
              }}
              aria-label="Produk sebelumnya"
            >
              <ArrowLeftIcon width="20" height="20" />
            </button>
          )}

          <div className="product-carousel-viewport">
            <div
              ref={trackRef}
              className="product-carousel-track"
              style={{
                transform: `translate3d(${translateX}px, 0, 0)`,
                transition: isDragging || jumping
                  ? 'none'
                  : `transform ${SLIDE_MS}ms cubic-bezier(0.2, 0.7, 0.2, 1)`,
                touchAction: 'pan-y',
                userSelect: isDragging ? 'none' : undefined,
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={(event) => handlePointerEnd(event)}
              onPointerCancel={(event) => handlePointerEnd(event, true)}
              onTransitionEnd={(event) => {
                if (event.target === event.currentTarget && event.propertyName === 'transform') {
                  finishMove()
                }
              }}
              onClickCapture={(event) => {
                if (suppressClickRef.current) {
                  event.preventDefault()
                  event.stopPropagation()
                  suppressClickRef.current = false
                }
              }}
              onDragStart={(event) => event.preventDefault()}
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
              onClick={() => {
                pauseAutoPlay()
                moveBy(1)
              }}
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
