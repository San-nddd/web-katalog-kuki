import { api } from './api'

const BASE = '/admin/produksi-harian'

export async function getProduksiHarian(tanggal) {
  const query = tanggal ? `?tanggal=${encodeURIComponent(tanggal)}` : ''
  const response = await api.get(`${BASE}${query}`)
  return response?.data ?? { tanggal: '', tanggal_hari_ini: '', items: [], total_produksi: 0, total_belum_dicetak: 0 }
}

export async function catatProduksiHarian(produkId, jumlah) {
  const response = await api.post(BASE, {
    produk_id: Number(produkId),
    jumlah: Number(jumlah),
  })
  return response?.data
}

export async function konfirmasiCetakProduksi(batchId, jumlah) {
  const response = await api.post(`${BASE}/${encodeURIComponent(batchId)}/konfirmasi-cetak`, {
    jumlah: Number(jumlah),
  })
  return response?.data
}
