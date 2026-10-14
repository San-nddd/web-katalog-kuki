import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Reveal, SectionTitle } from '../components/PageKit'
import { bakers } from '../utils/mockData'
import './sections.css'

function BakersPage() {
  return (
    <div className="landing-page">
      <Navbar />

      <section id="bakers" className="section section-dark page-section">
        <div className="container">
          <SectionTitle lines={['Bakers']} theme="orange" />
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
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default BakersPage
