// Kuki Bakehouse — Ekspor laporan ke Excel (.xlsx) dan PDF (.pdf).
// Memakai endpoint CSV yang SUDAH ADA untuk mendapatkan SEMUA mutasi dalam periode.
// Tidak ada perubahan data server / database dari proses ekspor ini.
import { API_BASE_URL, getToken } from './api'
import logoKukiUrl from '../assets/Kuki.png'

const NAMA_JENIS = {
  stok_awal: 'Stok awal', produksi: 'Produksi', koreksi: 'Koreksi stok',
  opname: 'Stock opname', rusak: 'Barang rusak', kedaluwarsa: 'Kedaluwarsa',
}
const PALET = {
  gelap: '302923', cokelat: '73583D', aksen: 'B18C64',
  latar: 'F6F3EF', garis: 'DED7CF', putih: 'FFFFFF',
  sunting: 'FFF3D4', teks: '252525', hijau: '27734D',
}
const limitBaris = 20000 // Pengamanan memori browser, bukan limit di server.

async function bacaLogoKuki() {
  const response = await fetch(logoKukiUrl)
  if (!response.ok) throw new Error(`Logo Kuki gagal dimuat (HTTP ${response.status}).`)
  const blob = await response.blob()
  const reader = new FileReader()
  const dataUrl = await new Promise((resolve, reject) => {
    reader.onerror = () => reject(new Error('Logo Kuki tidak dapat dibaca untuk ekspor.'))
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Format logo Kuki tidak valid untuk ekspor.'))
        return
      }
      resolve(reader.result)
    }
    reader.readAsDataURL(blob)
  })
  return dataUrl
}

function periodeParams(mulai, selesai) {
  const q = new URLSearchParams()
  if (mulai) q.set('tanggal_mulai', mulai)
  if (selesai) q.set('tanggal_selesai', selesai)
  return q.toString()
}

// Parser CSV RFC4180 sederhana: menangani titik-koma, kutip ganda,
// kutip ganda escape (""), serta isi sel yang memiliki baris baru.
export function parseKukiCsv(teks) {
  const sumber = String(teks || '').replace(/^\uFEFF/, '')
  const rows = []
  let row = []
  let value = ''
  let dikutip = false
  for (let i = 0; i < sumber.length; i += 1) {
    const ch = sumber[i]
    if (ch === '"') {
      if (dikutip && sumber[i + 1] === '"') {
        value += '"'
        i += 1
      } else {
        dikutip = !dikutip
      }
    } else if (ch === ';' && !dikutip) {
      row.push(value)
      value = ''
    } else if ((ch === '\n' || ch === '\r') && !dikutip) {
      if (ch === '\r' && sumber[i + 1] === '\n') i += 1
      row.push(value)
      if (row.some((field) => field !== '')) rows.push(row)
      row = []
      value = ''
    } else {
      value += ch
    }
  }
  if (dikutip) throw new Error('CSV laporan tidak valid: ada tanda kutip yang belum tertutup.')
  row.push(value)
  if (row.some((field) => field !== '')) rows.push(row)
  return rows
}

function menjadiMutasi(rows) {
  const headerIdx = rows.findIndex((baris) =>
    baris[0]?.trim() === 'Waktu' && baris[1]?.trim() === 'Produk' && baris[2]?.trim() === 'SKU',
  )
  if (headerIdx < 0) throw new Error('Format CSV dari server belum sesuai dengan Laporan Inventaris.')
  const hasil = rows.slice(headerIdx + 1)
    .filter((r) => r.length >= 9 && r[0])
    .map((r, i) => ({
      nomor: i + 1,
      waktu: r[0] || '', produk: r[1] || '', sku: r[2] || '',
      jenis: NAMA_JENIS[r[3]] || r[3] || '',
      perubahan: Number(r[4]) || 0,
      sebelum: Number(r[5]) || 0,
      sesudah: Number(r[6]) || 0,
      alasan: r[7] || '', petugas: r[8] || '',
    }))
  if (hasil.length > limitBaris) {
    throw new Error(`Data melebihi ${limitBaris.toLocaleString('id-ID')} baris. Perkecil rentang tanggal untuk ekspor.`)
  }
  return hasil
}

