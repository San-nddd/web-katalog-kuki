import { api } from './api'

const data = (response) => response?.data?.data ?? response?.data ?? response

export async function ambilDaftarOpname({ status = '', page = 1 } = {}) {
  const params = new URLSearchParams({ page: String(page) })
  if (status) params.set('status', status)
  return data(await api.get(`/admin/opname-stok?${params}`))
}

export async function ambilDetailOpname(id) {
  return data(await api.get(`/admin/opname-stok/${id}`))
}

export async function buatOpname(produkIds, catatan = '') {
  return data(await api.post('/admin/opname-stok', { produk_ids: produkIds, catatan }))
}

export async function simpanHitungFisik(id, items) {
  return api.put(`/admin/opname-stok/${id}`, { items })
}

export async function selesaikanOpname(id) {
  return api.post(`/admin/opname-stok/${id}/selesai`, {})
}

export async function batalkanOpname(id) {
  return api.post(`/admin/opname-stok/${id}/batalkan`, {})
}

export async function keluarkanBarang(dataPengeluaran) {
  return api.post('/admin/opname-stok/pengeluaran', dataPengeluaran)
}

export async function ringkasanPengeluaran() {
  return data(await api.get('/admin/opname-stok/ringkasan-pengeluaran'))
}
