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
import {
  getTestimonialComments,
  getTestimonials,
  submitTestimonial,
  submitTestimonialComment,
} from '../services/testimonialService'
import heroImg from '../assets/hero.png'
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
function TestimonialSlider({ testimonials, onTestimonialPublished }) {
  const { list, phase, slideNext, slidePrev, onEnd, pause, resume, canLoop } = useLoopSlider(
    testimonials,
    { interval: 5000, slideMs: 700 },
  )
  const [comments, setComments] = useState([])
  const [commentName, setCommentName] = useState('')
  const [commentText, setCommentText] = useState('')
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentSaving, setCommentSaving] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [commentErrorId, setCommentErrorId] = useState(null)
  const [commentsForId, setCommentsForId] = useState(null)
  const [commentMessage, setCommentMessage] = useState('')
  const [commentCounts, setCommentCounts] = useState({})
  const [submissionOpen, setSubmissionOpen] = useState(false)
  const [submissionName, setSubmissionName] = useState('')
  const [submissionRole, setSubmissionRole] = useState('')
  const [submissionQuote, setSubmissionQuote] = useState('')
  const [submissionPhoto, setSubmissionPhoto] = useState(null)
  const [submissionSaving, setSubmissionSaving] = useState(false)
  const [submissionError, setSubmissionError] = useState('')
  const [submissionMessage, setSubmissionMessage] = useState('')
  const submissionPhotoRef = useRef(null)
  const currentTestimonial = list[0] || null
  const currentTestimonialId = currentTestimonial?.id

  useEffect(() => {
    if (!commentsOpen || !currentTestimonialId) return undefined

    let active = true

    getTestimonialComments(currentTestimonialId)
      .then((data) => {
        if (active) {
          setComments(data)
          setCommentsForId(currentTestimonialId)
        }
      })
      .catch((error) => {
        if (active) {
          setCommentError(error.message)
          setCommentErrorId(currentTestimonialId)
        }
      })

    return () => {
      active = false
    }
  }, [commentsOpen, currentTestimonialId])

  const handleCommentSubmit = async (event) => {
    event.preventDefault()
    setCommentError('')
    setCommentMessage('')
    setCommentSaving(true)

    try {
      // Simpan ID sebelum request karena slider dapat berpindah otomatis.
      const testimonialId = currentTestimonial.id
      await submitTestimonialComment(testimonialId, {
        name: commentName.trim(),
        comment: commentText.trim(),
      })
      setCommentName('')
      setCommentText('')
      setCommentMessage('Komentar berhasil dipublikasikan.')

      // Refresh hanya komentar testimonial yang baru diberi komentar.
      try {
        const updated = await getTestimonialComments(testimonialId, { fresh: true })
        setComments(updated)
        setCommentsForId(testimonialId)
        setCommentCounts((previous) => ({
          ...previous,
          [testimonialId]: updated.length,
        }))
      } catch {
        setCommentMessage('Komentar berhasil dipublikasikan, tetapi daftar belum dapat dimuat ulang.')
      }
    } catch (error) {
      setCommentError(error.message)
      setCommentErrorId(currentTestimonial.id)
    } finally {
      setCommentSaving(false)
    }
  }

  const handleTestimonialSubmit = async (event) => {
    event.preventDefault()
    setSubmissionError('')
    setSubmissionMessage('')
    setSubmissionSaving(true)

    try {
      await submitTestimonial({
        name: submissionName.trim(),
        role: submissionRole.trim(),
        quote: submissionQuote.trim(),
        photo: submissionPhoto,
      })
      setSubmissionName('')
      setSubmissionRole('')
      setSubmissionQuote('')
      setSubmissionPhoto(null)
      if (submissionPhotoRef.current) submissionPhotoRef.current.value = ''
      setSubmissionMessage('Testimonial berhasil dipublikasikan.')
      // Parent mengambil ulang daftar, sehingga slider menampilkan data terbaru.
      if (onTestimonialPublished) await onTestimonialPublished()
    } catch (error) {
      setSubmissionError(error.message)
    } finally {
      setSubmissionSaving(false)
    }
  }

  return (
    <>
      {currentTestimonial && (
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
                      {testimonial.role && <span className="testimonial-role">{testimonial.role}</span>}
                      <span className="testimonial-source">
                        {testimonial.source === 'customer'
                          ? (testimonial.isVerified ? 'Pelanggan terverifikasi' : 'Kiriman pelanggan')
                          : 'Dimasukkan Kuki Bakehouse'}
                      </span>
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
      )}

      {currentTestimonial && (
        <div className="testimonial-feedback">
          <button
            type="button"
            className="testimonial-feedback-toggle"
            onClick={() => {
              setCommentError('')
              setCommentErrorId(null)
              setCommentMessage('')
              setCommentsOpen((open) => !open)
            }}
            aria-expanded={commentsOpen}
          >
            {commentsOpen
              ? 'Tutup komentar'
              : `Lihat komentar (${commentCounts[currentTestimonialId] ?? currentTestimonial.commentCount ?? 0})`}
          </button>

          {commentsOpen && (
            <section className="testimonial-comments" aria-label={`Komentar untuk ${currentTestimonial.name}`}>
              <h3>Komentar untuk {currentTestimonial.name}</h3>
              {commentsForId !== currentTestimonial.id && commentErrorId !== currentTestimonial.id && <p>Memuat komentar...</p>}
              {commentErrorId === currentTestimonial.id && <p className="testimonial-feedback-error" role="alert">{commentError}</p>}
              {commentsForId === currentTestimonial.id && commentErrorId !== currentTestimonial.id && comments.length === 0 && (
                <p>Belum ada komentar.</p>
              )}
              {commentsForId === currentTestimonial.id && comments.map((comment) => (
                <article className="testimonial-comment" key={comment.id}>
                  <strong>{comment.name}</strong>
                  <p>{comment.comment}</p>
                </article>
              ))}

              <form className="testimonial-feedback-form" onSubmit={handleCommentSubmit}>
                <label>
                  <span>Nama</span>
                  <input
                    value={commentName}
                    onChange={(event) => setCommentName(event.target.value)}
                    maxLength={255}
                    required
                  />
                </label>
                <label>
                  <span>Komentar</span>
                  <textarea
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    maxLength={2000}
                    rows={3}
                    required
                  />
                </label>
                {commentMessage && <p role="status">{commentMessage}</p>}
                {commentErrorId === currentTestimonial.id && <p className="testimonial-feedback-error" role="alert">{commentError}</p>}
                <button type="submit" className="testimonial-feedback-submit" disabled={commentSaving}>
                  {commentSaving ? 'Mengirim...' : 'Kirim komentar'}
                </button>
              </form>
            </section>
          )}
        </div>
      )}

      <details
        className="testimonial-submission"
        open={submissionOpen}
        onToggle={(event) => setSubmissionOpen(event.currentTarget.open)}
      >
        <summary>Kirim testimonial Anda</summary>
        <form className="testimonial-feedback-form" onSubmit={handleTestimonialSubmit}>
          <label>
            <span>Nama</span>
            <input
              value={submissionName}
              onChange={(event) => setSubmissionName(event.target.value)}
              maxLength={255}
              required
            />
          </label>
          <label>
            <span>Peran (opsional)</span>
            <input
              value={submissionRole}
              onChange={(event) => setSubmissionRole(event.target.value)}
              maxLength={255}
            />
          </label>
          <label>
            <span>Testimonial</span>
            <textarea
              value={submissionQuote}
              onChange={(event) => setSubmissionQuote(event.target.value)}
              maxLength={5000}
              rows={4}
              required
            />
          </label>
          <label>
            <span>Foto (opsional, JPG/PNG/WebP maks. 5 MB)</span>
            <input
              type="file"
              ref={submissionPhotoRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setSubmissionPhoto(event.target.files?.[0] || null)}
            />
          </label>
          {submissionMessage && <p role="status">{submissionMessage}</p>}
          {submissionError && <p className="testimonial-feedback-error" role="alert">{submissionError}</p>}
          <button type="submit" className="testimonial-feedback-submit" disabled={submissionSaving}>
            {submissionSaving ? 'Mengirim...' : 'Kirim testimonial'}
          </button>
        </form>
      </details>
    </>
  )
}

