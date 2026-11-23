import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import './Navbar.css'
import logo from '../assets/Kuki.png'


const LOGO_SRC = logo
  


// Sesuaikan path dengan route di router Anda.
const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/category', label: 'Category' },
  { to: '/katalog', label: 'Katalog' },
  { to: '/contact', label: 'Contact' },
  { to: '/bakers', label: 'Bakers' },
  // { to: '/about', label: 'About' },
]

function Navbar() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const [pastHero, setPastHero] = useState(false)
  const [open, setOpen] = useState(false)

  /*
    Seperti di video: di Home navbar tersembunyi saat hero masih di atas,
    lalu turun dari atas setelah halaman di-scroll. Di halaman lain selalu tampil.
  */
  useEffect(() => {
    if (!isHome) return undefined
    const update = () => setPastHero(window.scrollY > window.innerHeight * 0.45)
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [isHome])

  const prevPathnameRef = useRef(pathname)

  useEffect(() => {
    if (prevPathnameRef.current !== pathname && open) {
      setOpen(false)
    }
    prevPathnameRef.current = pathname
  }, [pathname, open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  const hidden = isHome && !pastHero
  const prevPathRef = useRef(pathname)

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      setOpen(false)
      prevPathRef.current = pathname
    }
  }, [pathname])

  return (
    <>
      <header className={`navbar ${hidden ? 'is-hidden' : ''}`}>
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo" aria-label="Kuki Bakehouse, ke beranda">
            {LOGO_SRC ? (
              <img src={LOGO_SRC} alt="" />
            ) : (
              <span className="navbar-logo-text display-font" aria-hidden="true">
                kuki
              </span>
            )}
          </Link>

          <nav className={`navbar-pill ${open ? 'is-open' : ''}`} aria-label="Navigasi utama">
            <button
              type="button"
              className="navbar-toggle"
              aria-expanded={open}
              aria-controls="navbar-mobile-panel"
              aria-label={open ? 'Tutup menu' : 'Buka menu'}
              onClick={() => setOpen((value) => !value)}
            >
              <span className="navbar-toggle-lines" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>

            <ul id="navbar-links" className="navbar-links navbar-links-desktop">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} end={link.end} className="nav-link">
                    <span className="nav-roll">
                      <span className="nav-roll-in" data-text={link.label}>
                        {link.label}
                      </span>
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>

            <div
              id="navbar-mobile-panel"
              className="navbar-mobile-panel"
              aria-hidden={!open}
            >
              <div className="navbar-mobile-top">
                <Link
                  to="/"
                  className="navbar-mobile-logo"
                  aria-label="Kuki Bakehouse, ke beranda"
                  onClick={() => setOpen(false)}
                >
                  {LOGO_SRC ? <img src={LOGO_SRC} alt="" /> : null}
                </Link>

                <button
                  type="button"
                  className="navbar-close"
                  aria-label="Tutup menu"
                  onClick={() => setOpen(false)}
                >
                  <span aria-hidden="true"></span>
                  <span aria-hidden="true"></span>
                </button>
              </div>

              <div className="navbar-mobile-menu-box">
                <ul className="navbar-mobile-links">
                  {NAV_LINKS.map((link, index) => (
                    <li
                      key={link.to}
                      style={{ '--mobile-delay': `${index * 55}ms` }}
                    >
                      <NavLink
                        to={link.to}
                        end={link.end}
                        className="navbar-mobile-link"
                        onClick={() => setOpen(false)}
                      >
                        {link.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Di halaman selain Home, navbar fixed memakai ruang sendiri agar konten tidak tertutup */}
      {!isHome && <div className="navbar-spacer" aria-hidden="true"></div>}
    </>
  )
}

export default Navbar
