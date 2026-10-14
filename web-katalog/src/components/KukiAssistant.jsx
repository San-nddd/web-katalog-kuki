import { useCallback, useEffect, useState } from 'react'
import ChatButton from './ChatButton'
import ChatWindow from './ChatWindow'
import { getSessionId, kirimPesanAssistant, mintaHandoverKeAdmin } from '../services/assistantService'
import {
  POLLING_INTERVAL,
  getMessagesFromResponse,
  getStatusFromResponse,
  mergeMessages,
  normalizeMessage,
  obrolanUrl,
} from './chatUtils'

const GREETING_DEFAULT = 'Halo! Saya Kuki Assistant. Ada yang bisa saya bantu tentang Kuki Bakehouse?'
const ERROR_TEXT = 'Maaf, Kuki Assistant sedang mengalami kendala. Silakan coba lagi.'

let messageId = 0
let warned404 = false
const nextId = () => `msg-${Date.now()}-${(messageId += 1)}`

/*
  Entry point Kuki Assistant: floating button + chat window.
  Bisa dikontrol dari luar (halaman Detail Produk) lewat props open/onOpenChange,
  dan bisa diberi konteks produk agar jawaban AI relevan dengan produk yang dilihat.
  Mendukung handover ke Admin ketika AI tidak bisa menjawab.
  Serta fitur polling otomatis pesan admin saat chat terbuka.
  Menetapkan status lifecycle: AI_ACTIVE → WAITING_ADMIN → ADMIN_ACTIVE → CLOSED
*/
function KukiAssistant({ product = null, open: controlledOpen, onOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('AI_ACTIVE') // AI_ACTIVE, WAITING_ADMIN, ADMIN_ACTIVE, CLOSED
  const [showHandover, setShowHandover] = useState(false)
  const [handoverLoading, setHandoverLoading] = useState(false)
  const [handoverError, setHandoverError] = useState('')

  const open = controlledOpen ?? internalOpen

  const setOpen = useCallback(
    (value) => {
      setInternalOpen(value)
      onOpenChange?.(value)
    },
    [onOpenChange],
  )

  const greeting = {
    id: 'greeting',
    sender: 'bot',
    text: product
      ? `Halo! Saya bisa membantu menjelaskan tentang ${product.nama}. Apa yang ingin kamu ketahui?`
      : GREETING_DEFAULT,
  }

  // Sinkronkan riwayat obrolan dari server (sumber kebenaran: database).
  // Dipakai polling, dan dipanggil langsung setelah kirim pesan / handover.
  const syncObrolan = useCallback(async () => {
    try {
      const sessionId = getSessionId()
      if (!sessionId) return

      const response = await fetch(obrolanUrl(sessionId), {
        headers: { Accept: 'application/json' },
      })

      // 404 = sesi ini belum punya obrolan di server (belum ada pesan terkirim),
      // atau route /api/assistant/obrolan/{session} belum ada di Laravel. Beri tahu sekali saja.
      if (response.status === 404) {
        if (!warned404) {
          warned404 = true
          console.warn(`Obrolan tidak ditemukan (404): ${obrolanUrl(sessionId)}`)
        }
        return
      }
      if (!response.ok) throw new Error(`Gagal mengambil obrolan. HTTP ${response.status}`)

      const json = await response.json()
      const serverMessages = getMessagesFromResponse(json).map(normalizeMessage)
      const serverStatus = getStatusFromResponse(json)

      setMessages((prev) => mergeMessages(prev, serverMessages))

      setStatus((prev) => {
        // Status dari server selalu menang.
        if (serverStatus) return serverStatus
        // Tanpa status dari server: adanya pesan Admin berarti obrolan sudah ditangani Admin.
        if (
          prev !== 'CLOSED' &&
          prev !== 'ADMIN_ACTIVE' &&
          serverMessages.some((message) => message.sender === 'admin')
        ) {
          return 'ADMIN_ACTIVE'
        }
        return prev
      })
    } catch (error) {
      // Jangan disembunyikan: error polling harus terlihat saat debugging.
      console.error('Chat polling gagal:', error)
    }
  }, [])

  const handleSend = async (text) => {
    // Saat menunggu / ditangani Admin, pesan Customer bukan untuk AI:
    // jangan tampilkan "Kuki sedang berpikir...".
    const adminHandled = status === 'WAITING_ADMIN' || status === 'ADMIN_ACTIVE'

    setMessages((prev) => [
      ...prev.filter((message) => !message.error),
      { id: nextId(), sender: 'user', text, local: true },
    ])
    setLoading(!adminHandled)
    setShowHandover(false)
    setHandoverError('')

    try {
      const result = await kirimPesanAssistant({
        sessionId: getSessionId(),
        message: text,
        productId: product?.id,
      })

      const needsHandover = result.metadata?.needs_handover === true
      const escalated = result.metadata?.escalated === true

      if (result.reply) {
        setMessages((prev) => [...prev, {
          id: nextId(),
          sender: 'bot',
          text: result.reply,
          metadata: result.metadata,
          needsHandover,
          escalated,
          local: true,
        }])
      }

      if (!adminHandled) {
        // Backend sudah mengalihkan ke Admin (escalated) -> WAITING_ADMIN.
        // Hanya "butuh handover" -> status tetap AI_ACTIVE dan tombol "Minta Bantuan Admin" tampil;
        // status baru berubah setelah permintaan handover benar-benar sukses (handleHandover).
        setStatus(escalated ? 'WAITING_ADMIN' : 'AI_ACTIVE')

        if (needsHandover || escalated) {
          setShowHandover(true)
        }
      }

      syncObrolan()
    } catch (error) {
      const teks =
        error?.message && /kendala|hubung/i.test(error.message) ? error.message : ERROR_TEXT
      setMessages((prev) => [
        ...prev,
        { id: nextId(), sender: 'bot', text: teks, error: true, local: true },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleHandover = async () => {
    setHandoverLoading(true)
    setHandoverError('')

    try {
      await mintaHandoverKeAdmin({
        sessionId: getSessionId(),
        reason: 'Pengguna meminta bantuan admin manusia melalui tombol handover',
      })
      // AI_ACTIVE -> WAITING_ADMIN. Menjadi ADMIN_ACTIVE hanya setelah Admin mengambil obrolan
      // (status dari server / pesan Admin pertama), bukan saat tombol ditekan.
      setStatus('WAITING_ADMIN')
      setShowHandover(false)
      syncObrolan()
    } catch (error) {
      setHandoverError(error.message || 'Gagal meminta handover ke admin. Silakan coba lagi.')
    } finally {
      setHandoverLoading(false)
    }
  }

  // Polling riwayat obrolan selama chat terbuka dan belum CLOSED.
  // Interval dibuat sekali (tidak dibuat ulang setiap pesan berubah).
  const closed = status === 'CLOSED'

  useEffect(() => {
    if (!open || closed) return undefined

    syncObrolan()
    const interval = setInterval(syncObrolan, POLLING_INTERVAL)

    return () => clearInterval(interval)
  }, [open, closed, syncObrolan])

  // Tombol Selesai (Admin hanya)
  const handleSelesai = async () => {
    setStatus('CLOSED')
    // Catat waktu tutup (jika field ada di database)
    // setClosedAt(new Date().toISOString())
    setMessages((prev) => [...prev, {
      id: nextId(),
      sender: 'system',
      text: 'Percakapan ini telah selesai.',
      metadata: { closedAt: new Date().toISOString() },
    }])
  }

  return (
    <>
      {!open && <ChatButton onClick={() => setOpen(true)} />}
      <ChatWindow
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
        escalated={status === 'ADMIN_ACTIVE' ? messages.some(m => m.escalated) : false}
        status={status}  // NEW: kirim status ke ChatWindow
      />
    </>
  )
}

export default KukiAssistant