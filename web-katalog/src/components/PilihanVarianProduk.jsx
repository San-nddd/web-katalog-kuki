import { useEffect, useId, useRef, useState } from 'react'
import { getVarianProduk } from '../services/produkVarianService'
import './PilihanVarianProduk.css'

const formatHarga = (angka) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(angka ?? 0))

/**
 * Komponen publik untuk detail produk Kuki Bakehouse.
 *
 * produkId: ID dari katalog_produk (atau dari useParams().id).
 * onChange: menerima objek varian terpilih, atau null bila tidak ada varian.
 * tampilkanRingkasan: false jika harga/stok sudah ditampilkan
 *   oleh layout DetailProdukPage agar tidak terlihat ganda.
 *
 * Tidak membuat checkout dan tidak mengubah stok/database.
 */
export default function PilihanVarianProduk({
  produkId,
  onChange,
  tampilkanRingkasan = true,
}) {
  const [daftar, setDaftar] = useState([])
  const [idTerpilih, setIdTerpilih] = useState('')
  const [memuat, setMemuat] = useState(true)
  const [error, setError] = useState('')
  const [percobaan, setPercobaan] = useState(0)
  const idInput = useId()

  // Callback terbaru tanpa mengulangi GET saat parent render ulang.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    let aktif = true

    setMemuat(true)
    setError('')
    setDaftar([])
    setIdTerpilih('')
    onChangeRef.current?.(null)

    if (!produkId) {
      setMemuat(false)
      return () => { aktif = false }
    }

    getVarianProduk(produkId)
      .then((hasil) => {
        if (!aktif) return

        const data = Array.isArray(hasil)
          ? hasil.filter((item) => item.aktif)
          : []

        setDaftar(data)

        // Jika ada stok, pilih varian yang tersedia lebih dahulu.
        const awal = data.find((item) => item.stok > 0) || data[0] || null
        setIdTerpilih(awal ? String(awal.id) : '')
        onChangeRef.current?.(awal)
      })
      .catch((err) => {
        if (!aktif) return
        setError(err?.message || 'Pilihan varian belum dapat dimuat.')
        onChangeRef.current?.(null)
      })
      .finally(() => {
        if (aktif) setMemuat(false)
      })

    return () => { aktif = false }
  }, [produkId, percobaan])

  const terpilih = daftar.find((item) => String(item.id) === idTerpilih) || null

  const handlePilih = (event) => {
    const id = event.target.value
    const varian = daftar.find((item) => String(item.id) === id) || null

    setIdTerpilih(id)
    onChangeRef.current?.(varian)
  }

  if (memuat) {
    return <p className="kuki-varian-public-info" role="status">Memuat pilihan varian...</p>
  }

  if (error) {
    return (
      <div className="kuki-varian-public-info" role="alert">
        <span>{error}</span>
        <button
          type="button"
          className="kuki-varian-retry"
          onClick={() => setPercobaan((nilai) => nilai + 1)}
        >
          Coba lagi
        </button>
      </div>
    )
  }

  // Produk lama tanpa varian tetap memakai informasi produk induk.
  if (!daftar.length) return null

  return (
    <section className="kuki-varian-public" aria-label="Pilihan varian produk">
      <label className="kuki-varian-label" htmlFor={idInput}>
        Pilih rasa / ukuran
      </label>
      <select
        id={idInput}
        className="kuki-varian-select"
        value={idTerpilih}
        onChange={handlePilih}
        disabled={!daftar.some((item) => item.stok > 0)}
      >
        {daftar.map((item) => (
          <option
            key={item.id}
            value={String(item.id)}
            disabled={item.stok <= 0}
          >
            {item.namaVarian}{item.stok <= 0 ? ' — Habis' : ''}
          </option>
        ))}
      </select>

      {terpilih && tampilkanRingkasan && (
        <div className="kuki-varian-summary" aria-live="polite">
          <strong className="kuki-varian-price">{formatHarga(terpilih.harga)}</strong>
          <span className="kuki-varian-stock">
            {terpilih.stok > 0 ? `Stok tersedia: ${terpilih.stok}` : 'Stok habis'}
          </span>
          {terpilih.sku && (
            <small className="kuki-varian-code">SKU: {terpilih.sku}</small>
          )}
        </div>
      )}
    </section>
  )
}
