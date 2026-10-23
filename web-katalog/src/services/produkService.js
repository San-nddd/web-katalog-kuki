import { api, assetUrl } from './api'
export function mapProduk(item) {
  if (!item) return null

  const stok = Number(item.stok ?? 0)

  return {
    id: item.id,
    nama: item.nama_produk,
    deskripsi: item.deskripsi_produk,
    harga: Number(item.harga_produk),
    gambar: assetUrl(item.gambar_produk),
    kategori: item.kategori?.nama || '',
    kategoriId: item.kategori_id ?? null,
    slug: item.slug || null,
    barcode: item.barcode || null,
    stok,
    stokMinimum: Number(item.stok_minimum ?? 0),
    metadataAi: item.metadata_ai || null,
    tersedia: stok > 0,
  }
}

export async function getProduk() {
  const data = await api.get('/produk')
  return (Array.isArray(data) ? data : []).map(mapProduk)
}

export async function getProdukById(id) {
  const data = await api.get(`/produk/${id}`)
  return mapProduk(data)
}

export async function simpanProduk(payload) {
  const body = {
    nama_produk: payload.nama,
    deskripsi_produk: payload.deskripsi,
    harga_produk: payload.harga,
    kategori_id: payload.kategoriId || null,
    barcode: payload.barcode || null,
    slug: payload.slug || null,
    stok: payload.stok ?? 0,
    stok_minimum: payload.stokMinimum ?? 0,
    metadata_ai: payload.metadataAi || null,
  }

  // Jangan menimpa gambar lama dengan null saat mengedit data produk.
  // Gambar yang dipilih di form diunggah melalui uploadGambarProduk().
  if (payload.gambar !== undefined) {
    body.gambar_produk = payload.gambar
  }

  if (payload.id) {
    const response = await api.put(`/produk/${payload.id}`, body)
    return response.data
  }

  // Samakan bentuk return create & update: keduanya berupa objek produk.
  // Penting agar ProdukFormPage bisa membaca saved.id untuk upload gambar.
  const response = await api.post('/produk', body)
  return response.data
}

export async function hapusProduk(id) {
  return api.delete(`/produk/${id}`)
}

export async function uploadGambarProduk(id, file) {
  const formData = new FormData()
  formData.append('gambar', file)
  const response = await api.postForm(`/produk/${id}/gambar`, formData)
  return response.data
}