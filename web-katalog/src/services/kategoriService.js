// Service data kategori: katalog publik + pengelolaan Admin.

import { api, assetUrl } from './api'

export function mapKategori(item) {
  if (!item) return null

  return {
    id: item.id,
    name: item.nama,
    nama: item.nama,
    slug: item.slug,
    gambar: assetUrl(item.gambar),
    image: assetUrl(item.gambar),
    jumlahProduk: Number(item.produk_count ?? 0),
  }
}

export async function getKategori() {
  const response = await api.get('/kategori')
  const data = response?.data || []
  return data.map(mapKategori)
}

export async function simpanKategori(payload) {
  const body = { nama: payload.nama, slug: payload.slug || null }

  if (payload.id) {
    const response = await api.put(`/kategori/${payload.id}`, body)
    return response.data
  }

  const response = await api.post('/kategori', body)
  return response.data
}

export async function hapusKategori(id) {
  return api.delete(`/kategori/${id}`)
}

export async function uploadGambarKategori(id, file) {
  const formData = new FormData()
  formData.append('gambar', file)
  const response = await api.postForm(`/kategori/${id}/gambar`, formData)
  return response.data
}
