import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Reveal, SectionTitle } from '../components/PageKit'
import { getBakers } from '../services/bakerService'
import './sections.css'

function BakersPage() {
  const [bakers, setBakers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getBakers()
      .then((data) => {
        if (!active) return
        setBakers(data)
        setError('')
      })
      .catch((err) => {
        if (active) setError(err.message || 'Gagal memuat data bakers.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="landing-page">
      <Navbar />

      <section id="bakers" className="section section-dark page-section">
        <div className="container">
          <SectionTitle lines={['Bakers']} theme="orange" />
          {loading ? (
            <p className="bakers-state">Memuat bakers...</p>
          ) : error ? (
            <p className="bakers-state bakers-state-error">{error}</p>
          ) : bakers.length === 0 ? (
            <p className="bakers-state">Belum ada baker yang dipublikasikan.</p>
          ) : (
            <div className="bakers-grid bakers-grid-dark">
              {bakers.map((baker, i) => (
                <Reveal key={baker.id} delay={(i % 4) * 110} className="grid-item">
                  <div className="baker-card">
                    <h3 className="baker-name">{baker.name}</h3>
                    <span className="baker-role">{baker.role}</span>
                    {baker.photo ? (
                      <img className="baker-photo" src={baker.photo} alt={baker.name} />
                    ) : (
                      <div className="baker-photo" aria-hidden="true"></div>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default BakersPage
