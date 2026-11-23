import { api, API_BASE_URL, getToken } from './api'

function paramTanggal(mulai, selesai) {
  const params = new URLSearchParams()
  if (mulai) params.set('tanggal_mulai', mulai)
  if (selesai) params.set('tanggal_selesai', selesai)
  return params.toString()
}

export async function getLaporanInventaris(mulai, selesai) {
  const params = paramTanggal(mulai, selesai)
  const response = await api.get(`/management/laporan-inventaris${params ? `?${params}` : ''}`)
  if (response?.success === false) {
    throw new Error(response?.message || 'Laporan inventaris gagal dimuat.')
  }
  return response?.data?.periode ? response.data : response?.data?.data?.periode ? response.data.data : response
}

export async function downloadLaporanInventarisCsv(mulai, selesai) {
  const params = paramTanggal(mulai, selesai)
  const token = getToken()
  if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.')

  const response = await fetch(
    `${API_BASE_URL}/management/laporan-inventaris/export${params ? `?${params}` : ''}`,
    { headers: { Accept: 'application/json, text/csv', Authorization: `Bearer ${token}` } },
  )
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.message || `Gagal mengunduh laporan (${response.status}).`)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `laporan-inventaris-kuki-${mulai || 'awal'}-${selesai || 'akhir'}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Browser mengonsumsi URL ketika proses unduhan dimulai.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
