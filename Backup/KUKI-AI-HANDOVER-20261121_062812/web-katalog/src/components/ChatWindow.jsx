import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, BookmarkCheck, X, Trash2, Headset, Send, MapPin, ArrowUpRight } from 'lucide-react'
import { normalizeMessage } from './chatUtils'
import KukiChatProductCards from './KukiChatProductCards'
import KukiChatSuggestions from './KukiChatSuggestions'
import { selectProductsForChat } from './chatProductMatcher.mjs'
import { isStoreLocationQuestion, KUKI_MAP_HREF, KUKI_MAP_SECTION_ID } from './kukiChatIntents.mjs'
import kukiMascot from '../assets/Kuki-Mascot.png'
import './ChatWindow.css'
import './KukiChatUpgrade.css'

const BOTTOM_THRESHOLD = 80

function normalizeForWindow(rawMessage) {
  const normalized = normalizeMessage(rawMessage)
  const rawSender = String(
    rawMessage?.sender ??
      rawMessage?.pengirim ??
      rawMessage?.tipe_pengirim ??
      normalized?.sender ??
      'user',
  ).toLowerCase()

  if (rawSender === 'system' || rawSender === 'sistem') {
    return { ...normalized, sender: 'system' }
  }

  if (rawSender === 'admin') {
    return { ...normalized, sender: 'admin' }
  }

  if (['bot', 'ai', 'assistant'].includes(rawSender)) {
    return { ...normalized, sender: 'bot' }
  }

  return { ...normalized, sender: 'user' }
}

const LIFECYCLE_SYSTEM_TEXTS = [
  'Sedang menghubungkan Anda ke Admin...',
  'Admin sedang belum dapat merespons langsung. Pesan Anda sudah masuk dan akan ditanggapi secepatnya.',
  'Admin Kuki telah bergabung dalam percakapan.',
  'Percakapan ini telah selesai.',
]

function isLifecycleSystemMessage(rawMessage) {
  const text = String(
    rawMessage?.text ??
      rawMessage?.isi ??
      rawMessage?.pesan ??
      rawMessage?.message ??
      '',
  ).trim()

  return LIFECYCLE_SYSTEM_TEXTS.some((item) => text === item)
}

