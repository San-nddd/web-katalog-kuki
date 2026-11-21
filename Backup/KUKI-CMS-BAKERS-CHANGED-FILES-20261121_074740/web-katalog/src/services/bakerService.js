import { api, assetUrl } from './api'

export function mapBaker(item) {
  if (!item) return null

  return {
    id: item.id,
    name: item.name || item.nama || '',
    role: item.role || item.spesialisasi || '',
    photo: assetUrl(item.photo || item.foto || null),
  }
}

export function mapAdminBaker(item) {
  if (!item) return null

  return {
    id: item.id,
    nama: item.nama || '',
    spesialisasi: item.spesialisasi || '',
    foto: item.foto || null,
    fotoUrl: assetUrl(item.foto || null),
    urutan: Number(item.urutan ?? 0),
    aktif: Boolean(item.aktif),
  }
}

export async function getBakers() {
  const response = await api.get('/bakers')
  const data = response?.data || []
  return data.map(mapBaker)
}

export async function getAdminBakers() {
  const response = await api.get('/admin/bakers')
  const data = response?.data || []
  return data.map(mapAdminBaker)
}

export async function simpanBaker(payload) {
  const body = {
    nama: String(payload.nama || '').trim(),
    spesialisasi: String(payload.spesialisasi || '').trim(),
    urutan: Number(payload.urutan ?? 0),
    aktif: Boolean(payload.aktif),
  }

  if (payload.id) {
    const response = await api.put(`/admin/bakers/${payload.id}`, body)
    return response.data
  }

  const response = await api.post('/admin/bakers', body)
  return response.data
}

export async function hapusBaker(id) {
  return api.delete(`/admin/bakers/${id}`)
}

export async function aturPublikasiBaker(id, aktif) {
  const response = await api.patch(`/admin/bakers/${id}/publikasi`, { aktif: Boolean(aktif) })
  return response.data
}

export async function aturUrutanBaker(ids) {
  const response = await api.post('/admin/bakers/reorder', { ids })
  return response.data
}

export async function uploadFotoBaker(id, file) {
  const formData = new FormData()
  formData.append('foto', file)
  const response = await api.postForm(`/admin/bakers/${id}/foto`, formData)
  return response.data
}

export async function hapusFotoBaker(id) {
  const response = await api.delete(`/admin/bakers/${id}/foto`)
  return response.data
}
