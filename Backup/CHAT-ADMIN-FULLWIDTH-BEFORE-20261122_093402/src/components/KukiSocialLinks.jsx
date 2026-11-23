import { useState } from 'react'
import { FaInstagram, FaTiktok, FaWhatsapp } from 'react-icons/fa6'
import { FiArrowUpRight } from 'react-icons/fi'
import './KukiSocialLinks.css'

const SOCIAL_URLS = {
  instagram: 'https://www.instagram.com/kuki.bake.house?srtk=MXgxNTVmcnZhazNmZw==',
  tiktok: 'https://www.tiktok.com/@kuki.bakehouse?_r=1&_t=ZS-9Ayu12NzCLu',
  whatsapp: 'https://wa.me/6285135243310',
}

function normalizeSocialProfile(platform, rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null

  try {
    const url = new URL(rawUrl.trim())
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
    const host = url.hostname.toLowerCase()
    const path = decodeURIComponent(url.pathname)

    if (platform === 'instagram') {
      if (!['instagram.com', 'www.instagram.com'].includes(host)) return null
      const match = /^\/([A-Za-z0-9._]{1,30})\/?$/.exec(path)
      const reserved = new Set(['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct', 'tv'])
      if (!match || reserved.has(match[1].toLowerCase())) return null
      return `https://www.instagram.com/${match[1]}/`
    }

    if (platform === 'tiktok') {
      if (!['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'].includes(host)) return null
      const match = /^\/@([A-Za-z0-9._]{1,32})\/?$/.exec(path)
      return match ? `https://www.tiktok.com/@${match[1]}` : null
    }

    if (platform === 'whatsapp') {
      if (host === 'wa.me') {
        const match = /^\/(\d{8,18})\/?$/.exec(path)
        return match ? `https://wa.me/${match[1]}` : null
      }

      if (['api.whatsapp.com', 'www.whatsapp.com'].includes(host)) {
        const phone = url.searchParams.get('phone')?.replace(/\D/g, '')
        return phone ? `https://wa.me/${phone}` : null
      }

      return null
    }

    return null
  } catch {
    return null
  }
}

export default function KukiSocialLinks() {
  const [notice, setNotice] = useState('')

  const items = [
    {
      id: 'instagram',
      name: 'Instagram',
      url: SOCIAL_URLS.instagram,
      subtitle: 'Foto produk, menu terbaru, dan kabar toko',
      cta: 'Buka Profil',
      Icon: FaInstagram,
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      url: SOCIAL_URLS.tiktok,
      subtitle: 'Cerita singkat dari dapur Kuki',
      cta: 'Buka Profil',
      Icon: FaTiktok,
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      url: SOCIAL_URLS.whatsapp,
      subtitle: 'Pesan menu favoritmu langsung ke WhatsApp',
      cta: 'Chat Sekarang',
      Icon: FaWhatsapp,
    },
  ]

  function handleVisit(id, name, rawUrl) {
    const url = normalizeSocialProfile(id, rawUrl)
    if (!url) {
      const isEmpty = !rawUrl.trim()
      setNotice(
        isEmpty
          ? `Link ${name} belum diisi. Tambahkan URL akun di SOCIAL_URLS pada KukiSocialLinks.jsx.`
          : `Link ${name} tidak valid. Masukkan URL resmi ${name} dengan awalan https://.`,
      )
      return
    }

    setNotice('')
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="kuki-home-social" id="sosial-kuki" aria-labelledby="kuki-home-social-heading">
      <div className="kuki-home-social__inner">
        <div className="kuki-home-social__intro">
          <span className="kuki-home-social__eyebrow">STAY IN TOUCH</span>
          <h2 className="kuki-home-social__heading" id="kuki-home-social-heading">
            Kuki, di sela <span>harimu.</span>
          </h2>
          <p className="kuki-home-social__description">
            Temukan kabar menu terbaru, momen dari dapur, dan cerita Kuki Bakehouse
            melalui media sosial kami.
          </p>
        </div>

        <div className="kuki-home-social__links">
          <nav className="kuki-home-social__list" aria-label="Media sosial Kuki Bakehouse">
            {items.map(({ id, name, url, subtitle, cta, Icon }, index) => (
              <button
                key={id}
                type="button"
                className="kuki-home-social__item kuki-home-social__item--button"
                onClick={() => handleVisit(id, name, url)}
                aria-label={`${id === 'whatsapp' ? 'Chat' : 'Kunjungi'} ${name} Kuki Bakehouse`}
              >
                <span className="kuki-home-social__number" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="kuki-home-social__platform-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="kuki-home-social__item-copy">
                  <span className="kuki-home-social__platform">{name}</span>
                  <span className="kuki-home-social__subtitle">{subtitle}</span>
                </span>
                <span className="kuki-home-social__cta" aria-hidden="true">
                  {cta} <FiArrowUpRight />
                </span>
              </button>
            ))}
          </nav>
          {notice && <p className="kuki-home-social__feedback" role="status">{notice}</p>}
        </div>
      </div>
    </section>
  )
}
