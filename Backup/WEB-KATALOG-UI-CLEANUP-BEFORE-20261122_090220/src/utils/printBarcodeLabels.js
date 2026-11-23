import { encodeCode128B } from './code128'

export const BATAS_CETAK_LABEL = 500

// Satuan milimeter, bukan CSS px. Code 128 B internal, BUKAN EAN-13.
export const UKURAN_LABEL = [
  { id: '30x15', lebar: 30, tinggi: 15, nama: '30 × 15 mm — kecil' },
  { id: '40x20', lebar: 40, tinggi: 20, nama: '40 × 20 mm — plastik OPP' },
  { id: '60x25', lebar: 60, tinggi: 25, nama: '60 × 25 mm — label serbaguna' },
  { id: '70x30', lebar: 70, tinggi: 30, nama: '70 × 30 mm — box cake' },
  { id: '80x35', lebar: 80, tinggi: 35, nama: '80 × 35 mm — kode panjang' },
]

export const MODE_CETAK = [
  { id: 'stiker', nama: 'Printer label / ukuran asli' },
  { id: 'a4', nama: 'Lembar A4 — susun banyak stiker' },
]

// 0.254mm = kira-kira dua dot pada printer termal 203dpi.
// Mode 0.20mm lebih ringkas tetapi harus diuji dengan scanner fisik.
export const KERAPATAN = [
  { id: 'normal', nama: 'Normal (0,254 mm / modul)', x: 0.254 },
  { id: 'ringkas', nama: 'Ringkas (0,20 mm / modul)', x: 0.2 },
]

const MARGIN_X_MM = 1.5 // margin fisik DI LUAR quiet zone yang sudah ada di encoder

const cariUkuran = (id) => UKURAN_LABEL.find((item) => item.id === id) || UKURAN_LABEL[3]
const cariKerapatan = (id) => KERAPATAN.find((item) => item.id === id) || KERAPATAN[0]
const mm = (angka) => Number(angka).toFixed(3)
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]))

/**
 * Pemeriksaan ukuran aktual. Jangan semata-mata mengecilkan SVG:
 * lebar bar terhalus harus tetap cukup untuk scanner.
 */
export function analisisLabel(barcode, ukuranId = '70x30', kerapatanId = 'normal') {
  const hasil = encodeCode128B(barcode)
  const ukuran = cariUkuran(ukuranId)
  const kerapatan = cariKerapatan(kerapatanId)

  if (hasil.error) return { error: hasil.error, ukuran, kerapatan }

  const lebarBarcodeMm = hasil.width * kerapatan.x
  const lebarDibutuhkanMm = lebarBarcodeMm + 2 * MARGIN_X_MM
  const muat = lebarDibutuhkanMm <= ukuran.lebar
  const pilihanCocok = UKURAN_LABEL.filter((item) => item.lebar >= lebarDibutuhkanMm)

  return {
    hasil, ukuran, kerapatan, muat, lebarBarcodeMm, lebarDibutuhkanMm,
    pilihanCocok,
    error: muat ? '' :
      `Barcode ${hasil.text.length} karakter membutuhkan setidaknya ${lebarDibutuhkanMm.toFixed(1)} mm pada kerapatan ini. Pilih label yang lebih lebar atau gunakan SKU lebih singkat.`,
  }
}

function renderLabel(analisis, productName) {
  const { hasil, ukuran, lebarBarcodeMm } = analisis
  const tinggiBatangMm = Math.max(5.5, ukuran.tinggi - 10)
  const nama = escapeHtml(productName?.trim() || 'Kuki Bakehouse')
  const kode = escapeHtml(hasil.text)

  const bars = hasil.bars.map((bar) =>
    `<rect x="${bar.x}" y="0" width="${bar.width}" height="80" fill="#000"/>`
  ).join('')

  return `<article class="label" style="--label-w:${mm(ukuran.lebar)}mm;--label-h:${mm(ukuran.tinggi)}mm">
    <div class="nama">${nama}</div>
    <svg class="bars" xmlns="http://www.w3.org/2000/svg"
      width="${mm(lebarBarcodeMm)}mm" height="${mm(tinggiBatangMm)}mm"
      viewBox="0 0 ${hasil.width} 80" preserveAspectRatio="none" role="img"
      aria-label="Code 128 ${kode}">
      <rect x="0" y="0" width="${hasil.width}" height="80" fill="#fff"/>
      ${bars}
    </svg>
    <div class="kode">${kode}</div>
  </article>`
}

