import { useState } from 'react'
import { ArrowLeftIcon, ArrowRightIcon, QuoteIcon } from './icons'
import { testimonials } from '../utils/mockData'

function TestimonialSection() {
  const [index, setIndex] = useState(0)
  const testimonial = testimonials[index]

  const move = (direction) => {
    setIndex((prev) => (prev + direction + testimonials.length) % testimonials.length)
  }

  return (
    <div className="testimonial-wrap">
      <button
        type="button"
        className="carousel-arrow testimonial-arrow"
        onClick={() => move(-1)}
        aria-label="Testimonial sebelumnya"
      >
        <ArrowLeftIcon />
      </button>
      <figure className="testimonial-card">
        <QuoteIcon className="testimonial-quote" width="48" height="48" />
        <blockquote className="testimonial-text">{testimonial.quote}</blockquote>
        <figcaption className="testimonial-author">
          <div className="testimonial-avatar" aria-hidden="true"></div>
          <div>
            <strong className="testimonial-name">{testimonial.name}</strong>
            <span className="testimonial-role">{testimonial.role}</span>
          </div>
        </figcaption>
      </figure>
      <button
        type="button"
        className="carousel-arrow testimonial-arrow"
        onClick={() => move(1)}
        aria-label="Testimonial berikutnya"
      >
        <ArrowRightIcon />
      </button>
    </div>
  )
}

export default TestimonialSection