async function bacaSeluruhMutasi(mulai, selesai) {
  const token = getToken()
  if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.')
  const params = periodeParams(mulai, selesai)
  let response
  try {
    response = await fetch(`${API_BASE_URL}/management/laporan-inventaris/export${params ? `?${params}` : ''}`, {
      headers: { Accept: 'application/json, text/csv', Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new Error('Tidak dapat menghubungi server Laravel untuk mengekspor laporan.')
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    throw new Error(detail?.message || `Gagal mengambil data ekspor (HTTP ${response.status}).`)
  }
  const teks = await response.text()
  return menjadiMutasi(parseKukiCsv(teks))
}

function unduhBlob(blob, nama) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nama
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30000)
}

function namaBerkas(laporan, tipe) {
  const { mulai, selesai } = laporan.periode
  return `Kuki-Laporan-Inventaris_${mulai}_${selesai}.${tipe}`
}

function selTeks(cell, { bold = false, color = PALET.teks, size = 10 } = {}) {
  cell.font = { name: 'Aptos', size, bold, color: { argb: `FF${color}` } }
  cell.alignment = { vertical: 'middle', wrapText: true }
}
function garisBawah(cell, color = PALET.garis) {
  cell.border = { bottom: { style: 'hair', color: { argb: `FF${color}` } } }
}
function judulSheet(sheet, lastCol, judul, subjudul, logoId) {
  const lastColNumber = sheet.getColumn(lastCol).number
  const titleEndCol = String.fromCharCode(64 + lastColNumber - 1)
  sheet.mergeCells(`A1:${titleEndCol}2`)
  sheet.getCell('A1').value = judul
  sheet.getCell('A1').font = { name: 'Aptos Display', size: 18, bold: true, color: { argb: `FF${PALET.putih}` } }
  sheet.getCell('A1').alignment = { vertical: 'middle', indent: 1 }
  for (let row = 1; row <= 2; row += 1) {
    sheet.getRow(row).height = row === 1 ? 23 : 18
    for (let i = 1; i <= sheet.columnCount; i += 1) {
      sheet.getRow(row).getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${PALET.gelap}` } }
    }
  }
  sheet.mergeCells(`A3:${lastCol}3`)
  sheet.getCell('A3').value = subjudul
  sheet.getRow(3).height = 24
  sheet.getCell('A3').font = { name: 'Aptos', size: 10, color: { argb: `FF${PALET.cokelat}` } }
  sheet.getCell('A3').alignment = { vertical: 'middle', indent: 1 }
  sheet.addImage(logoId, {
    tl: { col: lastColNumber - 1, row: 0.1 },
    ext: { width: 42, height: 42 },
  })
}

function hiasTabel(sheet, headerRow, endRow, cols, inputColumns = []) {
  const hdr = sheet.getRow(headerRow)
  hdr.height = 34
  for (let i = 1; i <= cols; i += 1) {
    const cell = hdr.getCell(i)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${PALET.cokelat}` } }
    selTeks(cell, { bold: true, color: PALET.putih, size: 10 })
    cell.alignment = { vertical: 'middle', wrapText: true, indent: 1 }
  }
  for (let n = headerRow + 1; n <= endRow; n += 1) {
    const row = sheet.getRow(n)
    row.height = 24
    for (let c = 1; c <= cols; c += 1) {
      const cell = row.getCell(c)
      selTeks(cell, { size: 10 })
      const color = inputColumns.includes(c) ? PALET.sunting : n % 2 ? PALET.putih : PALET.latar
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${color}` } }
      garisBawah(cell)
    }
  }
  // Excel filter pada tabel asli, baris kepala dikunci agar tetap terlihat.
  sheet.views = [{ state: 'frozen', ySplit: headerRow, showGridLines: false }]
  sheet.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  sheet.printTitleRows = `${headerRow}:${headerRow}`
}

function tambahTabel(sheet, nama, ref, kepala, rows) {
  sheet.addTable({
    name: nama, ref,
    headerRow: true, totalsRow: false,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: kepala.map((name) => ({ name })),
    rows,
  })
}

export async function downloadLaporanInventarisExcel(laporan) {
  if (!laporan?.periode) throw new Error('Muat laporan terlebih dahulu sebelum ekspor.')
  const mutasi = await bacaSeluruhMutasi(laporan.periode.mulai, laporan.periode.selesai)
  const exceljsModule = await import('exceljs')
  const ExcelJS = exceljsModule.default || exceljsModule
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Kuki Bakehouse'
  workbook.title = 'Laporan Inventaris Kuki Bakehouse'
  workbook.subject = 'Ringkasan dan riwayat mutasi stok'
  workbook.calcProperties.fullCalcOnLoad = true
  const logoId = workbook.addImage({ base64: await bacaLogoKuki(), extension: 'png' })

  // Sheet 1: ringkasan resmi. Angka mengambil API laporan, bukan hitung ganda dari CSV.
  const ringkasan = workbook.addWorksheet('Ringkasan', { views: [{ showGridLines: false }] })
  ringkasan.columns = [
    { width: 25 }, { width: 20 }, { width: 20 }, { width: 19 },
    { width: 20 }, { width: 19 }, { width: 19 }, { width: 16 },
  ]
  judulSheet(ringkasan, 'H', 'KUKI  /  LAPORAN INVENTARIS', `Periode ${laporan.periode.mulai} s.d. ${laporan.periode.selesai}  •  Stok terkini & aktivitas periode`, logoId)
  ringkasan.mergeCells('A5:D5')
  ringkasan.getCell('A5').value = 'INDIKATOR UTAMA'
  selTeks(ringkasan.getCell('A5'), { bold: true, color: PALET.cokelat })
  const metrik = [
    ['Stok saat ini (pcs)', laporan.stok_saat_ini.unit],
    ['Jenis produk', laporan.stok_saat_ini.jumlah_produk],
    ['Mutasi masuk (pcs)', laporan.mutasi.masuk],
    ['Mutasi keluar (pcs)', laporan.mutasi.keluar],
    ['Produksi (pcs)', laporan.produksi.jumlah],
    ['Opname selesai (sesi)', laporan.opname_selesai],
    ['Produk kritis', laporan.stok_saat_ini.kritis],
    ['Produk habis', laporan.stok_saat_ini.habis],
  ]
  metrik.forEach(([label, value], i) => {
    const r = i + 6
    ringkasan.mergeCells(`A${r}:C${r}`)
    ringkasan.getCell(`A${r}`).value = label
    ringkasan.getCell(`D${r}`).value = Number(value) || 0
    ringkasan.getCell(`D${r}`).numFmt = '#,##0'
    ringkasan.getRow(r).height = 23
    ;[1, 2, 3, 4].forEach((col) => {
      const cell = ringkasan.getRow(r).getCell(col)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${r % 2 ? PALET.putih : PALET.latar}` } }
      garisBawah(cell)
      selTeks(cell, { bold: col === 4, size: 11 })
    })
  })
  ringkasan.mergeCells('A16:H16')
  ringkasan.getCell('A16').value = 'RINCIAN MUTASI PER JENIS'
  selTeks(ringkasan.getCell('A16'), { bold: true, color: PALET.cokelat })
  const jenis = (laporan.mutasi.berdasarkan_jenis || []).map((x) => [NAMA_JENIS[x.jenis] || x.jenis, Number(x.kejadian) || 0, Number(x.masuk) || 0, Number(x.keluar) || 0])
  ringkasan.getCell('A18').value = 'Jenis'
  ringkasan.getCell('B18').value = 'Kejadian'
  ringkasan.getCell('C18').value = 'Masuk'
  ringkasan.getCell('D18').value = 'Keluar'
  hiasTabel(ringkasan, 18, 18 + jenis.length, 4)
  jenis.forEach((values, i) => {
    const row = ringkasan.getRow(19 + i)
    values.forEach((v, j) => { row.getCell(j + 1).value = v; if (j) row.getCell(j + 1).numFmt = '#,##0' })
  })
  const catatanRow = Math.max(20, 20 + jenis.length)
  ringkasan.mergeCells(`A${catatanRow}:H${catatanRow + 1}`)
  const catatan = ringkasan.getCell(`A${catatanRow}`)
  catatan.value = 'CATATAN: Stok saat ini adalah posisi saat laporan dibuka, bukan saldo historis periode. Angka produksi sudah masuk dalam mutasi masuk. Perubahan pada file Excel TIDAK memperbarui stok di aplikasi; koreksi resmi dibuat melalui menu Riwayat Mutasi Stok atau Stock Opname oleh Admin.'
  catatan.font = { name: 'Aptos', size: 10, italic: true, color: { argb: `FF${PALET.cokelat}` } }
  catatan.alignment = { wrapText: true, vertical: 'middle', indent: 1 }
  ringkasan.getRow(catatanRow).height = 24
  ringkasan.getRow(catatanRow + 1).height = 24
  ringkasan.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1 }

  // Sheet 2: riwayat lengkap, bukan hanya 100 baris di halaman.
  const mutasiSheet = workbook.addWorksheet('Riwayat Mutasi')
  mutasiSheet.columns = [
    { width: 9 }, { width: 21 }, { width: 37 }, { width: 23 },
    { width: 19 }, { width: 17 }, { width: 17 }, { width: 17 },
    { width: 46 }, { width: 23 },
  ]
  judulSheet(mutasiSheet, 'J', 'KUKI  /  RIWAYAT MUTASI STOK', `Periode ${laporan.periode.mulai} s.d. ${laporan.periode.selesai}  •  ${mutasi.length.toLocaleString('id-ID')} transaksi mutasi`, logoId)
  mutasiSheet.mergeCells('A5:J5')
  mutasiSheet.getCell('A5').value = 'Sumber: database Kuki Bakehouse • Kolom-kolom dapat diedit sebagai salinan laporan, bukan transaksi database.'
  selTeks(mutasiSheet.getCell('A5'), { color: PALET.cokelat })
  const mutasiHeader = ['No.', 'Waktu', 'Produk', 'SKU / Barcode', 'Jenis mutasi', 'Perubahan (pcs)', 'Stok sebelum', 'Stok sesudah', 'Alasan / Catatan', 'Petugas']
  const mutasiRows = mutasi.map((m) => [m.nomor, m.waktu, m.produk, m.sku, m.jenis, m.perubahan, m.sebelum, m.sesudah, m.alasan, m.petugas])
  tambahTabel(mutasiSheet, 'TabelRiwayatMutasiKuki', 'A7', mutasiHeader, mutasiRows)
  hiasTabel(mutasiSheet, 7, 7 + mutasi.length, 10)
  mutasiSheet.getColumn('A').numFmt = '#,##0'
  ;['F', 'G', 'H'].forEach((col) => { mutasiSheet.getColumn(col).numFmt = '#,##0;[Red](#,##0);–' })
  mutasiSheet.printOptions = { horizontalCentered: true }

  // Sheet 3: formulir usulan koreksi DI EXCEL, dengan kalkulasi selisih otomatis.
  // Catatan historis tidak boleh diam-diam diubah di server.
  const koreksiSheet = workbook.addWorksheet('Usulan Koreksi')
  koreksiSheet.columns = [
    { width: 9 }, { width: 22 }, { width: 37 }, { width: 23 },
    { width: 20 }, { width: 22 }, { width: 18 }, { width: 45 }, { width: 22 },
  ]
  judulSheet(koreksiSheet, 'I', 'KUKI  /  USULAN KOREKSI', 'Kolom kuning dapat diisi • Tidak mengubah database Kuki otomatis', logoId)
  koreksiSheet.mergeCells('A5:I5')
  koreksiSheet.getCell('A5').value = 'Isi Perubahan Usulan dan Alasan. Selisih dihitung otomatis. Untuk koreksi resmi, Admin wajib mencatat koreksi stok melalui aplikasi.'
  selTeks(koreksiSheet.getCell('A5'), { color: PALET.cokelat, size: 10 })
  const koreksiHeader = ['No.', 'Waktu mutasi', 'Produk', 'SKU', 'Perubahan tercatat', 'Perubahan usulan*', 'Selisih', 'Alasan koreksi*', 'Status catatan*']
  const koreksiRows = mutasi.map((m) => [m.nomor, m.waktu, m.produk, m.sku, m.perubahan, null, null, null, 'Belum ditinjau'])
  tambahTabel(koreksiSheet, 'TabelUsulanKoreksiKuki', 'A7', koreksiHeader, koreksiRows)
  hiasTabel(koreksiSheet, 7, 7 + mutasi.length, 9, [6, 8, 9])
  for (let i = 0; i < mutasi.length; i += 1) {
    const r = i + 8
    koreksiSheet.getCell(`G${r}`).value = { formula: `IF(ISNUMBER(F${r}),F${r}-E${r},"")` }
    koreksiSheet.getCell(`G${r}`).numFmt = '#,##0;[Red](#,##0);–'
    koreksiSheet.getCell(`F${r}`).numFmt = '#,##0;[Red](#,##0);–'
    koreksiSheet.getCell(`E${r}`).numFmt = '#,##0;[Red](#,##0);–'
    koreksiSheet.getCell(`F${r}`).dataValidation = {
      type: 'whole', operator: 'between', formulae: [-1000000000, 1000000000],
      allowBlank: true, showErrorMessage: true, errorTitle: 'Angka tidak valid',
      error: 'Isi perubahan dengan angka bulat (boleh negatif).',
    }
    koreksiSheet.getCell(`I${r}`).dataValidation = {
      type: 'list', allowBlank: false,
      formulae: ['"Belum ditinjau,Perlu koreksi,Sudah dicatat"'],
    }
  }
  koreksiSheet.getColumn('A').numFmt = '#,##0'
  koreksiSheet.mergeCells(`A${9 + mutasi.length}:I${10 + mutasi.length}`)
  const catatanKoreksi = koreksiSheet.getCell(`A${9 + mutasi.length}`)
  catatanKoreksi.value = 'PENTING: Sheet ini untuk usulan / dokumentasi, bukan alat mengganti histori mutasi atau stok produk. Koreksi yang benar harus dicatat sebagai transaksi koreksi baru melalui halaman Admin; riwayat asli tetap dipertahankan.'
  catatanKoreksi.alignment = { wrapText: true, vertical: 'middle' }
  catatanKoreksi.font = { name: 'Aptos', size: 10, italic: true, color: { argb: `FF${PALET.cokelat}` } }
  koreksiSheet.getRow(9 + mutasi.length).height = 26
  koreksiSheet.getRow(10 + mutasi.length).height = 24

  const buffer = await workbook.xlsx.writeBuffer()
  unduhBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), namaBerkas(laporan, 'xlsx'))
  return mutasi.length
}

