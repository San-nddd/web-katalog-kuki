import { ArrowRightIcon } from './icons'
import './BlogCard.css'

function BlogCard({ post }) {
  return (
    <article className="blog-card">
      <div className="blog-card-image" aria-hidden="true"></div>
      <div className="blog-card-body">
        <div className="blog-card-meta">
          <span className="blog-card-tag">{post.tag}</span>
          <span className="blog-card-date">{post.date}</span>
        </div>
        <h3 className="blog-card-title">{post.title}</h3>
        <button type="button" className="blog-card-btn">
          View Details <ArrowRightIcon width="15" height="15" />
        </button>
      </div>
    </article>
  )
}

export default BlogCard
