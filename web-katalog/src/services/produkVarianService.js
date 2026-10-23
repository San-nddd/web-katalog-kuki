
/**
 * Kuki Bakehouse — API Varian Produk
 * Menggunakan API client yang sama dengan produkService.js
 */

import { api } from './api'

// Mengubah response Laravel menjadi format React
function mapVarian(item) {
  return {
    id: item.id,
    produkId: Number(item.produk_id),
    namaVarian: item.nama_varian,
    sku: item.sku,
    barcode: item.barcode,
    harga: Number(item.harga),
    stok: Number(item.stok ?? 0),
    stokMinimum: Number(item.stok_minimum ?? 0),
    aktif: Boolean(item.aktif),
  }
}

// PUBLIC: Mengambil varian aktif untuk katalog
export async function getVarianProduk(produkId) {
  const response = await api.get(
    `/produk/${encodeURIComponent(produkId)}/varian`
  )

  return (response?.data || []).map(mapVarian)
}

// ADMIN: Mengambil semua varian, termasuk yang tidak aktif
export async function getAdminVarianProduk(produkId) {
  const response = await api.get(
    `/admin/produk/${encodeURIComponent(produkId)}/varian`
  )

  return (response?.data || []).map(mapVarian)
}

// ADMIN: Menambah atau memperbarui varian produk
export async function simpanVarianProduk(produkId, payload) {
  const body = {}

  if ('namaVarian' in payload) {
    body.nama_varian = payload.namaVarian
  }

  if ('sku' in payload) {
    body.sku = payload.sku?.trim() || null
  }

  if ('barcode' in payload) {
    body.barcode = payload.barcode?.trim() || null
  }

  if ('harga' in payload) {
    body.harga = payload.harga
  }

  if ('stok' in payload) {
    body.stok = payload.stok
  }

  if ('stokMinimum' in payload) {
    body.stok_minimum = payload.stokMinimum
  }

  if ('aktif' in payload) {
    body.aktif = payload.aktif
  }

  const base = `/admin/produk/${encodeURIComponent(produkId)}/varian`

  const response = payload.id
    ? await api.put(
        `${base}/${encodeURIComponent(payload.id)}`,
        body
      )
    : await api.post(base, body)

  return mapVarian(response.data)
}

// ADMIN: Menghapus varian produk
export async function hapusVarianProduk(produkId, varianId) {
  return api.delete(
    `/admin/produk/${encodeURIComponent(produkId)}/varian/${encodeURIComponent(varianId)}`
  )
}
