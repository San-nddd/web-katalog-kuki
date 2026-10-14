import { useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Reveal, SectionTitle, Roll } from '../components/PageKit'
import './sections.css'

function ContactPage() {
  const [sent, setSent] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    // Belum terhubung ke backend: ganti dengan request ke API/email Anda.
    event.currentTarget.reset()
    setSent(true)
  }

  return (
    <div className="landing-page">
      <Navbar />

      <section id="contact" className="section section-dark page-section">
        <div className="container">
          <SectionTitle lines={['Contact']} theme="orange" />

          <div className="contact-grid">
            <Reveal variant="left" className="grid-item">
              <div className="contact-form-card">
                <h3 className="contact-card-title display-font">Get in Touch</h3>
                <form className="contact-form" onSubmit={handleSubmit}>
                  <input
                    type="text"
                    name="name"
                    placeholder="Your Name"
                    aria-label="Your Name"
                    autoComplete="name"
                    required
                  />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number"
                    aria-label="Phone Number"
                    autoComplete="tel"
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    aria-label="Email Address"
                    autoComplete="email"
                    required
                  />
                  <textarea
                    name="message"
                    rows="4"
                    placeholder="Message"
                    aria-label="Message"
                    required
                  ></textarea>
                  <button type="submit" className="btn btn-primary contact-submit">
                    <Roll text="Send message" />
                  </button>
                  {sent && (
                    <p className="form-status" role="status">
                      Terima kasih! Pesan Anda sudah kami terima.
                    </p>
                  )}
                </form>
              </div>
            </Reveal>

            <Reveal variant="right" delay={120} className="grid-item">
              <div className="contact-info-card">
                <div className="info-block">
                  <h3 className="info-label display-font">Phone</h3>
                  <p>
                    <a href="tel:+6285135243310">+62 851-3524-3310</a>
                  </p>
                </div>
                <div className="info-block">
                  <h3 className="info-label display-font">Address</h3>
                  <p>
                    Jl. Angkrek No. 52
                    <br />
                    Situ, Kec. Sumedang Utara, Kabupaten Sumedang, Jawa Barat
                  </p>
                </div>

                <div className="info-block">
                  <h3 className="info-label display-font">Email</h3>
                  <p>
                    <a href="mailto:kuki.bakehousee@gmail.com">kuki.bakehousee@gmail.com</a>
                  </p>
                </div>

                <div className="opening-hours">
                  <h4 className="opening-title display-font">Opening Hours</h4>
                  <p>Monday - Friday</p>
                  <strong>9:00 AM - 5:00 PM</strong>
                  <p>Saturday - Sunday</p>
                  <strong>8:00 AM - 6:00 PM</strong>
                  <p>Sunday (Tol Bojong)</p>
                  <strong>6:00 AM - 10:00 AM</strong>
                </div>
                
                <div className="kuki-badges">
                  <span className="badge-item display-font">Since 2021</span>
                  <span className="badge-item display-font">HALAL MUI ✨</span>
                  <span className="badge-item display-font">#1 Tiramisu Sodok di Sumedang</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default ContactPage
