import { api, request } from './api'

// Endpoint ini sudah tersedia di routes/pos.php milik Kuki POS.
// Semua request memakai token Admin Sanctum melalui services/api.js.
export async function ambilDaftarPegawaiPos() {
  const response = await api.get('/pos/admin/pegawai')
  if (!Array.isArray(response?.data)) {
    throw new Error('Format daftar pegawai dari Laravel tidak sesuai.')
  }
  return response.data
}

export async function tambahPegawaiPos({ kode, nama, pin }) {
  const response = await api.post('/pos/admin/pegawai', { kode, nama, pin })
  return response.data
}

export async function gantiPinPegawaiPos(id, pin) {
  const response = await request(`/pos/admin/pegawai/${encodeURIComponent(id)}/pin`, {
    method: 'PATCH',
    body: { pin },
  })
  return response.data
}