function HomePage() {
  const [featured, setFeatured] = useState([])
  const [categories, setCategories] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [testimonialError, setTestimonialError] = useState('')
  const [testimonialNotice, setTestimonialNotice] = useState('')
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

    getTestimonials()
      .then((data) => {
        if (active) setTestimonials(data)
      })
      .catch((error) => {
        if (active) setTestimonialError(error.message)
      })

    return () => {
      active = false
    }
  }, [])

  const handleTestimonialPublished = async () => {
    // Tampilkan pesan sukses di parent agar tidak hilang saat slider di-reset.
    setTestimonialNotice('Testimonial berhasil dipublikasikan!')
    try {
      const latest = await getTestimonials({ fresh: true })
      setTestimonials(latest)
      setTestimonialError('')
    } catch {
      setTestimonialNotice(
        'Testimonial berhasil dipublikasikan, tetapi daftar belum dapat dimuat ulang.'
      )
    }
  }

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
    const selector = '.category-loop-item, .testimonial-card, .about-store-photo, .about-store-copy'
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
          {testimonialNotice && <p role="status" className="testimonial-feedback-success">{testimonialNotice}</p>}
          {testimonialError ? (
            <p className="testimonial-feedback-error" role="alert">{testimonialError}</p>
          ) : (
            <>
              {testimonials.length === 0 && <p className="testimonial-empty">Belum ada testimonial yang dipublikasikan.</p>}
              <Reveal>
                <TestimonialSlider
                  key={testimonials[0]?.id ?? 'empty'}
                  testimonials={testimonials}
                  onTestimonialPublished={handleTestimonialPublished}
                />
              </Reveal>
            </>
          )}
        </div>
      </section>

      {/* About Kuki Bakehouse — menggantikan galeri mosaik, warna peach tetap dipertahankan. */}
      <section className="section section-peach about-store-section" id="about">
        <div className="container">
          <div className="about-store-layout">
            <figure className="about-store-photo">
              <img
                src="/images/toko-kuki.jpg"
                alt="Foto toko Kuki Bakehouse"
                loading="lazy"
                decoding="async"
              />
            </figure>

            <div className="about-store-copy">
              <span className="about-store-eyebrow display-font">Our Story · Since 2021</span>
              <h2 className="about-store-title display-font">
                A Little Place, <span>Full of Sweet Moments.</span>
              </h2>
              <p>
                Selamat datang di Kuki Bakehouse. Di sini, kami ingin setiap
                roti, cookies, dan cake menjadi bagian dari momen menyenangkanmu.
              </p>
              <p>
                Dari pilihan rasa hingga detail penyajian, kami percaya hal-hal
                sederhana bisa terasa lebih istimewa ketika dinikmati bersama.
              </p>
            </div>
          </div>
        </div>
      </section>

      <KukiAssistant />

      <Footer />
    </div>
  )
}

export default HomePage