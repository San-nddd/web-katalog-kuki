import { useCallback, useEffect, useRef, useState } from 'react'
import ChatButton from './ChatButton'
import ChatWindow from './ChatWindow'
import { getProduk } from '../services/produkService'
import { isPurchaseIntent } from './kukiChatIntents.mjs'
import { submitPurchaseWithHandover } from './kukiPurchaseFlow.mjs'
import {
  getSessionId,
  buatSession,
  kirimPesanAssistant,
  mintaHandoverKeAdmin,
} from '../services/assistantService'
import {
  POLLING_INTERVAL,
  getMessagesFromResponse,
  getStatusFromResponse,
  mergeMessages,
  normalizeMessage,
  obrolanUrl,
} from './chatUtils'

const GREETING_DEFAULT =
  'Halo! Saya Kuki Assistant. Ada yang bisa saya bantu tentang Kuki Bakehouse?'
const ERROR_TEXT =
  'Maaf, Kuki Assistant sedang mengalami kendala. Silakan coba lagi.'

const AI_LOCKED_STATUSES = new Set([
  'HANDOVER_PENDING',
  'WAITING_ADMIN',
  'ADMIN_ACTIVE',
])

let messageId = 0
let warned404 = false
const nextId = () => `msg-${Date.now()}-${(messageId += 1)}`

