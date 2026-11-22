import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Reveal, SectionTitle, CategoryTile } from '../components/PageKit'
import { getKategori } from '../services/kategoriService'
import './sections.css'

function CategoryPage() {
  const [categories, setCategories] = useState([])

  useEffect(() => {
    let active = true

    getKategori()
      .then((data) => {
        if (active) setCategories(data)
      })
      .catch(() => {

      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="landing-page">
      <Navbar />

      <section id="category" className="section section-dark page-section">
        <div className="container">
          <SectionTitle lines={['Category']} theme="orange" />
          <div className="category-grid">
            {categories.map((category, i) => (
              <Reveal key={category.id} delay={(i % 3) * 110} className="grid-item">
                <CategoryTile category={category} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default CategoryPage
