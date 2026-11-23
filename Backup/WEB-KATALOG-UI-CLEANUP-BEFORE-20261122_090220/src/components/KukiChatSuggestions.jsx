import { CakeSlice, Star, Tag, Cookie, MapPin, Headset } from 'lucide-react'

const SUGGESTIONS = [
  { id: 'catalog', label: 'Lihat menu', icon: CakeSlice, text: 'Tampilkan pilihan produk Kuki Bakehouse yang tersedia.' },
  { id: 'recommend', label: 'Rekomendasi', icon: Star, text: 'Boleh rekomendasikan produk Kuki Bakehouse yang tersedia?' },
  { id: 'price', label: 'Cek harga', icon: Tag, text: 'Apa saja pilihan produk Kuki Bakehouse beserta harganya?' },
  { id: 'tiramisu', label: 'Tiramisu', icon: Cookie, text: 'Ada pilihan tiramisu di Kuki Bakehouse?' },
  { id: 'location', label: 'Lokasi toko', icon: MapPin, text: 'Di mana lokasi Kuki Bakehouse dan jam operasionalnya?' },
]

export default function KukiChatSuggestions({ onAsk, onAdmin, disabled = false }) {
  return (
    <section className="kuki-quick-section" aria-label="Topik yang bisa ditanyakan">
      <p className="kuki-quick-label">Ada yang ingin ditanyakan?</p>
      <div className="kuki-quick-buttons">
        {SUGGESTIONS.map(({ id, label, text, icon: Icon }) => (
          <button key={id} type="button" className="kuki-quick-button"
            onClick={() => onAsk?.(text)} disabled={disabled}>
            <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
        <button type="button" className="kuki-quick-button kuki-quick-admin"
          onClick={() => onAdmin?.()} disabled={disabled}>
          <Headset size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>Tanya Admin</span>
        </button>
      </div>
    </section>
  )
}