function KukiAssistant({ product = null, open: controlledOpen, onOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('AI_ACTIVE')
  const [handoverExpiresAt, setHandoverExpiresAt] = useState(null)
  const [showHandover, setShowHandover] = useState(false)
  const [handoverLoading, setHandoverLoading] = useState(false)
  const [handoverError, setHandoverError] = useState('')
  const [catalogProducts, setCatalogProducts] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogLoaded, setCatalogLoaded] = useState(false)
  const [conversationVersion, setConversationVersion] = useState(0)
  const sendingRef = useRef(false)
  const purchaseHandoverRef = useRef(false)

  const open = controlledOpen ?? internalOpen

  const setOpen = useCallback(
    (value) => {
      setInternalOpen(value)
      onOpenChange?.(value)
    },
    [onOpenChange],
  )

  // Produk dari Laravel, bukan mock data; gagal muat tidak mengganggu chat.
  useEffect(() => {
    if (!open || catalogLoaded) return undefined
    let active = true
    setCatalogLoading(true)
    getProduk()
      .then((data) => {
        if (!active) return
        setCatalogProducts(Array.isArray(data) ? data : [])
        setCatalogLoaded(true)
      })
      .catch((error) => {
        if (active) console.warn('Katalog untuk chat belum dapat dimuat:', error)
      })
      .finally(() => { if (active) setCatalogLoading(false) })
    return () => { active = false }
  }, [open, catalogLoaded])

  const greeting = {
    id: 'greeting',
    sender: 'bot',
    text: product
      ? `Halo! Saya bisa membantu menjelaskan tentang ${product.nama}. Apa yang ingin kamu ketahui?`
      : GREETING_DEFAULT,
  }

  const syncObrolan = useCallback(async () => {
    try {
      const sessionId = getSessionId()
      if (!sessionId) return

      const response = await fetch(obrolanUrl(sessionId), {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      if (response.status === 404) {
        if (!warned404) {
          warned404 = true
          console.warn(`Obrolan tidak ditemukan (404): ${obrolanUrl(sessionId)}`)
        }
        return
      }

      if (!response.ok) {
        throw new Error(`Gagal mengambil obrolan. HTTP ${response.status}`)
      }

      const json = await response.json()
      const serverMessages = getMessagesFromResponse(json).map(normalizeMessage)
      const serverStatus = getStatusFromResponse(json)
      const expiresAt = json?.data?.handover_expires_at ?? null

      // Jangan masukkan hasil polling dari sesi lama setelah mulai obrolan baru.
      if (getSessionId() !== sessionId) return

      setMessages((prev) => mergeMessages(prev, serverMessages))

      // Selama auto-handover, abaikan hasil polling AI_ACTIVE yang sudah kedaluwarsa.
      if (serverStatus && !(purchaseHandoverRef.current && serverStatus === 'AI_ACTIVE')) {
        setStatus(serverStatus)
      }

      setHandoverExpiresAt(expiresAt)

      if (serverStatus && serverStatus !== 'AI_ACTIVE') {
        setShowHandover(false)
      }
    } catch (error) {
      console.error('Chat polling gagal:', error)
    }
  }, [])

  /**
   * Saat pelanggan secara eksplisit ingin membeli, panggil handover Laravel ASLI.
   * - Sesi sudah ada: handover dulu, lalu simpan pesan ke chat yang terkunci AI.
   * - Sesi baru: endpoint handover lama mengembalikan 404. Bootstrap dengan
   *   tepat SATU request chat, lalu ulang handover.
   * Tidak menampilkan balasan AI produk pada proses checkout/pemesanan manual.
   */
  const handlePurchaseHandover = async (message, sessionId) => {
    const { handover: result, chatError } = await submitPurchaseWithHandover({
      sessionId,
      message,
      productId: product?.id,
      requestHandover: mintaHandoverKeAdmin,
      sendMessage: kirimPesanAssistant,
    })

    if (getSessionId() !== sessionId) return

    if (!result) throw new Error('Permintaan handover belum mendapat konfirmasi server.')
    setStatus(result.status || 'HANDOVER_PENDING')
    setHandoverExpiresAt(result.handover_expires_at ?? null)
    setShowHandover(false)

    if (chatError) {
      setHandoverError(
        'Admin sudah dihubungi, tetapi penyimpanan pesan belum dapat dipastikan. Periksa riwayat sebelum mengirim ulang.',
      )
    }
    void syncObrolan()
  }

  const handleSend = async (text) => {
    if (sendingRef.current || handoverLoading || status === 'CLOSED') return
    const sessionId = getSessionId()
    const aiLocked = AI_LOCKED_STATUSES.has(status)
    const purchaseIntent = !aiLocked && isPurchaseIntent(text)

    sendingRef.current = true
    if (purchaseIntent) purchaseHandoverRef.current = true

    setMessages((prev) => [
      ...prev.filter((message) => !message.error),
      { id: nextId(), sender: 'user', text, local: true },
    ])
    setLoading(!aiLocked && !purchaseIntent)
    setHandoverLoading(purchaseIntent)
    setHandoverError('')
    if (!aiLocked) setShowHandover(false)

    try {
      if (purchaseIntent) {
        await handlePurchaseHandover(text, sessionId)
        return
      }

      // Jalur chat normal tetap menggunakan endpoint dan logika lama.
      const result = await kirimPesanAssistant({
        sessionId,
        message: text,
        productId: product?.id,
      })

      if (getSessionId() !== sessionId) return
      const nextStatus = getStatusFromResponse(result) ?? status
      const needsHandover = result.metadata?.needs_handover === true
      const escalated = result.metadata?.escalated === true

      if (result.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            sender: result.sender || 'bot',
            text: result.reply,
            metadata: result.metadata,
            needsHandover,
            escalated,
            local: true,
          },
        ])
      }

      setStatus(nextStatus)
      setHandoverExpiresAt(result.handover_expires_at ?? null)
      if (nextStatus === 'AI_ACTIVE' && (needsHandover || escalated)) {
        setShowHandover(true)
      } else if (nextStatus !== 'AI_ACTIVE') {
        setShowHandover(false)
      }
      void syncObrolan()
    } catch (error) {
      if (getSessionId() !== sessionId) return
      if (purchaseIntent) {
        // Jangan mengaku handover berhasil tanpa konfirmasi Laravel.
        setShowHandover(true)
        setHandoverError(
          'Belum berhasil menghubungkan ke Admin. Coba tombol Minta Bantuan Admin atau periksa koneksi.',
        )
      } else if (!aiLocked) {
        const teks = error?.message && /kendala|hubung/i.test(error.message)
          ? error.message : ERROR_TEXT
        setMessages((prev) => [...prev, {
          id: nextId(), sender: 'bot', text: teks, error: true, local: true,
        }])
      } else {
        setMessages((prev) => [...prev, {
          id: nextId(), sender: 'system',
          text: 'Pesan belum berhasil dikirim. Silakan coba lagi.',
          error: true, local: true,
        }])
      }
    } finally {
      sendingRef.current = false
      purchaseHandoverRef.current = false
      setLoading(false)
      setHandoverLoading(false)
    }
  }

  const handleHandover = async () => {
    setHandoverLoading(true)
    setHandoverError('')

    try {
      const result = await mintaHandoverKeAdmin({
        sessionId: getSessionId(),
        reason: 'Pengguna meminta bantuan admin manusia melalui tombol handover',
      })

      setStatus(result.status || 'HANDOVER_PENDING')
      setHandoverExpiresAt(result.handover_expires_at ?? null)
      setShowHandover(false)

      // Status handover sudah diterima; sinkronisasi berjalan di background.
      void syncObrolan()
    } catch (error) {
      setHandoverError(
        error.message || 'Gagal meminta handover ke admin. Silakan coba lagi.',
      )
    } finally {
      setHandoverLoading(false)
    }
  }

  const handleStartNewConversation = () => {
    setConversationVersion((version) => version + 1)
    // Ganti session ID terlebih dahulu agar polling berikutnya
    // tidak mengambil percakapan CLOSED sebelumnya.
    buatSession()

    setMessages([])
    setStatus('AI_ACTIVE')
    setHandoverExpiresAt(null)
    setShowHandover(false)
    setHandoverError('')
    setLoading(false)
  }

  useEffect(() => {
    if (!open) return undefined

    syncObrolan()
    const interval = setInterval(syncObrolan, POLLING_INTERVAL)

    return () => clearInterval(interval)
  }, [open, syncObrolan])

  return (
    <>
      {!open && <ChatButton onClick={() => setOpen(true)} />}

      <ChatWindow
        key={conversationVersion}
        open={open}
        onClose={() => setOpen(false)}
        messages={[greeting, ...messages]}
        loading={loading}
        contextName={product?.nama || null}
        onSend={handleSend}
        showHandover={showHandover}
        onHandover={handleHandover}
        handoverLoading={handoverLoading}
        handoverError={handoverError}
        status={status}
        handoverExpiresAt={handoverExpiresAt}
        onStartNewConversation={handleStartNewConversation}
        catalogProducts={catalogProducts}
        catalogLoading={catalogLoading}
        contextProduct={product}
      />
    </>
  )
}

export default KukiAssistant
