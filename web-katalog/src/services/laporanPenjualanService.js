import { api, API_BASE_URL, getToken } from './api'

function parameterPeriode(dari, sampai, page) {
  const params = new URLSearchParams({ dari, sampai })
  if (page) params.set('page', String(page))
  return params.toString()
}

export async function getLaporanPenjualan(dari, sampai, page = 1) {
  const params = parameterPeriode(dari, sampai, page)
  const response = await api.get(`/management/laporan-penjualan?${params}`)
  if (response?.success === false) {
    throw new Error(response?.message || 'Laporan penjualan gagal dimuat.')
  }
  const data = response?.data?.periode ? response.data : response?.data?.data?.periode ? response.data.data : response
  if (!data?.periode || !data?.ringkasan || !data?.transaksi) {
    throw new Error('Format laporan penjualan dari server tidak sesuai.')
  }
  return data
}

export async function downloadLaporanPenjualanCsv(dari, sampai) {
  const params = parameterPeriode(dari, sampai)
  const token = getToken()
  if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.')

  const response = await fetch(
    `${API_BASE_URL}/management/laporan-penjualan/export?${params}`,
    { headers: { Accept: 'text/csv, application/json', Authorization: `Bearer ${token}` } },
  )
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.message || `Gagal mengunduh laporan (${response.status}).`)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `laporan-penjualan-kuki-${dari}-${sampai}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
