import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import SearchBar from '../components/SearchBar'
import ProductCard from '../components/ProductCard'
import {
  categories as mockCategories,
  foodCategories,
  products as mockProducts,
} from '../utils/mockData'
import { getProduk } from '../services/produkService'
import { getKategori } from '../services/kategoriService'
import './KatalogPage.css'

const ALL = 'semua'

function resolveCategoryName(value, categories) {
  if (!value || value === ALL) return ALL
  const matched = categories.find(
    (category) => category.slug === value || category.name === value,
  )
  return matched ? matched.name : ALL
}

function KatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Data mock dipertahankan agar tampilan tetap sama saat backend belum tersedia.
  const [categories, setCategories] = useState(mockCategories)
  const [products, setProducts] = useState(mockProducts)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true

    getKategori()
      .then((data) => {
        if (active && data.length) setCategories(data)
      })
      .catch(() => {
        // Backend tidak tersedia: tetap tampilkan data mock.
      })

    getProduk()
      .then((data) => {
        if (active && data.length) setProducts(data)
      })
      .catch(() => {
        // Backend tidak tersedia: tetap tampilkan data mock.
      })

    return () => {
      active = false
    }
  }, [])

  const kategoriParam = searchParams.get('kategori')
  const activeCategory = resolveCategoryName(kategoriParam, categories)
  // Dari halaman Category: ?kategori=Cakes -> tampilkan semua seri di jenis makanan tersebut
  const activeGroup =
    activeCategory === ALL
      ? foodCategories.find(
          (group) => group.slug === kategoriParam || group.name === kategoriParam,
        )
      : null

  const handleCategoryChange = (name) => {
    if (name === ALL) {
      setSearchParams({})
    } else {
      setSearchParams({ kategori: name })
    }
  }

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return products.filter((product) => {
      const matchCategory = activeGroup
        ? activeGroup.series.includes(product.kategori)
        : activeCategory === ALL || product.kategori === activeCategory
      const matchSearch =
        !keyword ||
        product.nama.toLowerCase().includes(keyword) ||
        product.kategori.toLowerCase().includes(keyword) ||
        product.deskripsi.toLowerCase().includes(keyword)
      return matchCategory && matchSearch
    })
  }, [search, activeCategory, activeGroup, products])

  const activeCategoryName = activeGroup
    ? activeGroup.name
    : activeCategory === ALL
      ? 'All Products'
      : activeCategory

  return (
    <div className="katalog-page">
      <Navbar />

      <section className="katalog-hero">
        <div className="container">
          <div className="katalog-title-wrap">
            <h1 className="katalog-title display-font">
              <span className="katalog-mask">
                <span className="katalog-line katalog-line-1">All Our</span>
              </span>
              <span className="katalog-mask">
                <span className="katalog-line katalog-line-2 katalog-title-indent">Fresh Picks</span>
              </span>
            </h1>
            <span className="katalog-sticker display-font" aria-hidden="true">
              Catalog
            </span>
          </div>
          <p className="katalog-subtitle">
            Jelajahi semua kue, roti, dan pastry pilihan dari Kuki Bakehouse.
          </p>
          <div className="katalog-search">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Cari nama produk atau kategori..."
            />
          </div>
        </div>
      </section>

      <section className="section section-dark katalog-section">
        <div className="container">
          <div className="katalog-filter" role="group" aria-label="Filter kategori">
            <button
              type="button"
              className={`filter-pill ${activeCategory === ALL ? 'active' : ''}`}
              aria-pressed={activeCategory === ALL}
              onClick={() => handleCategoryChange(ALL)}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`filter-pill ${activeCategory === category.name ? 'active' : ''}`}
                aria-pressed={activeCategory === category.name}
                onClick={() => handleCategoryChange(category.name)}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="katalog-results-info">
            <h2 className="katalog-results-title display-font">{activeCategoryName}</h2>
            <span className="katalog-results-count" aria-live="polite">{filteredProducts.length} produk ditemukan</span>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="katalog-grid" key={activeCategory}>
              {filteredProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="katalog-item"
                  style={{ '--i': Math.min(index, 8) }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <div className="katalog-empty">
              <span className="empty-icon" aria-hidden="true"></span>
              <h3 className="display-font">No Products Found</h3>
              <p>Coba gunakan kata kunci lain atau pilih kategori berbeda.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setSearch('')
                  handleCategoryChange(ALL)
                }}
              >
                Reset pencarian
              </button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default KatalogPage
