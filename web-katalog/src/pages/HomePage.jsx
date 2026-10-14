import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import KukiAssistant from '../components/KukiAssistant'
import ProductCarousel from '../components/ProductCarousel'
import { ArrowLeftIcon, ArrowRightIcon, QuoteIcon } from '../components/icons'
import { Reveal, SectionTitle, Roll, CategoryTile } from '../components/PageKit'
import useLoopSlider from '../components/useLoopSlider'
import { getProduk } from '../services/produkService'
import { getKategori } from '../services/kategoriService'
import heroImg from '../assets/hero.png'
import { testimonials } from '../utils/mockData'
import './sections.css'

function HeroIcon({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

function CategoryLoop({ categories }) {
  const loopItems = useMemo(() => {
    if (!categories.length) return []
    let items = categories
    while (items.length < 8) items = [...items, ...categories]
    return items.map((category, i) => ({ ...category, loopKey: `${category.id}-${i}` }))
  }, [categories])

  const { list, phase, slideNext, slidePrev, onEnd, pause, resume } = useLoopSlider(loopItems, {
    interval: 1800,
    slideMs: 600,
  })

  if (!loopItems.length) return null

  return (
    <div
      className="category-loop"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <button
        type="button"
        className="carousel-arrow category-arrow"
        onClick={slidePrev}
        aria-label="Kategori sebelumnya"
      >
        <ArrowLeftIcon />
      </button>

      <div className="category-viewport">
        <div className={`loop-track category-track-loop is-${phase}`} onTransitionEnd={onEnd}>
          {list.map((category) => (
            <div className="category-loop-item" key={category.loopKey}>
              <CategoryTile category={category} />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="carousel-arrow category-arrow"
        onClick={slideNext}
        aria-label="Kategori berikutnya"
      >
        <ArrowRightIcon />
      </button>
    </div>
  )
}

/* Testimonial: kartu bergeser horizontal (keluar ke kiri, berikutnya masuk dari kanan) */
function TestimonialSlider() {
  const { list, phase, slideNext, slidePrev, onEnd, pause, resume, canLoop } = useLoopSlider(
    testimonials,
    { interval: 5000, slideMs: 700 },
  )

  return (
    <div
      className="testimonial-wrap"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <div className="testimonial-viewport">
        <div className={`loop-track testimonial-track is-${phase}`} onTransitionEnd={onEnd}>
          {list.slice(0, 2).map((testimonial, i) => (
            <figure
              className="testimonial-card"
              key={testimonial.id ?? testimonial.name}
              aria-hidden={i > 0 && phase === 'idle' ? 'true' : undefined}
            >
              <QuoteIcon className="testimonial-quote" width="48" height="48" />
              <blockquote className="testimonial-text">{testimonial.quote}</blockquote>
              <figcaption className="testimonial-author">
                {testimonial.avatar ? (
                  <img className="testimonial-avatar" src={testimonial.avatar} alt="" />
                ) : (
                  <div className="testimonial-avatar" aria-hidden="true"></div>
                )}
                <div>
                  <strong className="testimonial-name">{testimonial.name}</strong>
                  <span className="testimonial-role">{testimonial.role}</span>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {canLoop && (
        <>
          <button
            type="button"
            className="carousel-arrow testimonial-arrow testimonial-prev"
            onClick={slidePrev}
            aria-label="Testimonial sebelumnya"
          >
            <ArrowLeftIcon />
          </button>
          <button
            type="button"
            className="carousel-arrow testimonial-arrow testimonial-next"
            onClick={slideNext}
            aria-label="Testimonial berikutnya"
          >
            <ArrowRightIcon />
          </button>
        </>
      )}
    </div>
  )
}

function HomePage() {
  const [featured, setFeatured] = useState([])
  const [categories, setCategories] = useState([])
  const productCarouselRef = useRef(null)
  const [productCardsVisible, setProductCardsVisible] = useState(false)

  useEffect(() => {
    let active = true

    getProduk()
      .then((data) => {
        if (!active || !data.length) return
        setFeatured(data.slice(0, 4))
      })
      .catch(() => {

      })

    getKategori()
      .then((data) => {
        if (!active) return
        setCategories(data)
      })
      .catch(() => {

      })

    return () => {
      active = false
    }
  }, [])

  // Amati posisi carousel hanya untuk memicu animasi pada kartu produk.
  // Wrapper/section tidak menerima animasi opacity, transform, atau blur.
  useEffect(() => {
    const target = productCarouselRef.current
    if (!target || productCardsVisible) return

    if (typeof IntersectionObserver === 'undefined') {
      setProductCardsVisible(true)
      return
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setProductCardsVisible(true)
        observer.disconnect()
      }
    }, { threshold: 0.12 })

    observer.observe(target)
    return () => observer.disconnect()
  }, [productCardsVisible])

  // Reveal per elemen: section dan judul tetap diam, kartu muncul satu per satu.
  useEffect(() => {
    const root = document.querySelector('.landing-page')
    if (!root) return
    const selector = '.category-loop-item, .testimonial-card, .mosaic-photo'
    const items = [...root.querySelectorAll(selector)]
    if (!('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) {
          target.classList.add('kuki-item-visible')
          observer.unobserve(target)
        }
      })
    }, { threshold: 0.08 })
    items.forEach((item, index) => {
      item.classList.add('kuki-item-reveal')
      item.style.setProperty('--kuki-delay', `${(index % 4) * 90}ms`)
      observer.observe(item)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="landing-page">
      <Navbar />

      <section className="hero" id="home">
        <div className="hero-collage" aria-hidden="true">
          <img className="hero-collage-img" src={heroImg} alt="" />
        </div>

        <div className="container hero-content">
          <div className="hero-badges">
            <span className="hero-badge display-font">
              <HeroIcon>
                <rect x="3" y="5" width="18" height="16" rx="3" />
                <path d="M8 3v4M16 3v4M3 10h18" />
              </HeroIcon>
              Since 2021
            </span>
            <span className="hero-badge display-font">
              <HeroIcon>
                <path d="M12 3l7.5 3v5.5c0 4.6-3.1 8.3-7.5 9.5-4.4-1.2-7.5-4.9-7.5-9.5V6L12 3z" />
                <path d="M8.8 12l2.2 2.2 4.2-4.4" />
              </HeroIcon>
              Halal MUI
            </span>
            <span className="hero-badge display-font">
              <HeroIcon>
                <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8L3.5 9.7l5.9-.9L12 3.5z" />
              </HeroIcon>
              #1 Tiramisu Sodok di Sumedang
            </span>
          </div>
          <div className="hero-title-wrap">
            <span className="hero-title-tag display-font">Kuki Bakehouse</span>
            <h1 className="hero-title display-font">
              <span className="hero-line hero-line-1">Where Crumbs</span>
              <span className="hero-line hero-line-2">Become Art</span>
            </h1>
          </div>
          <Link to="/katalog" className="btn btn-primary hero-cta">
            <Roll text="Explore Our Items" /> <ArrowRightIcon />
          </Link>
        </div>
      </section>

      <div
        ref={productCarouselRef}
        className={`home-featured-products${productCardsVisible ? ' cards-visible' : ''}`}
      >
        <ProductCarousel
          products={featured}
          title="Baked Fresh"
          subtitle="Every Morning"
          showNav={true}
          autoPlay={true}
          autoPlayInterval={2500}
        />
      </div>

      <section id="category" className="section section-cream categories-section">
        <div className="container">
          <SectionTitle
            label="Category"
            lines={['Fresh Picks', 'of the Season']}
            theme="cream"
          />
          <Reveal>
            <CategoryLoop categories={categories} />
          </Reveal>
          <div className="section-divider"></div>
        </div>
      </section>

      <section className="section section-cream testimonial-section">
        <div className="container">
          <SectionTitle label="Testimonial" lines={['Loved by', 'Our Community']} theme="cream" />
          <Reveal>
            <TestimonialSlider />
          </Reveal>
        </div>
      </section>

      <section className="section section-peach gallery-section">
        <div className="container">
          <div className="mosaic-gallery" aria-hidden="true">
            {['a', 'b', 'c', 'd', 'e', 'f', 'video'].map((tile, i) => (
              <Reveal
                key={tile}
                variant="pop"
                delay={i * 70}
                className={`mosaic-photo mosaic-${tile}`}
              />
            ))}
          </div>
        </div>
      </section>

      <KukiAssistant />

      <Footer />
    </div>
  )
}

export default HomePage