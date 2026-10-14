// Service Chat Admin: mengelola percakapan & pesan, termasuk handover dari AI.
import { api } from './api'

export async function ambilDaftarObrolan({ status, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  params.append('page', page)
  params.append('limit', limit)
  const response = await api.get(`/admin/obrolan?${params}`)
  return response.data
}

export async function ambilDetailObrolan(obrolanId) {
  const response = await api.get(`/admin/obrolan/${encodeURIComponent(obrolanId)}`)
  return response.data
}

export async function kirimBalasanAdmin({ obrolanId, message }) {
  const response = await api.post(`/admin/obrolan/${encodeURIComponent(obrolanId)}/balas`, { message })
  return response.data
}

export async function ambilPesanBaru(obrolanId, sinceMessageId) {
  const params = new URLSearchParams()
  if (sinceMessageId) params.append('since', sinceMessageId)
  const response = await api.get(`/admin/obrolan/${encodeURIComponent(obrolanId)}/pesan?${params}`)
  return response.data
}

export async function tandaiDibaca(obrolanId) {
  const response = await api.post(`/admin/obrolan/${encodeURIComponent(obrolanId)}/baca`, {})
  return response.data
}

export async function ambilStatistikObrolan() {
  const response = await api.get('/admin/obrolan/statistik')
  return response.data
}

export async function ambilPertanyaanTidakTerjawab({ page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams()
  params.append('page', page)
  params.append('limit', limit)
  const response = await api.get(`/admin/obrolan/pertanyaan-tidak-terjawab?${params}`)
  return response.data
}

export async function ambilKonteksProduk(productId) {
  try {
    const response = await api.get(`/produk/${encodeURIComponent(productId)}`)
    return response.data
  } catch {
    return null
  }
}