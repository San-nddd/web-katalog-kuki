
// src/services/blogService.js
// Menggunakan client `api` yang sama dengan fitur Kuki lainnya (Sanctum & base URL).
// Endpoint relatif terhadap /api, agar aman saat dipakai melalui ngrok + Vite proxy.
import { api } from './api'

function unwrap(response) {
  // client api proyek bisa mengembalikan body langsung atau { data: body }.
  if (response?.success !== undefined) return response
  if (response?.data?.success !== undefined) return response.data
  return response?.data ?? response
}

function assertSuccess(response) {
  const body = unwrap(response)
  if (body?.success === false) {
    throw new Error(body.message || 'Permintaan gagal.')
  }
  return body
}

export function errorBlog(error) {
  if (error?.status === 401 || error?.response?.status === 401) {
    return 'Sesi Admin tidak valid. Login ulang lalu coba lagi.'
  }
  if (error?.status === 403 || error?.response?.status === 403) {
    return 'Akun ini tidak memiliki izin mengelola Blog.'
  }
  const validation = error?.data?.errors || error?.response?.data?.errors
  if (validation && typeof validation === 'object') {
    const first = Object.values(validation).flat().find(Boolean)
    if (first) return String(first)
  }
  return error?.message || 'Terjadi kesalahan pada server.'
}

export async function daftarArtikelAdmin(page = 1) {
  const body = assertSuccess(
    await api.get(`/admin/blog?page=${encodeURIComponent(page)}`)
  )

  const pagination = body.data ?? body

  return {
    items: Array.isArray(pagination) ? pagination : pagination?.data ?? [],
    currentPage: Number(pagination?.current_page || 1),
    lastPage: Number(pagination?.last_page || 1),
    total: Number(pagination?.total || 0),
  }
}

export async function daftarKategoriBlog() {
  const body = assertSuccess(await api.get('/blog/kategori'))
  return Array.isArray(body.data) ? body.data : []
}

export async function buatKategoriBlog(nama) {
  const body = assertSuccess(
    await api.post('/admin/blog/kategori', { nama })
  )
  return body.data
}

export async function buatArtikelBlog(data) {
  const body = assertSuccess(
    await api.post('/admin/blog', data)
  )
  return body.data
}

export async function perbaruiArtikelBlog(id, data) {
  const body = assertSuccess(
    await api.put(`/admin/blog/${encodeURIComponent(id)}`, data)
  )
  return body.data
}

export async function hapusArtikelBlog(id) {
  return assertSuccess(
    await api.delete(`/admin/blog/${encodeURIComponent(id)}`)
  )
}

// PENTING:
// api.js HARUS meneruskan FormData apa adanya, bukan JSON.stringify.
// Jangan set Content-Type manual:
// browser harus membuat multipart boundary.
export async function unggahSampulArtikel(id, file) {
  const formData = new FormData()
  formData.append('gambar', file)

  const body = assertSuccess(
    await api.post(
      `/admin/blog/${encodeURIComponent(id)}/sampul`,
      formData
    )
  )

  return body.data
}

export async function unggahMediaArtikel(id, file, caption = '') {
  const formData = new FormData()
  formData.append('file', file)

  if (caption.trim()) {
    formData.append('caption', caption.trim())
  }

  const body = assertSuccess(
    await api.post(
      `/admin/blog/${encodeURIComponent(id)}/media`,
      formData
    )
  )

  return body.data
}

export async function hapusMediaArtikel(id, mediaId) {
  return assertSuccess(
    await api.delete(
      `/admin/blog/${encodeURIComponent(id)}/media/${encodeURIComponent(mediaId)}`
    )
  )
}

// Semua URL file blog menggunakan path relatif /storage/... dari Laravel.
export function urlMediaBlog(path) {
  if (!path) return ''

  const value = String(path)

  if (/^https?:\/\//i.test(value) || value.startsWith('/')) {
    return value
  }

  return `/storage/${value.replace(/^storage\//, '')}`
}
