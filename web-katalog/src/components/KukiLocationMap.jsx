import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../styles/kukiLocationMap.css'
import '../styles/kukiLocationTypography.css'

const rawLat = String(import.meta.env.VITE_KUKI_STORE_LAT ?? '').trim()
const rawLng = String(import.meta.env.VITE_KUKI_STORE_LNG ?? '').trim()
const storeLat = Number(rawLat)
const storeLng = Number(rawLng)
const storeReady = Boolean(rawLat && rawLng) && Number.isFinite(storeLat) && Number.isFinite(storeLng)
  && Math.abs(storeLat) <= 90 && Math.abs(storeLng) <= 180 && !(storeLat === 0 && storeLng === 0)

const STORE_NAME = String(import.meta.env.VITE_KUKI_STORE_NAME || 'Kuki Bakehouse')
const STORE_ADDRESS = String(import.meta.env.VITE_KUKI_STORE_ADDRESS || 'Alamat toko belum diisi')

const API_BASE = String(
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_KUKI_MAP_API_BASE_URL ||
  'https://kukibakehouse.smkn1sumedang.sch.id'
)
  .trim()
  .replace(/\/api\/?$/, '')
  .replace(/\/+$/, '')

const TILE_URL = String(import.meta.env.VITE_KUKI_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png')
const MODES = [
  { value: 'driving-car', label: 'Mobil' },
  { value: 'cycling-regular', label: 'Sepeda' },
  { value: 'foot-walking', label: 'Jalan kaki' },
]

function parseError(json, status) {
  return typeof json?.message === 'string' ? json.message : `Permintaan gagal (HTTP ${status}).`
}

async function requestJson(url, options = {}) {
  let response
  try {
    response = await fetch(url, { credentials: 'same-origin', ...options, headers: { Accept: 'application/json', ...(options.headers || {}) } })
  } catch {
    throw new Error('Tidak dapat terhubung ke Laravel API. Periksa server dan konfigurasi proxy.')
  }
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(parseError(json, response.status))
  return json
}

function formatDistance(value) {
  if (!Number.isFinite(value)) return '—'
  return value < 1000 ? `${Math.round(value)} m` : `${(value / 1000).toFixed(1)} km`
}
function formatTime(value) {
  if (!Number.isFinite(value)) return '—'
  const minutes = Math.max(1, Math.ceil(value / 60))
  return minutes < 60 ? `${minutes} menit` : `${Math.floor(minutes / 60)} jam ${minutes % 60} menit`
}

function MapCanvas({ origin, route, onPickOrigin }) {
  const elementRef = useRef(null)
  const mapRef = useRef(null)
  const originRef = useRef(null)
  const routeRef = useRef(null)
  const latestPick = useRef(onPickOrigin)
  latestPick.current = onPickOrigin

  useEffect(() => {
    if (!elementRef.current) return undefined
    const map = L.map(elementRef.current, { scrollWheelZoom: false }).setView([storeLat, storeLng], 15)
    mapRef.current = map
    L.tileLayer(TILE_URL, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    L.circleMarker([storeLat, storeLng], {
      radius: 10,
      color: '#ffffff',
      weight: 3,
      fillColor: '#895b3d',
      fillOpacity: 1,
    }).addTo(map).bindPopup(STORE_NAME)
    map.on('click', (event) => {
      latestPick.current({ lat: event.latlng.lat, lng: event.latlng.lng, label: 'Titik pilihan di peta' })
    })
    // Leaflet membutuhkan ukuran kontainer sesudah layout selesai.
    requestAnimationFrame(() => { if (mapRef.current === map) map.invalidateSize() })
    return () => {
      map.off()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (originRef.current) map.removeLayer(originRef.current)
    originRef.current = null
    if (origin) {
      originRef.current = L.circleMarker([origin.lat, origin.lng], {
        radius: 9, color: '#ffffff', weight: 3, fillColor: '#34768a', fillOpacity: 1,
      }).addTo(map).bindPopup('Titik awal')
    }
    if (routeRef.current) map.removeLayer(routeRef.current)
    routeRef.current = null
    if (route?.coordinates?.length > 1) {
      const latLngs = route.coordinates.map(([lng, lat]) => [lat, lng])
      routeRef.current = L.polyline(latLngs, { color: '#945e38', weight: 5, opacity: 0.95 }).addTo(map)
      map.fitBounds(routeRef.current.getBounds(), { padding: [36, 36], maxZoom: 16 })
    } else if (origin) {
      map.fitBounds([[origin.lat, origin.lng], [storeLat, storeLng]], { padding: [36, 36], maxZoom: 15 })
    } else {
      map.setView([storeLat, storeLng], 15)
    }
  }, [origin, route])

  return <div className="kuki-location-map__canvas" ref={elementRef} role="application" aria-label="Peta interaktif lokasi Kuki Bakehouse. Klik pada peta untuk memilih titik awal." />
}

export default function KukiLocationMap() {
  const [origin, setOrigin] = useState(null)
  const [route, setRoute] = useState(null)
  const [mode, setMode] = useState('driving-car')
  const [address, setAddress] = useState('')
  const [results, setResults] = useState([])
  const [working, setWorking] = useState('')
  const [message, setMessage] = useState('')
  const activeRequest = useRef(null)
  const locationToken = useRef(0)
  const [locating, setLocating] = useState(false)

  useEffect(() => () => activeRequest.current?.abort(), [])

  function selectOrigin(value) {
    locationToken.current += 1
    setLocating(false)
    activeRequest.current?.abort()
    setWorking('')
    setOrigin(value)
    setResults([])
    setRoute(null)
    setMessage('Titik awal dipilih. Tekan "Tampilkan rute" untuk melihat jalannya.')
  }

  function beginRequest(type) {
    activeRequest.current?.abort()
    const controller = new AbortController()
    activeRequest.current = controller
    setWorking(type)
    setMessage('')
    return controller
  }

  async function searchAddress(event) {
    event.preventDefault()
    const text = address.trim()
    if (text.length < 3) return setMessage('Masukkan alamat minimal 3 karakter.')
    const controller = beginRequest('search')
    setResults([])
    try {
      const data = await requestJson(`${API_BASE}/api/public/kuki-map/geocode?text=${encodeURIComponent(text)}`, {
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      const items = Array.isArray(data.results) ? data.results.filter(item => Number.isFinite(item?.lat) && Number.isFinite(item?.lng)) : []
      setResults(items)
      if (!items.length) setMessage('Alamat belum ditemukan. Coba alamat yang lebih spesifik atau klik langsung pada peta.')
      else setMessage('Pilih salah satu hasil pencarian di bawah agar menjadi titik awal rute.')
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error.message)
    } finally {
      if (activeRequest.current === controller) { activeRequest.current = null; setWorking('') }
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setMessage('Browser tidak mendukung geolocation. Gunakan pencarian alamat atau klik peta.')
    const token = ++locationToken.current
    setLocating(true)
    setMessage('Meminta izin lokasi perangkat…')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (token !== locationToken.current) return
        selectOrigin({ lat: coords.latitude, lng: coords.longitude, label: 'Lokasi perangkat saya' })
      },
      () => {
        if (token !== locationToken.current) return
        setLocating(false)
        setMessage('Lokasi tidak dapat diakses. Pilih titik pada peta atau cari alamat secara manual.')
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
    )
  }

  function changeMode(value) {
    activeRequest.current?.abort()
    activeRequest.current = null
    setWorking('')
    setMode(value)
    setRoute(null)
  }

  async function drawRoute() {
    if (!origin) return setMessage('Pilih titik awal terlebih dahulu.')
    const controller = beginRequest('route')
    setRoute(null)
    try {
      const data = await requestJson(`${API_BASE}/api/public/kuki-map/route`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ lat: origin.lat, lng: origin.lng, mode }),
      })
      if (controller.signal.aborted) return
      if (!Array.isArray(data.coordinates) || data.coordinates.length < 2 || !data.coordinates.every(
        point => Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]),
      )) throw new Error('Rute yang diterima tidak valid.')
      setRoute(data)
      setMessage(data.notice || 'Rute sudah tampil di peta. Waktu tempuh adalah perkiraan, bukan navigasi GPS langsung.')
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error.message)
    } finally {
      if (activeRequest.current === controller) { activeRequest.current = null; setWorking('') }
    }
  }

  return (
    <section id="lokasi-kuki" className="kuki-location-map" aria-labelledby="kuki-location-title">
      <div className="kuki-location-map__heading">
        <span className="kuki-location-map__eyebrow">FIND US · KUKI BAKEHOUSE</span>
        <h2 id="kuki-location-title">Temukan Lokasi Kami</h2>
        <p>Lihat lokasi toko dan rute perjalanan langsung di website.</p>
      </div>
     
        <div className="kuki-location-map__layout">
          <div className="kuki-location-map__controls">
            <h3>{STORE_NAME}</h3>
            <p className="kuki-location-map__address">{STORE_ADDRESS}</p>
            <p className="kuki-location-map__hint">Pilih titik awal dengan klik pada peta, izinkan lokasi perangkat, atau cari alamat.</p>
            <button className="kuki-location-map__secondary" type="button" onClick={useMyLocation} disabled={Boolean(working) || locating}>{locating ? 'Mendeteksi lokasi…' : 'Gunakan lokasi saya'}</button>
            <form onSubmit={searchAddress} className="kuki-location-map__search">
              <label htmlFor="kuki-origin-address">Cari alamat titik awal</label>
              <div className="kuki-location-map__search-row">
                <input id="kuki-origin-address" type="search" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Contoh: Alun-alun Sumedang" maxLength={160} autoComplete="street-address" />
                <button type="submit" disabled={Boolean(working) || address.trim().length < 3}>{working === 'search' ? 'Mencari…' : 'Cari'}</button>
              </div>
            </form>
            {results.length > 0 && (
              <div className="kuki-location-map__results" aria-label="Hasil pencarian alamat">
                {results.map((item, index) => (
                  <button type="button" key={`${index}-${item.lat}-${item.lng}`} onClick={() => selectOrigin(item)}>{item.label}</button>
                ))}
              </div>
            )}
            <div className="kuki-location-map__selected" aria-live="polite">
              <strong>Titik awal:</strong> {origin?.label || 'Belum dipilih'}
            </div>
            <label className="kuki-location-map__mode" htmlFor="kuki-travel-mode">Jenis perjalanan</label>
            <select id="kuki-travel-mode" value={mode} onChange={(event) => changeMode(event.target.value)}>
              {MODES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
            </select>
            <button className="kuki-location-map__primary" type="button" onClick={drawRoute} disabled={!origin || Boolean(working)}>
              {working === 'route' ? 'Menghitung rute…' : 'Tampilkan rute'}
            </button>
            {route && (
              <div className="kuki-location-map__summary" aria-label="Informasi rute">
                <div><span>Jarak</span><strong>{formatDistance(route.distanceMeters)}</strong></div>
                <div><span>Estimasi</span><strong>{formatTime(route.durationSeconds)}</strong></div>
              </div>
            )}
            {message && <p role="status" className="kuki-location-map__notice">{message}</p>}
            <small>Lokasi perangkat hanya diminta saat tombol diklik. Lokasi awal dikirim ke Laravel dan penyedia rute saat kamu meminta rute.</small>
          </div>
          <MapCanvas origin={origin} route={route} onPickOrigin={selectOrigin} />
        </div>
      
    </section>
  )
}