function bersihPdf(teks) {
  // Font bawaan jsPDF mendukung Latin-1; singkirkan karakter kontrol/non-Latin-1.
  return String(teks ?? '').replace(/[\r\n\t]+/g, ' ').replace(/[\u2010-\u2015]/g, '-')
    .replace(/\u2022/g, '-').replace(/[^\x20-\x7e\u00a0-\u00ff]/g, '?')
}

const fmtAngka = (n) => (Number(n) || 0).toLocaleString('id-ID')
const waktuCetak = () => new Date().toLocaleString('id-ID', {
  timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
}) + ' WIB'

/** Download PDF formal, bukan print halaman React / sidebar. */
export async function downloadLaporanInventarisPdf(laporan) {
  if (!laporan?.periode) throw new Error('Muat laporan terlebih dahulu sebelum ekspor.')
  const mutasi = await bacaSeluruhMutasi(laporan.periode.mulai, laporan.periode.selesai)
  const logoKuki = await bacaLogoKuki()
  const [jspdfModule, autotableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const JsPDF = jspdfModule.jsPDF || jspdfModule.default?.jsPDF || jspdfModule.default
  const autoTable = autotableModule.autoTable || autotableModule.default
  if (typeof JsPDF !== 'function' || typeof autoTable !== 'function') {
    throw new Error('Modul PDF tidak dapat dimuat. Periksa instalasi jspdf dan jspdf-autotable.')
  }
  const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
  doc.setProperties({ title: 'Ringkasan Inventaris - Kuki Bakehouse', author: 'Kuki Bakehouse' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const L = 12
  const primer = [48, 41, 35]
  const sekunder = [103, 94, 85]
  const garis = [213, 207, 199]
  const paletHeader = [73, 62, 52]
  const muda = [249, 247, 244]
  const sejak = `${laporan.periode.mulai} sampai ${laporan.periode.selesai}`
  const kini = waktuCetak()
  const formatTabel = {
    margin: { left: L, right: L, top: 30, bottom: 19 },
    theme: 'grid',
    styles: {
      font: 'helvetica', fontSize: 7.8, cellPadding: 2.1, valign: 'middle',
      overflow: 'linebreak', textColor: primer, lineColor: garis, lineWidth: 0.1,
    },
    headStyles: { fillColor: paletHeader, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: muda },
  }

  doc.setTextColor(...primer)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text('RINGKASAN INVENTARIS', L, 35)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...sekunder)
  doc.text(`Periode: ${sejak}`, L, 41)
  doc.text('Dokumen internal - laporan operasional stok, bukan laporan keuangan.', W - L, 41, { align: 'right' })

  const ringkasan = [
    ['Jenis produk', fmtAngka(laporan.stok_saat_ini.jumlah_produk), 'Stok fisik saat ini (pcs)', fmtAngka(laporan.stok_saat_ini.unit)],
    ['Mutasi masuk (pcs)', fmtAngka(laporan.mutasi.masuk), 'Mutasi keluar (pcs)', fmtAngka(laporan.mutasi.keluar)],
    ['Produksi tercatat (pcs)', fmtAngka(laporan.produksi.jumlah), 'Opname selesai', `${fmtAngka(laporan.opname_selesai)} sesi`],
    ['Produk stok kritis', fmtAngka(laporan.stok_saat_ini.kritis), 'Produk stok habis', fmtAngka(laporan.stok_saat_ini.habis)],
  ]
  autoTable(doc, {
    ...formatTabel,
    startY: 47,
    body: ringkasan,
    theme: 'grid',
    styles: { ...formatTabel.styles, fontSize: 8.1, cellPadding: 2.7 },
    columnStyles: { 0: { cellWidth: 57, fontStyle: 'bold' }, 1: { cellWidth: 36, halign: 'right' }, 2: { cellWidth: 57, fontStyle: 'bold' }, 3: { halign: 'right' } },
  })
  let y = (doc.lastAutoTable?.finalY || 91) + 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...primer)
  doc.text('RINGKASAN PER JENIS MUTASI', L, y)
  y += 3
  const jenis = (laporan.mutasi.berdasarkan_jenis || []).map((r) => [
    bersihPdf(NAMA_JENIS[r.jenis] || r.jenis), fmtAngka(r.kejadian), fmtAngka(r.masuk), fmtAngka(r.keluar),
  ])
  autoTable(doc, {
    ...formatTabel,
    startY: y + 2,
    head: [['Jenis mutasi', 'Jumlah kejadian', 'Masuk (pcs)', 'Keluar (pcs)']],
    body: jenis.length ? jenis : [['Tidak ada mutasi pada periode ini', '-', '-', '-']],
    columnStyles: { 0: { cellWidth: 95 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
  })

  y = (doc.lastAutoTable?.finalY || y) + 10
  if (y > H - 38) { doc.addPage(); y = 37 }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...primer)
  doc.text(`RIWAYAT MUTASI STOK (${fmtAngka(mutasi.length)} BARIS)`, L, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.8)
  doc.setTextColor(...sekunder)
  doc.text('Koreksi stok harus dicatat melalui aplikasi; data asli tidak boleh ditimpa.', L, y + 5)
  const body = mutasi.map((r) => [
    bersihPdf(r.waktu), bersihPdf(r.produk), bersihPdf(r.sku || '-'), bersihPdf(r.jenis),
    `${r.perubahan > 0 ? '+' : ''}${fmtAngka(r.perubahan)}`, fmtAngka(r.sebelum), fmtAngka(r.sesudah),
    bersihPdf(r.alasan || '-'), bersihPdf(r.petugas),
  ])
  autoTable(doc, {
    ...formatTabel,
    startY: y + 9,
    head: [['Waktu', 'Produk', 'SKU', 'Jenis', '+/- pcs', 'Stok awal', 'Stok akhir', 'Keterangan', 'Petugas']],
    body: body.length ? body : [['-', 'Tidak ada mutasi', '-', '-', '-', '-', '-', '-', '-']],
    styles: { ...formatTabel.styles, fontSize: 7.15, cellPadding: 1.7 },
    columnStyles: {
      0: { cellWidth: 27 }, 1: { cellWidth: 40 }, 2: { cellWidth: 29 },
      3: { cellWidth: 24 }, 4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 19, halign: 'right' }, 6: { cellWidth: 19, halign: 'right' },
      7: { cellWidth: 73 }, 8: { cellWidth: 24 },
    },
  })

  // Kop sederhana & nomor halaman, ditambahkan terakhir agar konsisten pada setiap halaman.
  const jumlahHalaman = doc.internal.getNumberOfPages()
  for (let halaman = 1; halaman <= jumlahHalaman; halaman += 1) {
    doc.setPage(halaman)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...primer)
    doc.addImage(logoKuki, 'PNG', L, 3, 14, 14)
    doc.text('KUKI BAKEHOUSE', L + 18, 13)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...sekunder)
    doc.text('DOKUMEN INVENTARIS', W - L, 13, { align: 'right' })
    doc.setDrawColor(...garis); doc.setLineWidth(0.25)
    doc.line(L, 17, W - L, 17)
    doc.line(L, H - 15, W - L, H - 15)
    doc.setFontSize(7.4)
    doc.text(`Periode: ${sejak}  |  Dibuat: ${bersihPdf(kini)}`, L, H - 10)
    doc.text(`${halaman} / ${jumlahHalaman}`, W - L, H - 10, { align: 'right' })
  }
  unduhBlob(doc.output('blob'), namaBerkas(laporan, 'pdf'))
  return mutasi.length
}

