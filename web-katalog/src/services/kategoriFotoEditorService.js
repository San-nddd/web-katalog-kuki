import { api } from './api'

/** Dipanggil SETELAH kategori tersimpan, karena perlu ID kategori. */
export async function uploadGambarKategoriDiedit(kategoriId, file) {
  if (!kategoriId || !file) return
  const data = new FormData()
  data.append('gambar', file)
  return api.postForm(`/kategori/${encodeURIComponent(kategoriId)}/gambar`, data)
}