function ChatWindow({
  open,
  onClose,
  messages = [],
  loading = false,
  contextName = null,
  onSend,
  showHandover = false,
  onHandover,
  handoverLoading = false,
  handoverError = '',
  status = 'AI_ACTIVE',
  handoverExpiresAt = null,
  onStartNewConversation,
  catalogProducts = [],
  catalogLoading = false,
  contextProduct = null,
}) {
  const [text, setText] = useState('')
  const [pins, setPins] = useState([])
  const [showHighlights, setShowHighlights] = useState(false)
  const messageNodesRef = useRef(new Map())
  const [now, setNow] = useState(() => Date.now())
  const bodyRef = useRef(null)
  const isNearBottomRef = useRef(true)

  const handoverPending = status === 'HANDOVER_PENDING'
  const waitingForAdmin = status === 'WAITING_ADMIN'
  const handledByAdmin = status === 'ADMIN_ACTIVE'
  const conversationClosed = status === 'CLOSED'
  const aiLocked = handoverPending || waitingForAdmin || handledByAdmin

  // Highlight hanya di memori komponen (reset ketika sesi baru dimulai).

  const pinKey = (message) => `${message.sender}::${message.text}`
  const togglePin = (message) => {
    const key = pinKey(message)
    setPins((prev) => prev.some((p) => p.key === key)
      ? prev.filter((p) => p.key !== key)
      : [...prev, { key, sender: message.sender, text: message.text }])
  }

  const visibleMessages = messages
    .filter((raw) => !isLifecycleSystemMessage(raw))
    .map(normalizeForWindow)

  // Kartu muncul setelah balasan AI untuk pertanyaan produk, bukan pada pesan Admin.
  // Semua data diambil dari API katalog melalui parent KukiAssistant.
  let questionForReply = null
  const messageRows = visibleMessages.map((message) => {
    let cardProducts = []
    if (message.sender === 'user') questionForReply = message.text
    else if (message.sender === 'bot' && questionForReply) {
      if (!message.error && !message.needsHandover && !message.escalated) {
        cardProducts = selectProductsForChat(catalogProducts, questionForReply, contextProduct)
      }
      questionForReply = null
    } else if (message.sender === 'admin') {
      questionForReply = null
    }
    return { message, cardProducts }
  })

  const secondsRemaining = useMemo(() => {
    if (!handoverPending || !handoverExpiresAt) return null

    const expires = new Date(handoverExpiresAt).getTime()
    if (Number.isNaN(expires)) return null

    return Math.max(0, Math.ceil((expires - now) / 1000))
  }, [handoverPending, handoverExpiresAt, now])

  useEffect(() => {
    if (!handoverPending || !handoverExpiresAt) return undefined

    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [handoverPending, handoverExpiresAt])

  const scrollToBottom = (behavior = 'auto') => {
    const body = bodyRef.current
    if (!body) return

    body.scrollTo({
      top: body.scrollHeight,
      behavior,
    })
  }

  const handleBodyScroll = () => {
    const body = bodyRef.current
    if (!body) return

    const distanceFromBottom =
      body.scrollHeight - body.scrollTop - body.clientHeight

    isNearBottomRef.current = distanceFromBottom <= BOTTOM_THRESHOLD
  }

  useEffect(() => {
    if (!open) return

    isNearBottomRef.current = true

    const frame = requestAnimationFrame(() => {
      scrollToBottom()
    })

    return () => cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open || !isNearBottomRef.current) return

    const frame = requestAnimationFrame(() => {
      scrollToBottom('smooth')
    })

    return () => cancelAnimationFrame(frame)
  }, [messages, loading, open, status])

  const handleSubmit = (event) => {
    event.preventDefault()

    const value = text.trim()

    if (!value || loading || handoverLoading || conversationClosed) return
    if (typeof onSend !== 'function') return

    setText('')
    onSend(value)
  }

  const handleMapClick = (event) => {
    // Pada homepage yang sama: scroll langsung tanpa reload.
    // Di halaman detail produk: biarkan anchor /#lokasi-kuki membawa ke homepage.
    const target = document.getElementById(KUKI_MAP_SECTION_ID)
    if (window.location.pathname === '/' && target) {
      event.preventDefault()
      onClose?.()
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const senderLabel = (sender) => {
    if (sender === 'bot') return 'Kuki'
    if (sender === 'admin') return 'Admin'
    if (sender === 'system') return 'Sistem'
    return 'Kamu'
  }

  return (
    <div
      className={`chat-window kuki-chat-v2 ${open ? 'open' : ''}`}
      aria-hidden={!open}
    >
      <div className="chat-header">
        <img className="kuki-chat-mascot" src={kukiMascot} alt="Maskot Kuki Bakehouse" />
        <div className="chat-header-info">
          <span className="kuki-chat-eyebrow">KUKI BAKEHOUSE</span>
          <h3>Kuki Assistant</h3>
          <span className="kuki-chat-presence">
            <span className="kuki-chat-presence-dot" aria-hidden="true" />
            {conversationClosed ? 'Percakapan selesai' : aiLocked ? 'Sedang terhubung ke Admin' : 'Siap bantu pilih menu'}
          </span>
          {contextName && <span className="chat-context">Konteks: {contextName}</span>}
        </div>
        <div className="kuki-chat-header-actions">
          <button type="button" className="kuki-pin-toggle"
            onClick={() => setShowHighlights((v) => !v)}
            aria-expanded={showHighlights} aria-label={`Highlight obrolan (${pins.length})`}
            title="Highlight obrolan">
            <Bookmark size={17} strokeWidth={1.8} aria-hidden="true" />
            {pins.length > 0 && <span className="kuki-pin-count">{pins.length}</span>}
          </button>
          <button type="button" className="chat-close" onClick={onClose} aria-label="Tutup chat"><X size={18} strokeWidth={1.8} aria-hidden="true" /></button>
        </div>
      </div>

      {showHighlights && (
        <aside className="kuki-highlight-panel" aria-label="Pesan yang di-highlight">
          <div className="kuki-highlight-header"><strong><Bookmark size={16} strokeWidth={1.8} aria-hidden="true" /> Highlight obrolan</strong>
            <button type="button" onClick={() => setShowHighlights(false)} aria-label="Tutup highlight"><X size={16} strokeWidth={1.8} aria-hidden="true" /></button>
          </div>
          {pins.length === 0 ? <p>Belum ada pesan yang disimpan. Gunakan tombol bookmark pada pesan penting.</p> : (
            <ul>{pins.map((pin) => (
              <li key={pin.key}>
                <button type="button" onClick={() => {
                  setShowHighlights(false)
                  messageNodesRef.current.get(pin.key)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}><strong>{pin.sender === 'bot' ? 'Kuki' : pin.sender === 'user' ? 'Kamu' : pin.sender === 'admin' ? 'Admin' : 'Sistem'}</strong>
                  <span>{pin.text}</span>
                </button>
                <button type="button" onClick={() => setPins((prev) => prev.filter((p) => p.key !== pin.key))} aria-label="Hapus highlight"><Trash2 size={15} strokeWidth={1.8} aria-hidden="true" /></button>
              </li>
            ))}</ul>
          )}
        </aside>
      )}

      <div
        className="chat-body"
        ref={bodyRef}
        onScroll={handleBodyScroll}
        aria-live="polite"
      >
        {messageRows.map(({ message, cardProducts }, index) => {
          const key = pinKey(message)
          const isPinned = pins.some((pin) => pin.key === key)
          const hasCards = cardProducts.length > 0
          const displayName = senderLabel(message.sender)
          return (
            <Fragment key={`${message.id ?? index}-${index}`}>
              <div
                ref={(node) => {
                  if (node) messageNodesRef.current.set(key, node)
                  else messageNodesRef.current.delete(key)
                }}
                className={[
                  'chat-message', message.sender,
                  message.error ? 'error' : '',
                  message.needsHandover ? 'needs-handover' : '',
                  message.escalated ? 'escalated' : '',
                  hasCards ? 'kuki-chat-product-intro' : '',
                ].filter(Boolean).join(' ')}
              >
                <div className="kuki-message-heading">
                  <span className="chat-sender">{displayName}</span>
                  {message.id !== 'greeting' && !message.error && (
                    <button type="button" className={`kuki-message-pin ${isPinned ? 'is-pinned' : ''}`}
                      aria-label={isPinned ? 'Lepas highlight pesan' : 'Highlight pesan'}
                      aria-pressed={isPinned} onClick={() => togglePin(message)}>
                      {isPinned
                        ? <><BookmarkCheck size={15} strokeWidth={1.8} aria-hidden="true" /><span className="kuki-pin-label">Disimpan</span></>
                        : <Bookmark size={15} strokeWidth={1.8} aria-hidden="true" />}
                    </button>
                  )}
                </div>
                {hasCards ? (
                  <>
                    <p>Ini pilihan produk yang sesuai dari katalog Kuki.</p>
                    <details className="kuki-answer-more">
                      <summary>Baca jawaban AI lengkap</summary>
                      <p>{message.text}</p>
                    </details>
                  </>
                ) : <p>{message.text}</p>}
                {message.metadata?.escalation_reason && (
                  <span className="chat-escalation-reason">{message.metadata.escalation_reason}</span>
                )}
              </div>
              {message.sender === 'user' && isStoreLocationQuestion(message.text) && (
                <div className="kuki-map-link-note">
                  <span>Lokasi toko dan rute tersedia di peta website.</span>
                  <a href={KUKI_MAP_HREF} onClick={handleMapClick} className="kuki-map-link">
                    <MapPin size={16} strokeWidth={1.8} aria-hidden="true" />
                    <span>Lihat peta &amp; rute</span>
                    <ArrowUpRight size={15} strokeWidth={1.8} aria-hidden="true" />
                  </a>
                </div>
              )}
              {hasCards && <KukiChatProductCards products={cardProducts} />}
            </Fragment>
          )
        })}

        {loading && status === 'AI_ACTIVE' && (
          <div className="chat-message bot typing">
            <span className="chat-sender">Kuki</span>
            <p>Kuki sedang berpikir...</p>
          </div>
        )}

        {((showHandover && status === 'AI_ACTIVE') || handoverError) && (
          <div className="chat-handover-area">
            {handoverError && (
              <p className="chat-handover-error">{handoverError}</p>
            )}

            {showHandover && status === 'AI_ACTIVE' && (
              <>
                <button
                  type="button"
                  className="chat-handover-btn"
                  onClick={onHandover}
                  disabled={handoverLoading}
                  aria-label="Minta bantuan admin"
                >
                  {handoverLoading ? (
                    <>
                      <span
                        className="chat-handover-spinner"
                        aria-hidden="true"
                      />
                      Menghubungkan ke Admin...
                    </>
                  ) : (
                    <>
                      <Headset size={16} strokeWidth={1.8} aria-hidden="true" />
                      Minta Bantuan Admin
                    </>
                  )}
                </button>

                <p className="chat-handover-hint">
                  Admin akan bergabung dalam obrolan ini untuk membantu Anda.
                </p>
              </>
            )}
          </div>
        )}

        {handoverPending && (
          <div className="chat-status-notice pending">
            <Headset size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>
              Sedang menghubungkan Anda ke Admin
              {secondsRemaining !== null && secondsRemaining > 0
                ? ` (${secondsRemaining} detik)`
                : '...'}
            </span>
          </div>
        )}

        {waitingForAdmin && (
          <div className="chat-status-notice waiting">
            <Headset size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>
              Admin belum dapat merespons langsung. Pesan Anda sudah masuk dan
              akan ditanggapi secepatnya.
            </span>
          </div>
        )}

        {handledByAdmin && (
          <div className="chat-status-notice active">
            <Headset size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>Obrolan ini sedang ditangani oleh Admin Kuki.</span>
          </div>
        )}

        {conversationClosed && (
          <div className="chat-status-notice closed">
            <span>Percakapan ini telah selesai.</span>

            {typeof onStartNewConversation === 'function' && (
              <button
                type="button"
                className="chat-new-conversation-btn"
                onClick={onStartNewConversation}
              >
                Mulai Percakapan Baru
              </button>
            )}
          </div>
        )}

        {status === 'AI_ACTIVE' && !conversationClosed && (
          <>
            {catalogLoading && <span className="kuki-catalog-loading" role="status">Menyiapkan katalog terbaru…</span>}
            <KukiChatSuggestions
              onAsk={onSend} onAdmin={onHandover}
              disabled={loading || handoverLoading}
            />
          </>
        )}
      </div>

      {!conversationClosed && (
        <form className="chat-input-area" onSubmit={handleSubmit}>
          <input
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={
              aiLocked
                ? 'Tulis pesan untuk Admin...'
                : 'Tulis pertanyaan...'
            }
            aria-label="Tulis pesan"
          />

          <button
            type="submit"
            className="chat-send"
            disabled={loading || handoverLoading || !text.trim()}
            aria-label="Kirim pesan"
          >
            <Send size={17} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </form>
      )}
    </div>
  )
}

export default ChatWindow
