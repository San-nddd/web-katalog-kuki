
import { api, assetUrl } from './api'

function mapTestimonial(item) {
  return {
    ...item,
    avatar: assetUrl(item.photo_path),
    isVerified:
      item.source === 'customer' &&
      Boolean(item.verified_at),
    commentCount: Number(item.comments_count || 0),
  }
}

// Mengambil testimonial publik
export async function getTestimonials({ fresh = false } = {}) {
  const suffix = fresh ? `?refresh=${Date.now()}` : ''
  const response = await api.get(`/testimonial${suffix}`)

  return (response?.data || []).map(mapTestimonial)
}

// Mengambil komentar testimonial
export async function getTestimonialComments(
  testimonialId,
  { fresh = false } = {},
) {
  const suffix = fresh ? `?refresh=${Date.now()}` : ''

  const response = await api.get(
    `/testimonial/${testimonialId}/komentar${suffix}`,
  )

  return response?.data || []
}

// Mengirim komentar pelanggan
export async function submitTestimonialComment(
  testimonialId,
  payload,
) {
  return api.post(
    `/testimonial/${testimonialId}/komentar`,
    payload,
  )
}

// Mengirim testimonial pelanggan
export async function submitTestimonial(payload) {
  const formData = new FormData()

  formData.append('name', payload.name)
  formData.append('role', payload.role || '')
  formData.append('quote', payload.quote)

  if (payload.photo) {
    formData.append('photo', payload.photo)
  }

  return api.postForm('/testimonial', formData)
}

// Mengambil seluruh testimonial untuk Admin
export async function getAdminTestimonials() {
  const response = await api.get('/admin/testimonial')

  return (response?.data || []).map(mapTestimonial)
}

// Mengambil komentar untuk Admin
export async function getAdminTestimonialComments(status = '') {
  const query = status
    ? `?status=${encodeURIComponent(status)}`
    : ''

  const response = await api.get(
    `/admin/testimonial/komentar${query}`,
  )

  return response?.data || []
}

// Menambah atau mengubah testimonial oleh Admin
export async function saveManualTestimonial(payload) {
  const body = {
    name: payload.name,
    role: payload.role || null,
    quote: payload.quote,
    status: payload.status || 'published',
  }

  const response = payload.id
    ? await api.put(`/admin/testimonial/${payload.id}`, body)
    : await api.post('/admin/testimonial', body)

  return response.data
}

// Mengubah status testimonial
export async function moderateTestimonial(id, status) {
  const response = await api.patch(
    `/admin/testimonial/${id}/moderasi`,
    { status },
  )

  return response.data
}

// Menghapus testimonial
export async function deleteTestimonial(id) {
  return api.delete(`/admin/testimonial/${id}`)
}

// Upload foto testimonial Admin
export async function uploadTestimonialPhoto(id, photo) {
  const formData = new FormData()
  formData.append('photo', photo)

  return api.postForm(
    `/admin/testimonial/${id}/foto`,
    formData,
  )
}

// Menghapus foto testimonial
export async function deleteTestimonialPhoto(id) {
  return api.delete(`/admin/testimonial/${id}/foto`)
}

// Mengubah status komentar
export async function moderateTestimonialComment(id, status) {
  const response = await api.patch(
    `/admin/testimonial/komentar/${id}/moderasi`,
    { status },
  )

  return response.data
}

// Menghapus komentar
export async function deleteTestimonialComment(id) {
  return api.delete(`/admin/testimonial/komentar/${id}`)
}
  