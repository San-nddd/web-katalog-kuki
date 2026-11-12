/**
 * Pendeteksi intent yang deterministik, tanpa LLM dan tanpa mengubah pesan user.
 * Ini adalah gerbang UX: otoritas status handover tetap pada Laravel.
 */
export function normalizeChatIntentText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('id-ID')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isPurchaseIntent(message) {
  const text = normalizeChatIntentText(message)
  if (!text) return false

  // Jangan menghubungkan Admin bila pelanggan hanya bertanya atau membatalkan.
  if (/\b(tidak|tak|nggak|ngga|gak|ga|enggak|belum|jangan|batal|cancel|hanya|cuma)\s+(?:jadi\s+)?(?:mau\s+|ingin\s+|akan\s+|berniat\s+)?(?:beli|membeli|pesan|memesan|order|checkout|pre\s*order|ambil)\b/.test(text)) return false
  if (/\b(?:gak|nggak|tidak|belum)\s+jadi\s+(?:beli|pesan|order|ambil)\b/.test(text)) return false
  if (/^(?:(?:apa|gimana|bagaimana|cara|apakah|bisakah|bisa|bolehkah|boleh|berapa|dimana|di mana|kapan|kalau|jika|misal|andaikan)\b)/.test(text)) return false
  if (/\b(?:cara|bagaimana|gimana|tutorial|prosedur|syarat|langkah)\s+(?:untuk\s+)?(?:beli|membeli|pesan|memesan|order|checkout)\b/.test(text)) return false
  if (/\b(?:pengen|ingin|mau)\s+(?:tahu|tau|nanya|bertanya|lihat|cek|mengetahui)\b/.test(text)) return false
  if (/\b(?:kalau|jika|andaikan|seandainya)\s+(?:saya|aku|kita)?\s*(?:mau|ingin|jadi)?\s*(?:beli|memesan|pesan|order|checkout)\b/.test(text)) return false

  return [
    /\b(?:aku|saya|kami|kita|gue|gw|sy|aq)\s+(?:(?:sudah|udah|jadi|fix|langsung|sekarang)\s+)?(?:mau|ingin|pengen|hendak|akan|berniat)\s+(?:langsung\s+)?(?:beli|membeli|pesan|memesan|order|checkout|pre\s*order|po|ambil)\b/,
    /\b(?:mau|ingin|pengen|hendak)\s+(?:langsung\s+)?(?:beli|membeli|pesan|memesan|order|checkout|pre\s*order|po)\b/,
    /\b(?:jadi|fix|langsung|siap|oke|ok|deal)\s+(?:mau\s+|ingin\s+)?(?:beli|membeli|pesan|memesan|order|checkout|ambil)\b/,
    /\b(?:tolong|mohon|bantu)\s+(?:saya\s+|aku\s+)?(?:pesankan|orderkan|buatkan\s+pesanan)\b/,
    /\b(?:saya|aku|kami|kita)\s+(?:pesan|order|ambil)\s+(?!(?:info|informasi|tanya|kabar|pesan)\b)(?:\d+|[a-z]{3,})\b/,
    /^(?:beli|pesan|order)\s+(?:\d+|satu|dua|tiga|sebuah|satu\s+box)\b/,
  ].some((pattern) => pattern.test(text))
}

export function isStoreLocationQuestion(message) {
  const text = normalizeChatIntentText(message)
  if (!text) return false
  // Alamat email/alamat kirim pelanggan bukan pertanyaan lokasi toko.
  if (/\b(?:alamat\s+(?:email|e\s*mail|pengiriman|saya|rumah|penerima)|email\s+toko)\b/.test(text)
      && !/\b(?:alamat\s+toko|lokasi\s+toko|lokasi\s+kuki|dimana\s+kuki)\b/.test(text)) return false
  return [
    /\b(?:alamat|lokasi|maps|peta|rute|petunjuk\s+jalan|arah\s+ke\s+toko|arah\s+jalan)\b/,
    /\b(?:di\s+mana|dimana|ke\s+mana|kemana)\s+(?:letak\s+)?(?:toko|kuki|bakehouse)\b/,
    /\b(?:toko|kuki|bakehouse)\s+(?:itu\s+)?(?:di\s+mana|dimana)\b/,
    /\b(?:jalan|pergi|menuju|datang)\s+ke\s+(?:toko\s+)?kuki\b/,
  ].some((pattern) => pattern.test(text))
}

export const KUKI_MAP_SECTION_ID = 'lokasi-kuki'
export const KUKI_MAP_HREF = '/#lokasi-kuki'
