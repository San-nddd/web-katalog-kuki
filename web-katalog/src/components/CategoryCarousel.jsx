import { useRef } from 'react'
import CategoryCard from './CategoryCard'
import { ArrowLeftIcon, ArrowRightIcon } from './icons'
import { categories } from '../utils/mockData'

function CategoryCarousel() {
  const trackRef = useRef(null)

  const scroll = (direction) => {
    trackRef.current?.scrollBy({ left: direction * 240, behavior: 'smooth' })
  }

  return (
    <div className="category-carousel">
      <button
        type="button"
        className="carousel-arrow"
        onClick={() => scroll(-1)}
        aria-label="Kategori sebelumnya"
      >
        <ArrowLeftIcon />
      </button>
      <div className="category-track" ref={trackRef}>
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
      <button
        type="button"
        className="carousel-arrow"
        onClick={() => scroll(1)}
        aria-label="Kategori berikutnya"
      >
        <ArrowRightIcon />
      </button>
    </div>
  )
}

export default CategoryCarousel
