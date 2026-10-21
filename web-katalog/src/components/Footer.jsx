import { Link } from 'react-router-dom'
import { MapPinIcon, PhoneIcon, MailIcon } from './icons'
import './Footer.css'

import logo from '../assets/Kuki.png'

const LOGO_SRC = logo
function Footer() {
  return (
    <footer className="footer" id="contact">
      <div className="footer-cta">
        <div className="container footer-cta-inner">
          <span className="sticker sticker--rotate-right footer-sticker footer-sticker-1">Tips</span>
          <span className="sticker sticker--cream footer-sticker footer-sticker-2">Offers</span>
          <span className="sticker sticker--rotate-right footer-sticker footer-sticker-3">Stories</span>
          <h2 className="footer-cta-title display-font">
            <span>Be the First to</span>
            <span className="footer-cta-indent">Know What&apos;s Baking</span>
          </h2>
          <p className="footer-cta-text">
            Ikuti newsletter kami untuk resep, promo mingguan, dan cerita terbaru dari dapur Kuki Bakehouse.
          </p>
          <a href="mailto:kuki.bakehousee@gmail.com" className="btn btn-primary">
            Join Newsletter
          </a>
        </div>
      </div>

      <div className="footer-main">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link to="/" className="footer-logo" aria-label="Kuki Bakehouse, ke beranda">
                          {LOGO_SRC ? (
                            <img src={LOGO_SRC} alt="" />
                          ) : (
                            <span className="footer-logo-text display-font" aria-hidden="true">
                              kuki
                            </span>
                          )}
                        </Link>
              <p className="footer-description">
                Freshly baked with love. Hadirkan kebahagiaan dalam setiap gigitan.
              </p>
              <ul className="footer-contact-list">
                <li>
                  <MapPinIcon /> Jl. Angkrek No. 52, Situ, Kec. Sumedang Utara, Kabupaten Sumedang, Jawa Barat
                </li>
                <li>
                  <PhoneIcon /> +62 851-3524-3310
                </li>
                <li>
                  <MailIcon /> kuki.bakehousee@gmail.com
                </li>
              </ul>
              
              <div className="footer-badges">
                <span className="badge-item display-font">Since 2021</span>
                <span className="badge-item display-font">HALAL MUI </span>
                <span className="badge-item display-font">#1 Tiramisu Sodok di Sumedang</span>
              </div>
            </div>

            <div className="footer-links">
              <h3 className="footer-title">Main Page</h3>
              <ul>
                <li>
                  <Link to="/">Home</Link>
                </li>
                <li>
                  <Link to="/category">Category</Link>
                </li>
                <li>
                  <Link to="/bakers">Bakers</Link>
                </li>
              </ul>
            </div>

            <div className="footer-links">
              <h3 className="footer-title">Other Pages</h3>
              <ul>
                <li>
                  <Link to="/contact">Contact</Link>
                </li>
                <li>
                  <Link to="/blog">Blog</Link>
                </li>
                <li>
                  <Link to="/contact">Terms & Conditions</Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Kuki Bakehouse. All rights reserved.</p>
          </div>
        </div>
      </div>

      <div className="footer-decoration" aria-hidden="true">
        <div className="footer-deco-photo deco-1"></div>
        <div className="footer-deco-photo deco-2"></div>
        <div className="footer-deco-photo deco-3"></div>
        <div className="footer-deco-photo deco-4"></div>
        <div className="footer-deco-photo deco-5"></div>
      </div>
    </footer>
  )
}

export default Footer
