/**
 * Minimal non-destructive integration of the social section and Halal Indonesia
 * marks. DOES NOT overwrite existing Footer.jsx, sections.css, or other UI.
 * Usage: node scripts/apply-homepage.cjs "E:\\Ekosistem-kuki\\web-katalog"
 */
const fs = require('node:fs')
const path = require('node:path')

const root = process.argv[2]
if (!root) {
  console.error('Usage: node scripts/apply-homepage.cjs <web-katalog-path>')
  process.exit(1)
}

const file = path.join(root, 'src', 'pages', 'HomePage.jsx')
if (!fs.existsSync(file)) {
  console.error('HomePage.jsx tidak ditemukan:', file)
  process.exit(1)
}

const source = fs.readFileSync(file, 'utf8')
let content = source

// Terima markup badge lama (teks) dan badge dari patch V1 (gambar lokal).
// Jangan sentuh badge Since 2021 atau badge tiramisu.
const textHalalBadge = /<span\s+className="hero-badge display-font">(?:(?!<\/span>)[\s\S])*?\bHalal MUI\b(?:(?!<\/span>)[\s\S])*?<\/span>/
const imageHalalBadge = /<span\s+className="hero-badge hero-badge--halal"(?:(?!<\/span>)[\s\S])*?<\/span>/
const alreadyUsesComponent = content.includes('<HalalIndonesiaLogo className="kuki-halal-logo--hero"')
if (!alreadyUsesComponent && !textHalalBadge.test(content) && !imageHalalBadge.test(content)) {
  console.error('Badge Halal tidak sesuai acuan. File tidak diubah. Periksa patch manual di docs/HOMEPAGE_PATCH.md')
  process.exit(1)
}

if (!content.includes('HalalIndonesiaLogo')) {
  content = content.replace(
    "import Footer from '../components/Footer'",
    "import Footer from '../components/Footer'\nimport HalalIndonesiaLogo from '../components/HalalIndonesiaLogo'",
  )
}
if (!content.includes('KukiSocialLinks')) {
  content = content.replace(
    "import Footer from '../components/Footer'",
    "import Footer from '../components/Footer'\nimport KukiSocialLinks from '../components/KukiSocialLinks'",
  )
}
if (!content.includes('KukiFooterHalal')) {
  content = content.replace(
    "import Footer from '../components/Footer'",
    "import Footer from '../components/Footer'\nimport KukiFooterHalal from '../components/KukiFooterHalal'",
  )
}

if (!alreadyUsesComponent) {
  const badge = '<span className="hero-badge hero-badge--halal" aria-label="Label Halal Indonesia">\n' +
    '              <HalalIndonesiaLogo className="kuki-halal-logo--hero" priority />\n' +
    '            </span>'
  content = content.replace(textHalalBadge, badge).replace(imageHalalBadge, badge)
}

if (!content.includes('<KukiSocialLinks')) {
  content = content.replace('<Footer />', '<KukiSocialLinks />\n\n      <Footer />')
}
if (!content.includes('<KukiFooterHalal')) {
  content = content.replace('<Footer />', '<Footer />\n      <KukiFooterHalal />')
}

if (source === content) {
  console.log('Tidak ada perubahan: patch sudah terpasang.')
  process.exit(0)
}

// Pastikan semua integrasi terpasang sebelum menulis file.
const required = [
  "from '../components/HalalIndonesiaLogo'",
  "from '../components/KukiSocialLinks'",
  "from '../components/KukiFooterHalal'",
  '<HalalIndonesiaLogo', '<KukiSocialLinks', '<KukiFooterHalal',
]
if (!required.every((text) => content.includes(text))) {
  console.error('Pola source berbeda. File tidak diubah. Gunakan instruksi manual.')
  process.exit(1)
}

const backup = `${file}.backup-before-halal-v2`
if (!fs.existsSync(backup)) fs.copyFileSync(file, backup)
fs.writeFileSync(file, content, 'utf8')
console.log('Patch terpasang ke:', file)
console.log('Backup asli:', backup)
