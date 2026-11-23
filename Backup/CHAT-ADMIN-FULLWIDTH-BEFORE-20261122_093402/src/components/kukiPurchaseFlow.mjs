/**
 * Menyimpan satu pesan pembelian dan meminta handover melalui API asli Laravel.
 * requestHandover, sendMessage di-inject agar skenario 404/503 dapat diuji.
 *
 * Batasan kompatibilitas backend lama: jika sesi belum ada, satu permintaan
 * /assistant/chat diperlukan untuk membuat sesi sebelum /handover berhasil.
 * Backend masih dapat menjalankan OpenRouter pada bootstrap; frontend tidak
 * menampilkan balasan bot pada alur pembelian ini.
 */
export async function submitPurchaseWithHandover({
  sessionId,
  message,
  productId,
  requestHandover,
  sendMessage,
}) {
  const reason = 'Pelanggan menyatakan ingin membeli atau memesan produk melalui chat.'
  let handover = null
  let bootstrapNeeded = false

  try {
    handover = await requestHandover({ sessionId, reason })
  } catch (error) {
    if (Number(error?.status) !== 404) throw error
    bootstrapNeeded = true
  }

  let chatError = null
  try {
    await sendMessage({ sessionId, message, productId })
  } catch (error) {
    chatError = error
  }

  if (bootstrapNeeded) {
    // Backend lama bisa menyimpan pesan meski gagal meminta jawaban OpenRouter.
    handover = await requestHandover({ sessionId, reason })
  }

  if (!handover) throw new Error('Permintaan handover belum dikonfirmasi Laravel.')
  return { handover, chatError }
}
