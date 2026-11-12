import '../styles/kukiExperience.css'

// These buttons invoke the existing chat backend. No checkout occurs on the public website.
const actions = [
  { key: 'harga', label: 'Harga produk', question: 'Berapa harga produk Kuki Bakehouse?' },
  { key: 'stok', label: 'Stok hari ini', question: 'Produk Kuki Bakehouse apa yang tersedia hari ini?' },
  { key: 'rekomendasi', label: 'Rekomendasi', question: 'Boleh rekomendasikan produk Kuki Bakehouse?' },
  { key: 'lokasi', label: 'Lokasi toko', question: 'Di mana lokasi toko Kuki Bakehouse?' },
  { key: 'pesan', label: 'Cara pesan', question: 'Saya ingin memesan produk Kuki Bakehouse. Tolong hubungkan saya ke Admin.' },
]

export default function KukiQuickQuestions({ onAsk, onDirectAdmin, disabled = false }) {
  return (
    <div className="kuki-experience-faq" aria-label="Pertanyaan yang sering diajukan">
      <strong>Pertanyaan populer</strong>
      <div className="kuki-experience-faq-items">
        {actions.map((item) => (
          <button key={item.key} type="button" onClick={() => onAsk?.(item.question)} disabled={disabled}>
            {item.label}
          </button>
        ))}
        <button type="button" className="kuki-experience-contact" onClick={() => onDirectAdmin?.()} disabled={disabled}>
          Chat Admin langsung
        </button>
      </div>
    </div>
  )
}