function escapeHtml(input) {
  return String(input ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c])
}

/**
 * Cetak langsung menggunakan halaman cetak khusus, terpisah dari dashboard.
 * window.open dilakukan sebelum fetch agar tidak tertahan pemblokir popup.
 */
export async function cetakLaporanInventaris(laporan) {
  if (!laporan?.periode) throw new Error('Muat laporan terlebih dahulu sebelum mencetak.')
  const jendela = window.open('', '_blank')
  if (!jendela) throw new Error('Browser memblokir jendela cetak. Izinkan pop-up untuk situs ini lalu coba lagi.')
  jendela.document.open()
  jendela.document.write('<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Menyiapkan Laporan</title></head><body style="font:16px Arial;padding:30px">Menyiapkan laporan untuk dicetak...</body></html>')
  jendela.document.close()
  try {
    const mutasi = await bacaSeluruhMutasi(laporan.periode.mulai, laporan.periode.selesai)
    const logoKuki = await bacaLogoKuki()
    const pilihan = (laporan.mutasi.berdasarkan_jenis || []).map((item) => `<tr><td>${escapeHtml(NAMA_JENIS[item.jenis] || item.jenis)}</td><td class="num">${fmtAngka(item.kejadian)}</td><td class="num">${fmtAngka(item.masuk)}</td><td class="num">${fmtAngka(item.keluar)}</td></tr>`).join('')
    const dataMutasi = mutasi.map((m) => `<tr><td>${escapeHtml(m.waktu)}</td><td>${escapeHtml(m.produk)}</td><td>${escapeHtml(m.sku || '-')}</td><td>${escapeHtml(m.jenis)}</td><td class="num">${m.perubahan > 0 ? '+' : ''}${fmtAngka(m.perubahan)}</td><td class="num">${fmtAngka(m.sebelum)}</td><td class="num">${fmtAngka(m.sesudah)}</td><td>${escapeHtml(m.alasan || '-')}</td><td>${escapeHtml(m.petugas || '-')}</td></tr>`).join('')
    const html = `<!doctype html><html lang="id"><head><meta charset="utf-8">
    <title>Kuki - Inventaris ${escapeHtml(laporan.periode.mulai)}_${escapeHtml(laporan.periode.selesai)}</title>
    <style>
    @page{size:A4 landscape;margin:13mm}
    *{box-sizing:border-box}body{font:11px/1.42 Arial,Helvetica,sans-serif;color:#2f2924;margin:22px auto;max-width:1140px;padding:0 22px}
    .header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #4b3c31;padding-bottom:10px}
    .brand{display:flex;align-items:center;gap:10px;font-size:18px;font-weight:700;letter-spacing:.065em}.brand-logo{width:46px;height:46px;object-fit:contain}.category{font-size:10px;text-transform:uppercase;letter-spacing:.10em;color:#6d645e}
    h1{font-size:19px;letter-spacing:.02em;margin:20px 0 4px}h2{font-size:12px;margin:20px 0 9px}p{margin:5px 0 12px;color:#665f59}
    table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px}th{background:#4b3c31;color:#fff;text-align:left;padding:7px 8px;border:1px solid #4b3c31}
    td{border:1px solid #d8d2cb;padding:6px 8px;vertical-align:top;overflow-wrap:anywhere}tbody tr:nth-child(even){background:#f8f6f3}
    .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.stat td{padding:8px}.stat td:nth-child(odd){font-weight:bold;background:#f7f4f0;width:29%}
    .notes{font-size:10px;border-top:1px solid #ddd;padding-top:8px;margin-top:16px}
    .mutasi{font-size:9px}.mutasi th:nth-child(1){width:10%}.mutasi th:nth-child(2){width:14%}.mutasi th:nth-child(3){width:10%}.mutasi th:nth-child(4){width:10%}.mutasi th:nth-child(5){width:8%}.mutasi th:nth-child(6),.mutasi th:nth-child(7){width:8%}.mutasi th:nth-child(8){width:21%}.mutasi th:nth-child(9){width:11%}
    .bar{margin:14px 0}.btn{font:inherit;background:#4b3c31;color:white;border:0;border-radius:5px;padding:10px 15px;cursor:pointer}
    @media print{body{margin:0;max-width:none;padding:0}.bar{display:none}thead{display:table-header-group}tr{break-inside:avoid}h2{break-after:avoid}html{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
    </style></head><body>
    <div class="bar"><button class="btn" onclick="window.print()">Cetak / Simpan sebagai PDF</button><span style="margin-left:12px;color:#665f59">Jika dialog tidak muncul, klik tombol ini atau tekan Ctrl+P.</span></div>
    <div class="header"><div class="brand"><img class="brand-logo" src="${escapeHtml(logoKuki)}" alt="Logo Kuki Bakehouse">KUKI BAKEHOUSE</div><div class="category">Catatan operasional inventaris</div></div>
    <h1>Ringkasan Inventaris</h1><p>Periode: ${escapeHtml(laporan.periode.mulai)} s.d. ${escapeHtml(laporan.periode.selesai)} &nbsp; | &nbsp; Dicetak: ${escapeHtml(waktuCetak())}</p>
    <table class="stat"><tbody>
      <tr><td>Jumlah produk</td><td class="num">${fmtAngka(laporan.stok_saat_ini.jumlah_produk)}</td><td>Stok saat ini</td><td class="num">${fmtAngka(laporan.stok_saat_ini.unit)} pcs</td></tr>
      <tr><td>Mutasi masuk</td><td class="num">${fmtAngka(laporan.mutasi.masuk)} pcs</td><td>Mutasi keluar</td><td class="num">${fmtAngka(laporan.mutasi.keluar)} pcs</td></tr>
      <tr><td>Produksi tercatat</td><td class="num">${fmtAngka(laporan.produksi.jumlah)} pcs</td><td>Opname selesai</td><td class="num">${fmtAngka(laporan.opname_selesai)} sesi</td></tr>
      <tr><td>Stok kritis</td><td class="num">${fmtAngka(laporan.stok_saat_ini.kritis)}</td><td>Stok habis</td><td class="num">${fmtAngka(laporan.stok_saat_ini.habis)}</td></tr>
    </tbody></table>
    <h2>Rekap Mutasi Berdasarkan Jenis</h2><table><thead><tr><th>Jenis mutasi</th><th>Kejadian</th><th>Masuk (pcs)</th><th>Keluar (pcs)</th></tr></thead><tbody>${pilihan || '<tr><td colspan="4">Tidak ada mutasi dalam periode.</td></tr>'}</tbody></table>
    <h2>Riwayat Mutasi (${fmtAngka(mutasi.length)} baris)</h2>
    <table class="mutasi"><thead><tr><th>Waktu</th><th>Produk</th><th>SKU</th><th>Jenis</th><th>+/- pcs</th><th>Stok awal</th><th>Stok akhir</th><th>Keterangan</th><th>Petugas</th></tr></thead><tbody>${dataMutasi || '<tr><td colspan="9">Tidak ada mutasi pada periode ini.</td></tr>'}</tbody></table>
    <p class="notes">Catatan: Stok saat ini merupakan posisi saat laporan dibuka, bukan saldo akhir historis periode. Produksi sudah dihitung di mutasi masuk. Koreksi stok resmi dicatat melalui aplikasi; perubahan Excel tidak memperbarui database.</p>
    </body></html>`
    if (jendela.closed) throw new Error('Jendela cetak sudah ditutup.')
    jendela.document.open()
    jendela.document.write(html)
    jendela.document.close()
    await Promise.all(Array.from(jendela.document.images, (image) => image.decode()))
    jendela.focus()
    jendela.print()
    return mutasi.length
  } catch (error) {
    if (!jendela.closed) jendela.close()
    throw error
  }
}

