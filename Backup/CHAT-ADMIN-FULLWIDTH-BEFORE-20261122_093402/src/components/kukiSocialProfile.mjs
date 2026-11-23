// Pure helper: URL valid -> link profil; URL kosong/tidak valid -> jangan dirender.
// Tidak melakukan request jaringan atau mengakses data pelanggan.

const HOSTS = {
  instagram: new Set(['instagram.com', 'www.instagram.com']),
  tiktok: new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com']),
}

const INSTAGRAM_BLOCKED = new Set([
  'p', 'reel', 'reels', 'stories', 'explore', 'accounts',
  'direct', 'tv', 'about', 'developer', 'legal', 'privacy', 'tags',
])

export function normalizeSocialProfile(platform, rawUrl) {
  if (!Object.hasOwn(HOSTS, platform) || typeof rawUrl !== 'string') return null
  const input = rawUrl.trim()
  if (!input) return null

  try {
    const url = new URL(input)
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
    if (!HOSTS[platform].has(url.hostname.toLowerCase())) return null
    if (url.search || url.hash) return null

    const path = decodeURIComponent(url.pathname)
    if (platform === 'instagram') {
      const match = path.match(/^\/([A-Za-z0-9._]{1,30})\/?$/)
      if (!match || INSTAGRAM_BLOCKED.has(match[1].toLowerCase())) return null
      return `https://www.instagram.com/${match[1]}/`
    }

    // TikTok menggunakan path profil /@username, bukan path video /@username/video/...
    const match = path.match(/^\/@([A-Za-z0-9._]{1,32})\/?$/)
    return match ? `https://www.tiktok.com/@${match[1]}` : null
  } catch {
    return null
  }
}
