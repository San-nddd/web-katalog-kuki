import { api } from './api'

export async function getMutasiStok({ page = 1, produkId = '', jenis = '', tanggalMulai = '', tanggalSelesai = '' } = {}) {
  const query = new URLSearchParams({ page: String(page) })
  if (produkId) query.set('produk_id', String(produkId))
  if (jenis) query.set('jenis', jenis)
  if (tanggalMulai) query.set('tanggal_mulai', tanggalMulai)
  if (tanggalSelesai) query.set('tanggal_selesai', tanggalSelesai)
  const response = await api.get(`/admin/mutasi-stok?${query.toString()}`)
  return response.data
}

export async function koreksiStok(data) {
  const response = await api.post('/admin/mutasi-stok/koreksi', data)
  return response.data
}