/**
 * Membaca kembali XLSX usulan koreksi sebagai pratinjau saja. Tidak ada POST
 * ke API: tidak ada data yang diubah sebelum Admin melakukan koreksi resmi.
 * Baris/divergensi data dicek ulang terhadap riwayat periode dari server.
 */
export async function periksaUsulanKoreksiExcel(file, laporan) {
  if (!laporan?.periode) throw new Error('Muat laporan sebelum memeriksa berkas koreksi.')
  if (!file || !/\.xlsx$/i.test(file.name || '')) throw new Error('Pilih file Excel (.xlsx) hasil ekspor Kuki.')
  if (file.size > 20 * 1024 * 1024) throw new Error('File koreksi terlalu besar (maksimal 20 MB).')
  const exceljsModule = await import('exceljs')
  const ExcelJS = exceljsModule.default || exceljsModule
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const sheet = wb.getWorksheet('Usulan Koreksi')
  const r = wb.getWorksheet('Ringkasan')
  if (!sheet || !r) throw new Error('Format tidak sesuai. Gunakan file Excel hasil ekspor Laporan Inventaris Kuki.')
  const infoPeriode = String(r.getCell('A3').text || '')
  if (!infoPeriode.includes(`Periode ${laporan.periode.mulai} s.d. ${laporan.periode.selesai}`)) {
    throw new Error('Periode pada file Excel tidak cocok dengan periode laporan yang dibuka.')
  }
  const dataServer = await bacaSeluruhMutasi(laporan.periode.mulai, laporan.periode.selesai)
  const usulan = []
  const masalah = []
  for (let idx = 0; idx < dataServer.length; idx += 1) {
    const row = sheet.getRow(idx + 8)
    const nomor = Number(row.getCell(1).value)
    const nilai = row.getCell(6).value
    const alasan = String(row.getCell(8).text || '').trim()
    if (nilai === null || nilai === undefined || String(nilai).trim() === '') continue
    const asli = dataServer[idx]
    const waktuExcel = row.getCell(2).value instanceof Date ? row.getCell(2).value.toISOString().slice(0, 19).replace('T', ' ') : String(row.getCell(2).text || '')
    if (nomor !== idx + 1 || !asli || row.getCell(3).text !== asli.produk || row.getCell(4).text !== asli.sku || waktuExcel !== asli.waktu || Number(row.getCell(5).value) !== asli.perubahan) {
      masalah.push(`Baris Excel ${idx + 8}: data asal tidak cocok dengan server. Baris dilewati.`)
      continue
    }
    if (typeof nilai !== 'number' || !Number.isSafeInteger(nilai)) {
      masalah.push(`Baris Excel ${idx + 8}: kolom perubahan usulan harus angka bulat.`)
      continue
    }
    if (!alasan) { masalah.push(`Baris Excel ${idx + 8}: alasan koreksi wajib diisi.`); continue }
    if (nilai === asli.perubahan) continue
    usulan.push({ nomor, produk: asli.produk, sku: asli.sku, waktu: asli.waktu, tercatat: asli.perubahan, usulan: nilai, selisih: nilai - asli.perubahan, alasan })
  }
  return { usulan, masalah, jumlahData: dataServer.length }
}
