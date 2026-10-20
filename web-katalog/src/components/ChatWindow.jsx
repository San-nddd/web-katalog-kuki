import { useEffect, useMemo, useRef, useState } from 'react'
import { HeadphonesIcon, SendIcon } from './icons'
import { normalizeMessage } from './chatUtils'
import './ChatWindow.css'

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
}) {
  const [text, setText] = useState('')
  const [now, setNow] = useState(Date.now())
  const bodyRef = useRef(null)
  const isNearBottomRef = useRef(true)

  const handoverPending = status === 'HANDOVER_PENDING'
  const waitingForAdmin = status === 'WAITING_ADMIN'
  const handledByAdmin = status === 'ADMIN_ACTIVE'
  const conversationClosed = status === 'CLOSED'
  const aiLocked = handoverPending || waitingForAdmin || handledByAdmin

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

  const senderLabel = (sender) => {
    if (sender === 'bot') return 'Kuki'
    if (sender === 'admin') return 'Admin'
    if (sender === 'system') return 'Sistem'
    return 'Kamu'
  }

  return (
    <div
      className={`chat-window ${open ? 'open' : ''}`}
      aria-hidden={!open}
    >
      <div className="chat-header">
        <div className="chat-header-info">
          <h3>Kuki Assistant</h3>
          {contextName && (
            <span className="chat-context">Konteks: {contextName}</span>
          )}
        </div>

        <button
          type="button"
          className="chat-close"
          onClick={onClose}
          aria-label="Tutup chat"
        >
          ✕
        </button>
      </div>

      <div
        className="chat-body"
        ref={bodyRef}
        onScroll={handleBodyScroll}
        aria-live="polite"
      >
        {messages
          .filter((rawMessage) => !isLifecycleSystemMessage(rawMessage))
          .map((rawMessage) => {
          const message = normalizeForWindow(rawMessage)

          return (
            <div
              key={message.id}
              className={[
                'chat-message',
                message.sender,
                message.error ? 'error' : '',
                message.needsHandover ? 'needs-handover' : '',
                message.escalated ? 'escalated' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={
                message.sender === 'admin'
                  ? {
                      alignSelf: 'flex-start',
                      maxWidth: '85%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.15rem',
                      padding: '0.6rem 0.85rem',
                      background: '#ffffff',
                      color: 'var(--brown-dark)',
                      border: '1px solid var(--brown-deep)',
                      borderRadius: 'var(--radius-sm)',
                      boxShadow: '0 2px 7px rgba(45, 24, 14, 0.08)',
                    }
                  : undefined
              }
            >
              <span className="chat-sender">
                {senderLabel(message.sender)}
              </span>

              <p>{message.text}</p>

              {message.metadata?.escalation_reason && (
                <span className="chat-escalation-reason">
                  {message.metadata.escalation_reason}
                </span>
              )}
            </div>
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
                      <HeadphonesIcon width="16" height="16" />
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
            <HeadphonesIcon width="16" height="16" />
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
            <HeadphonesIcon width="16" height="16" />
            <span>
              Admin belum dapat merespons langsung. Pesan Anda sudah masuk dan
              akan ditanggapi secepatnya.
            </span>
          </div>
        )}

        {handledByAdmin && (
          <div className="chat-status-notice active">
            <HeadphonesIcon width="16" height="16" />
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
            disabled={loading || handoverLoading}
          />

          <button
            type="submit"
            className="chat-send"
            disabled={loading || handoverLoading || !text.trim()}
            aria-label="Kirim pesan"
          >
            <SendIcon width="16" height="16" aria-hidden="true" />
          </button>
        </form>
      )}
    </div>
  )
}

export default ChatWindow
