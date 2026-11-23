import { Link } from 'react-router-dom'
import { ArrowRightIcon } from './icons'
import './Hero.css'

function Hero() {
  return (
    <section id="home" className="hero">
      <div className="container hero-container">
        <div className="hero-content">
          <span className="sticker sticker--cream hero-sticker">Fresh Daily</span>
          <h1 className="hero-title display-font">
            <span>Time to Get</span>
            <span className="hero-title-indent">Your Treats!</span>
          </h1>
          <p className="hero-description">
            Kue, roti, dan pastry panggang segar setiap hari dari Kuki Bakehouse.
            Dibuat dengan bahan pilihan dan resep turun-temurun untuk setiap momen spesial Anda.
          </p>
          <div className="hero-actions">
            <Link to="/katalog" className="btn btn-primary">
              Lihat Katalog <ArrowRightIcon />
            </Link>
            <Link to="/category" className="btn btn-outline-light">
              Jelajahi Kategori
            </Link>
          </div>
        </div>

        
        
      </div>
    </section>
  )
}

export default Hero
