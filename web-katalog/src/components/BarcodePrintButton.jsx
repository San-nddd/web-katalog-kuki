import useAdminTranslation from '../hooks/useAdminTranslation'
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
  const { t } = useAdminTranslation()

  const [open, setOpen] = useState(false)
  const [ukuranId, setUkuranId] = useState(() =>
    UKURAN_LABEL.find((item) => !analisisLabel(value, item.id, 'normal').error)?.id || '80x35'
  )
  const [kerapatanId, setKerapatanId] = useState('normal')
  const [media, setMedia] = useState('a4')
  const [modeJumlah, setModeJumlah] = useState('stok')
  const [jumlahManual, setJumlahManual] = useState('1')
  const [stokTerbaru, setStokTerbaru] = useState(null)
  const [loadingStok, setLoadingStok] = useState(false)
  const [errorStok, setErrorStok] = useState('')
  const [error, setError] = useState('')

  const validKode = Boolean(String(value ?? '').trim()) && !disabled && canPrint
  const analisis = useMemo(() => analisisLabel(value, ukuranId, kerapatanId), [value, ukuranId, kerapatanId])
  const stokAwal = Number(stok)
  const adaStokAwal = stok !== null && stok !== undefined && Number.isSafeInteger(stokAwal) && stokAwal >= 0
  const stokSaatIni = stokTerbaru ?? (adaStokAwal ? stokAwal : null)
  const stokTerbatas = stokSaatIni !== null ? Math.min(stokSaatIni, BATAS_CETAK_LABEL) : null
  const nilaiManual = jumlahManual.trim() === '' ? NaN : Number(jumlahManual)
  const jumlahTerpilih = modeJumlah === 'stok' && stokSaatIni !== null ? stokTerbatas : nilaiManual
  const jumlahValid = Number.isSafeInteger(jumlahTerpilih) && jumlahTerpilih >= 1
    && jumlahTerpilih <= BATAS_CETAK_LABEL
    && (stokSaatIni === null || jumlahTerpilih <= stokSaatIni)
  const bolehCetak = validKode && !loadingStok && !errorStok && !analisis.error && jumlahValid

  useEffect(() => {
    if (!open) return
    let aktif = true
    setError('')
    setErrorStok('')
    setStokTerbaru(null)
    setModeJumlah('stok')
    setJumlahManual('1')

    if (produkId === undefined || produkId === null) {
      setLoadingStok(false)
      return () => { aktif = false }
    }

    setLoadingStok(true)
    getProdukById(produkId)
      .then((item) => {
        if (!aktif) return
        const jumlah = Number(item?.stok)
        if (!Number.isSafeInteger(jumlah) || jumlah < 0) {
          throw new Error(t("Stok produk dari API tidak valid."))
        }
        if (String(item?.barcode ?? '').trim() !== String(value ?? '').trim()) {
          throw new Error(t("Barcode produk berubah di database. Muat ulang daftar produk sebelum mencetak."))
        }
        setStokTerbaru(jumlah)
        setJumlahManual(String(Math.min(Math.max(jumlah, 1), BATAS_CETAK_LABEL)))
      })
      .catch((err) => {
        if (aktif) setErrorStok(err?.message ||t("Gagal mengambil stok terbaru. Coba lagi."))
      })
      .finally(() => { if (aktif) setLoadingStok(false) })
    return () => { aktif = false }
  }, [open, produkId, value])

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
        title={validKode ? t('Cetak label {nama}', { nama: productName }) : t('Simpan barcode produk terlebih dahulu')}
        onClick={() => setOpen(true)}>
        {t("Cetak")}
      </button>

      {open && createPortal(
        <div className="kuki-label-overlay" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setOpen(false)
        }}>
          <div className="kuki-label-dialog" role="dialog" aria-modal="true" aria-label={t("Pengaturan cetak barcode sesuai stok")}>
            <div className="kuki-label-dialog-head">
              <strong>{t("Cetak Label Barcode")}</strong>
              <button className="kuki-label-close" type="button" onClick={() => setOpen(false)} aria-label={t("Tutup")}>{t("×")}</button>
            </div>

            <div className="kuki-label-form">
              <div className="kuki-label-product">{productName}<small>{value}</small></div>

              <div className="kuki-label-stock" role="status">
                <strong>{t("Stok yang tercatat saat ini:")}</strong>{' '}
                {loadingStok ?t("Memeriksa database...") : errorStok ?t("Tidak dapat diverifikasi") :
                  stokSaatIni === null ?t("Belum tersedia") : `${format(stokSaatIni)} pcs`}
                {stokSaatIni !== null && stokSaatIni > BATAS_CETAK_LABEL && (
                  <small>{t("Maksimal")} {format(BATAS_CETAK_LABEL)} {t("label per sesi cetak. Untuk sisanya, lakukan sesi berikutnya.")}</small>
                )}
                <small>{t("Jumlah ini berasal dari kolom stok produk, bukan catatan produksi harian terpisah.")}</small>
              </div>
              {errorStok && <p role="alert" className="kuki-label-error">{errorStok}</p>}

              {stokSaatIni !== null ? (
                <fieldset className="kuki-label-choices" disabled={loadingStok || Boolean(errorStok)}>
                  <legend>{t("Jumlah stiker yang dicetak")}</legend>
                  <label><input type="radio" name={`jumlah-${produkId ?? value}`} value="stok" checked={modeJumlah === 'stok'}
                    onChange={() => setModeJumlah('stok')} /> {t("Otomatis sesuai stok (")}{format(stokTerbatas)} {t("label)")}</label>
                  <label><input type="radio" name={`jumlah-${produkId ?? value}`} value="manual" checked={modeJumlah === 'manual'}
                    onChange={() => setModeJumlah('manual')} /> {t("Tentukan jumlah sendiri")}</label>
                </fieldset>
              ) : (
                <p className="kuki-label-help">{t("Stok belum dihubungkan. Masukkan jumlah cetak secara manual.")}</p>
              )}

              {(modeJumlah === 'manual' || stokSaatIni === null) && (
                <label>{t("Jumlah label")}
                  <input type="number" min="1" max={Math.min(stokSaatIni ?? BATAS_CETAK_LABEL, BATAS_CETAK_LABEL)} step="1"
                    value={jumlahManual} onChange={(e) => setJumlahManual(e.target.value)} />
                </label>
              )}

              <label>{t("Ukuran label")}
                <select value={ukuranId} onChange={(e) => setUkuranId(e.target.value)}>
                  {UKURAN_LABEL.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}
                </select>
              </label>
              <label>{t("Kerapatan garis barcode")}
                <select value={kerapatanId} onChange={(e) => setKerapatanId(e.target.value)}>
                  {KERAPATAN.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}
                </select>
              </label>
              <label>{t("Media cetak")}
                <select value={media} onChange={(e) => setMedia(e.target.value)}>
                  {MODE_CETAK.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}
                </select>
              </label>

              <div className="kuki-label-result" role="status">
                {analisis.error ? <p className="kuki-label-error">{analisis.error}</p> : (
                  <p><strong>{t("Barcode muat.")}</strong> {t("Lebar simbol ±")} {analisis.lebarBarcodeMm.toFixed(1)} {t("mm,\n                    label")} {analisis.ukuran.lebar} {t("×")} {analisis.ukuran.tinggi} {t("mm.")}</p>
                )}
                <p><strong>{t("Total:")} {jumlahValid ? format(jumlahTerpilih) : '—'} {t("label")}</strong></p>
                {!jumlahValid && !loadingStok && (
                  <p className="kuki-label-error">{t("Jumlah harus minimal 1, maksimal")} {format(BATAS_CETAK_LABEL)}{t(", dan tidak melebihi stok tercatat.")}</p>
                )}
                <small>{media === 'a4' ?t("A4: label disusun dalam grid agar hemat kertas.") :t("Printer stiker: samakan ukuran kertas di driver printer.")}</small>
                <small>{t("Matikan header/footer printer, skala 100%, dan uji dengan scanner fisik.")}</small>
              </div>
              {error && <p className="kuki-label-error" role="alert">{error}</p>}
            </div>
            <div className="kuki-label-dialog-actions">
              <button className="admin-btn admin-btn-ghost" type="button" onClick={() => setOpen(false)}>{t("Batal")}</button>
              <button className="admin-btn admin-btn-primary" type="button" disabled={!bolehCetak} onClick={handlePrint}>
                {t("Cetak")} {jumlahValid ? format(jumlahTerpilih) : ''} {t("Label")}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
