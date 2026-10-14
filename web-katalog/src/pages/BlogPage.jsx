import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Reveal, SectionTitle, BlogTile } from '../components/PageKit'
import { blogPosts } from '../utils/mockData'
import './sections.css'

function BlogPage() {
  return (
    <div className="landing-page">
      <Navbar />

      <section id="blog" className="section section-cream page-section">
        <div className="container">
          <SectionTitle lines={['Blogs']} theme="cream" />
          <div className="blog-grid">
            {blogPosts.map((post, i) => (
              <Reveal key={post.id} delay={(i % 3) * 110} className="grid-item">
                <BlogTile post={post} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default BlogPage
