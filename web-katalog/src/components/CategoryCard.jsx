import { useNavigate } from 'react-router-dom'
import './CategoryCard.css'

function CategoryCard({ category }) {
  const navigate = useNavigate()
  const image = category.image || category.gambar || category.img

  const handleClick = () => {
    navigate(`/katalog?kategori=${category.slug}`)
  }

  return (
    <button type="button" className="category-card" onClick={handleClick}>
      <div className="category-photo" aria-hidden="true">
        {image && <img src={image} alt="" loading="lazy" />}
      </div>
      <span className="category-pill">{category.name}</span>
    </button>
  )
}

export default CategoryCard
