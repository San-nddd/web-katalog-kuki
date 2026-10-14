import './SectionHeading.css'

function SectionHeading({ label, lines, theme = 'cream', align = 'center' }) {
  const headingClass = theme === 'dark' ? 'heading-orange' : 'heading-dark'
  return (
    <div className={`section-heading align-${align}`}>
      <span className={`sticker ${theme === 'dark' ? 'sticker--cream' : ''}`}>{label}</span>
      <h2 className={`section-heading-title display-font ${headingClass}`}>
        {lines.map((line, index) => (
          <span key={line} className={index % 2 === 1 ? 'line-indent' : ''}>
            {line}
          </span>
        ))}
      </h2>
    </div>
  )
}

export default SectionHeading
