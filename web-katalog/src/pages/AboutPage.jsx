import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { ArrowRightIcon } from '../components/icons'
import { Reveal, SectionTitle, Roll } from '../components/PageKit'
import './sections.css'

/* Teks di bawah adalah contoh: ganti dengan cerita dan nilai asli Kuki Bakehouse. */
const values = [
  {
    title: 'Real Butter',
    text: 'Kami memakai bahan sederhana yang kami percaya rasanya: mentega asli, telur segar, dan gula secukupnya.',
  },
  {
    title: 'Baked at Dawn',
    text: 'Adonan disiapkan malam sebelumnya, lalu dipanggang pagi hari supaya roti sampai ke etalase masih hangat.',
  },
  {
    title: 'Small Batches',
    text: 'Setiap loyang dibuat dalam jumlah kecil agar kami bisa menjaga rasa dan tampilan tiap potongnya.',
  },
]

function AboutPage() {
  return (
    <div className="landing-page">
      <Navbar />

      <section className="section section-dark about-intro">
        <div className="container">
          <SectionTitle label="Our Story" lines={['About', 'Kuki Bakehouse']} theme="orange" />
          <Reveal>
            <p className="about-lead">
              Kuki Bakehouse adalah toko roti dan pastry yang membuat semuanya dengan tangan,
              dari adonan pertama sampai dekorasi terakhir.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section section-cream about-story">
        <div className="container">
          <div className="about-split">
            <Reveal variant="left" className="about-copy">
              <h3 className="about-heading display-font">Baked Slowly, Shared Warmly</h3>
              <p>
                Kami percaya roti yang enak butuh waktu. Karena itu adonan kami diistirahatkan
                cukup lama, dan setiap resep diuji berkali-kali sebelum masuk ke menu.
              </p>
              <p>
                Hasilnya adalah kue, roti, dan pastry yang sederhana di tampilan tetapi kaya di
                rasa, untuk dinikmati sendiri atau dibagikan di meja bersama.
              </p>
              <Link to="/bakers" className="btn btn-primary about-btn">
                <Roll text="Meet Our Bakers" /> <ArrowRightIcon />
              </Link>
            </Reveal>

            <Reveal variant="right" delay={120}>
              <div className="about-photo" role="img" aria-label="Dapur Kuki Bakehouse"></div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section section-dark about-values">
        <div className="container">
          <SectionTitle label="Values" lines={['What We', 'Bake By']} theme="dark" />
          <div className="values-grid">
            {values.map((value, i) => (
              <Reveal key={value.title} delay={i * 110} className="grid-item">
                <div className="value-card">
                  <h3 className="value-title display-font">{value.title}</h3>
                  <p>{value.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-peach about-cta">
        <div className="container">
          <Reveal>
            <div className="about-cta-inner">
              <h3 className="about-heading display-font">Come Say Hi</h3>
              <p>Mampir ke toko kami, atau lihat dulu apa yang sedang kami panggang hari ini.</p>
              <div className="about-cta-actions">
                <Link to="/katalog" className="btn btn-primary">
                  <Roll text="Lihat Katalog" /> <ArrowRightIcon />
                </Link>
                <Link to="/contact" className="btn about-btn-secondary">
                  <Roll text="Contact Us" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default AboutPage
