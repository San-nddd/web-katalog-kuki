import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getProdukById } from '../services/produkService'
import {
  UKURAN_LABEL, MODE_CETAK, KERAPATAN,
  analisisLabel, cetakLabelBarcode, BATAS_CETAK_LABEL,
} from '../utils/printBarcodeLabels'
import './BarcodePrintButton.css'

/**
 * Jumlah label mengikuti stok terkini dari API produk ketika dialog dibuka.
 * Tidak mengurangi stok dan tidak membuat transaksi.
 * Contoh pemakaian di daftar produk:
 * <BarcodePrintButton produkId={item.id} stok={item.stok}
 *   value={item.barcode} productName={item.nama}/>
 */
export default function BarcodePrintButton({
  produkId,
  stok,
  value,
  productName,
  disabled = false,
  canPrint = true,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [ukuranId, setUkuranId] = useState(() =>
    UKURAN_LABEL.find((item) => !analisisLabel(value, item.id, 'normal').error)?.id || '80x35'
  )
  const [kerapatanId, setKerapatanId] = useState('normal')
  const [media, setMedia] = useState('a4')
  const [modeJumlah, setModeJumlah] = useState('stok')
  const [jumlahManual, setJumlahManual] = useState('1')
  const [hasilStok, setHasilStok] = useState(null)
  const [error, setError] = useState('')

  const validKode = Boolean(String(value ?? '').trim()) && !disabled && canPrint
  const analisis = useMemo(() => analisisLabel(value, ukuranId, kerapatanId), [value, ukuranId, kerapatanId])
  const stokAwal = Number(stok)
  const adaStokAwal = stok !== null && stok !== undefined && Number.isSafeInteger(stokAwal) && stokAwal >= 0
  const barcodeProduk = String(value ?? '').trim()
  const hasilStokSaatIni = hasilStok?.produkId === produkId && hasilStok?.barcode === barcodeProduk
    ? hasilStok
    : null
  const stokTerbaru = hasilStokSaatIni?.stok ?? null
  const loadingStok = open && produkId !== undefined && produkId !== null && !hasilStokSaatIni
  const errorStok = hasilStokSaatIni?.error ?? ''
  const stokSaatIni = stokTerbaru ?? (adaStokAwal ? stokAwal : null)
  const stokTerbatas = stokSaatIni !== null ? Math.min(stokSaatIni, BATAS_CETAK_LABEL) : null
  const nilaiManual = jumlahManual.trim() === '' ? NaN : Number(jumlahManual)
  const jumlahTerpilih = modeJumlah === 'stok' && stokSaatIni !== null ? stokTerbatas : nilaiManual
  const jumlahValid = Number.isSafeInteger(jumlahTerpilih) && jumlahTerpilih >= 1
    && jumlahTerpilih <= BATAS_CETAK_LABEL
    && (stokSaatIni === null || jumlahTerpilih <= stokSaatIni)
  const bolehCetak = validKode && !loadingStok && !errorStok && !analisis.error && jumlahValid

  useEffect(() => {
    if (!open || produkId === undefined || produkId === null) return
    let aktif = true
    getProdukById(produkId)
      .then((item) => {
        if (!aktif) return
        const jumlah = Number(item?.stok)
        if (!Number.isSafeInteger(jumlah) || jumlah < 0) {
          throw new Error("Stok produk dari API tidak valid.")
        }
        if (String(item?.barcode ?? '').trim() !== barcodeProduk) {
          throw new Error("Barcode produk berubah di database. Muat ulang daftar produk sebelum mencetak.")
        }
        setHasilStok({ produkId, barcode: barcodeProduk, stok: jumlah, error: '' })
        setJumlahManual(String(Math.min(Math.max(jumlah, 1), BATAS_CETAK_LABEL)))
      })
      .catch((err) => {
        if (aktif) {
          setHasilStok({
            produkId,
            barcode: barcodeProduk,
            stok: null,
            error: err?.message || "Gagal mengambil stok terbaru. Coba lagi.",
          })
        }
      })
    return () => { aktif = false }
  }, [open, produkId, barcodeProduk])

  function handleOpen() {
    setError('')
    setHasilStok(null)
    setModeJumlah('stok')
    setJumlahManual('1')
    setOpen(true)
  }

  function handlePrint() {
    setError('')
    if (!bolehCetak) return
    const result = cetakLabelBarcode({
      barcode: value, productName, ukuranId, kerapatanId, media,
      jumlah: jumlahTerpilih,
    })
    if (result.error) setError(result.error)
    else setOpen(false)
  }

  const format = (angka) => new Intl.NumberFormat('id-ID').format(angka)

  return (
    <>
      <button type="button"
        className={`admin-btn admin-btn-ghost ${className}`.trim()}
        disabled={!validKode}
        title={validKode ? ("Cetak label " + productName) : "Simpan barcode produk terlebih dahulu"}
        onClick={handleOpen}>
        {"Cetak"}
      </button>

      {open && createPortal(
        <div className="kuki-label-overlay" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setOpen(false)
        }}>
          <div className="kuki-label-dialog" role="dialog" aria-modal="true" aria-label={"Pengaturan cetak barcode sesuai stok"}>
            <div className="kuki-label-dialog-head">
              <strong>{"Cetak Label Barcode"}</strong>
              <button className="kuki-label-close" type="button" onClick={() => setOpen(false)} aria-label={"Tutup"}>{"×"}</button>
            </div>

            <div className="kuki-label-form">
              <div className="kuki-label-product">{productName}<small>{value}</small></div>

              <div className="kuki-label-stock" role="status">
                <strong>{"Stok yang tercatat saat ini:"}</strong>{' '}
                {loadingStok ?"Memeriksa database..." : errorStok ?"Tidak dapat diverifikasi" :
                  stokSaatIni === null ?"Belum tersedia" : `${format(stokSaatIni)} pcs`}
                {stokSaatIni !== null && stokSaatIni > BATAS_CETAK_LABEL && (
                  <small>{"Maksimal"} {format(BATAS_CETAK_LABEL)} {"label per sesi cetak. Untuk sisanya, lakukan sesi berikutnya."}</small>
                )}
                <small>{"Jumlah ini berasal dari kolom stok produk, bukan catatan produksi harian terpisah."}</small>
              </div>
              {errorStok && <p role="alert" className="kuki-label-error">{errorStok}</p>}

              {stokSaatIni !== null ? (
                <fieldset className="kuki-label-choices" disabled={loadingStok || Boolean(errorStok)}>
                  <legend>{"Jumlah stiker yang dicetak"}</legend>
                  <label><input type="radio" name={`jumlah-${produkId ?? value}`} value="stok" checked={modeJumlah === 'stok'}
                    onChange={() => setModeJumlah('stok')} /> {"Otomatis sesuai stok ("}{format(stokTerbatas)} {"label)"}</label>
                  <label><input type="radio" name={`jumlah-${produkId ?? value}`} value="manual" checked={modeJumlah === 'manual'}
                    onChange={() => setModeJumlah('manual')} /> {"Tentukan jumlah sendiri"}</label>
                </fieldset>
              ) : (
                <p className="kuki-label-help">{"Stok belum dihubungkan. Masukkan jumlah cetak secara manual."}</p>
              )}

              {(modeJumlah === 'manual' || stokSaatIni === null) && (
                <label>{"Jumlah label"}
                  <input type="number" min="1" max={Math.min(stokSaatIni ?? BATAS_CETAK_LABEL, BATAS_CETAK_LABEL)} step="1"
                    value={jumlahManual} onChange={(e) => setJumlahManual(e.target.value)} />
                </label>
              )}

              <label>{"Ukuran label"}
                <select value={ukuranId} onChange={(e) => setUkuranId(e.target.value)}>
                  {UKURAN_LABEL.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}
                </select>
              </label>
              <label>{"Kerapatan garis barcode"}
                <select value={kerapatanId} onChange={(e) => setKerapatanId(e.target.value)}>
                  {KERAPATAN.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}
                </select>
              </label>
              <label>{"Media cetak"}
                <select value={media} onChange={(e) => setMedia(e.target.value)}>
                  {MODE_CETAK.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}
                </select>
              </label>

              <div className="kuki-label-result" role="status">
                {analisis.error ? <p className="kuki-label-error">{analisis.error}</p> : (
                  <p><strong>{"Barcode muat."}</strong> {"Lebar simbol ±"} {analisis.lebarBarcodeMm.toFixed(1)} {"mm,\n                    label"} {analisis.ukuran.lebar} {"×"} {analisis.ukuran.tinggi} {"mm."}</p>
                )}
                <p><strong>{"Total:"} {jumlahValid ? format(jumlahTerpilih) : '—'} {"label"}</strong></p>
                {!jumlahValid && !loadingStok && (
                  <p className="kuki-label-error">{"Jumlah harus minimal 1, maksimal"} {format(BATAS_CETAK_LABEL)}{", dan tidak melebihi stok tercatat."}</p>
                )}
                <small>{media === 'a4' ?"A4: label disusun dalam grid agar hemat kertas." :"Printer stiker: samakan ukuran kertas di driver printer."}</small>
                <small>{"Matikan header/footer printer, skala 100%, dan uji dengan scanner fisik."}</small>
              </div>
              {error && <p className="kuki-label-error" role="alert">{error}</p>}
            </div>
            <div className="kuki-label-dialog-actions">
              <button className="admin-btn admin-btn-ghost" type="button" onClick={() => setOpen(false)}>{"Batal"}</button>
              <button className="admin-btn admin-btn-primary" type="button" disabled={!bolehCetak} onClick={handlePrint}>
                {"Cetak"} {jumlahValid ? format(jumlahTerpilih) : ''} {"Label"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