function buatHalamanA4(labelMarkup, jumlah, ukuran) {
  const margin = 5
  const gap = 1
  const kolom = Math.max(1, Math.floor((210 - 2 * margin + gap) / (ukuran.lebar + gap)))
  const baris = Math.max(1, Math.floor((297 - 2 * margin + gap) / (ukuran.tinggi + gap)))
  const kapasitas = kolom * baris
  let sisa = jumlah
  const halaman = []

  while (sisa > 0) {
    const cetak = Math.min(kapasitas, sisa)
    halaman.push(`<main class="a4-sheet" style="--cols:${kolom};--label-w:${mm(ukuran.lebar)}mm;--label-h:${mm(ukuran.tinggi)}mm">
      ${labelMarkup.repeat(cetak)}</main>`)
    sisa -= cetak
  }

  return { markup: halaman.join(''), kapasitas, kolom, baris }
}

/** Dicall langsung ketika user klik tombol Cetak (popup blocker-friendly). */
export function cetakLabelBarcode({
  barcode,
  productName,
  ukuranId = '70x30',
  kerapatanId = 'normal',
  media = 'stiker',
  jumlah = 1,
}) {
  const info = analisisLabel(barcode, ukuranId, kerapatanId)
  if (info.error) return { error: info.error }

  const copies = Number(jumlah)
  if (!Number.isSafeInteger(copies) || copies < 1 || copies > BATAS_CETAK_LABEL) {
    return { error: `Jumlah label harus bilangan bulat 1–${BATAS_CETAK_LABEL}.` }
  }
  const isA4 = media === 'a4'
  const label = renderLabel(info, productName)
  const halaman = isA4 ? buatHalamanA4(label, copies, info.ukuran) : null
  const markup = isA4 ? halaman.markup : label.repeat(copies)
  const cssPageSize = isA4 ? 'A4 portrait' : `${info.ukuran.lebar}mm ${info.ukuran.tinggi}mm`

  const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8" />
<title>Label ${escapeHtml(barcode)}</title>
<style>
  @page { size: ${cssPageSize}; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: Arial, sans-serif; }
  .label {
    width: var(--label-w); height: var(--label-h); background: #fff;
    padding: 0.8mm ${mm(MARGIN_X_MM)}mm;
    overflow: hidden; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 0.25mm;
    break-inside: avoid; page-break-inside: avoid;
    border: none;
  }
  .nama { max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    text-align: center; font-weight: 700; font-size: 7pt; line-height: 1.15; }
  .bars { display: block; max-width: none; flex-shrink: 0; image-rendering: pixelated; }
  .kode { font-family: monospace; text-align: center; font-size: 6.8pt;
    white-space: nowrap; letter-spacing: -0.1px; }
  .a4-sheet { width: 210mm; height: 297mm; padding: 5mm;
    display: grid; grid-template-columns: repeat(var(--cols), var(--label-w));
    grid-auto-rows: var(--label-h); gap: 1mm; align-content: start;
    break-after: page; page-break-after: always; }
  .a4-sheet:last-child { break-after: auto; page-break-after: auto; }
  @media screen {
    body { background: #eee; }
    .label { box-shadow: 0 0 0 1px #ddd; }
    .a4-sheet { background: white; margin: 10px auto; box-shadow: 0 1px 6px #888; }
  }
</style></head>
<body>${markup}
<script>
 window.addEventListener('load', function(){
   setTimeout(function(){ window.focus(); window.print(); }, 250);
 });
</script>
</body></html>`

  const popup = window.open('', '_blank', 'width=980,height=720')
  if (!popup) return { error: 'Pop-up diblokir browser. Izinkan pop-up untuk aplikasi ini lalu coba lagi.' }
  popup.document.open()
  popup.document.write(html)
  popup.document.close()
  return { error: '', kapasitasA4: halaman?.kapasitas ?? null }
}
