import { useEffect, useRef, useState } from 'react'
import { HeadphonesIcon, SendIcon } from './icons'
import { normalizeMessage } from './chatUtils'
import './ChatWindow.css'

const BOTTOM_THRESHOLD = 80

function ChatWindow({
  open,
  onClose,

  // State messages berasal dari parent (polling & sinkronisasi ada di KukiAssistant).
  messages = [],

  loading = false,
  contextName = null,
  onSend,

  showHandover = false,
  onHandover,
  handoverLoading = false,
  handoverError = '',

  escalated = false,
  status = 'AI_ACTIVE',
}) {
  const [text, setText] = useState('')

  const bodyRef = useRef(null)

  // True jika user sedang berada dekat bagian bawah chat.
  const isNearBottomRef = useRef(true)

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
      body.scrollHeight -
      body.scrollTop -
      body.clientHeight

    isNearBottomRef.current =
      distanceFromBottom <= BOTTOM_THRESHOLD
  }

  // Saat widget pertama kali dibuka, arahkan ke pesan terbaru.
  useEffect(() => {
    if (!open) return

    isNearBottomRef.current = true

    const frame = requestAnimationFrame(() => {
      scrollToBottom()
    })

    return () => cancelAnimationFrame(frame)
  }, [open])

  // Jika message baru masuk dan user masih berada dekat bottom,
  // otomatis scroll ke bawah.
  //
  // Kalau user sedang membaca history di atas,
  // JANGAN paksa kembali ke bawah.
  useEffect(() => {
    if (!open) return
    if (!isNearBottomRef.current) return

    const frame = requestAnimationFrame(() => {
      scrollToBottom('smooth')
    })

    return () => cancelAnimationFrame(frame)
  }, [messages, loading, open])

  const handleSubmit = (event) => {
    event.preventDefault()

    const value = text.trim()

    if (!value) return
    if (loading) return
    if (handoverLoading) return
    if (status === 'CLOSED') return
    if (typeof onSend !== 'function') return

    setText('')
    onSend(value)
  }

  const waitingForAdmin =
    status === 'WAITING_ADMIN'

  const handledByAdmin =
    status === 'ADMIN_ACTIVE' ||
    escalated

  const conversationClosed =
    status === 'CLOSED'

  return (
    <div
      className={`chat-window ${open ? 'open' : ''}`}
      aria-hidden={!open}
    >
      {/* HEADER */}
      <div className="chat-header">
        <div className="chat-header-info">
          <h3>Kuki Assistant</h3>

          {contextName && (
            <span className="chat-context">
              Konteks: {contextName}
            </span>
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

      {/* MESSAGE AREA */}
      <div
        className="chat-body"
        ref={bodyRef}
        onScroll={handleBodyScroll}
        aria-live="polite"
      >
        {messages.map((rawMessage) => {
          const message =
            normalizeMessage(rawMessage)

          return (
            <div
              key={message.id}
              className={[
                'chat-message',
                message.sender,
                message.error ? 'error' : '',
                message.needsHandover
                  ? 'needs-handover'
                  : '',
                message.escalated
                  ? 'escalated'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="chat-sender">
                {message.sender === 'bot'
                  ? 'Kuki'
                  : message.sender === 'admin'
                    ? 'Admin Kuki'
                    : 'Kamu'}
              </span>

              <p>{message.text}</p>

              {message.metadata
                ?.escalation_reason && (
                <span className="chat-escalation-reason">
                  {
                    message.metadata
                      .escalation_reason
                  }
                </span>
              )}
            </div>
          )
        })}

        {/* LOADING AI */}
        {loading && (
          <div className="chat-message bot typing">
            <span className="chat-sender">
              Kuki
            </span>

            <p>Kuki sedang berpikir...</p>
          </div>
        )}

        {/* HANDOVER BUTTON */}
        {(
          (
            showHandover &&
            !waitingForAdmin &&
            !handledByAdmin
          ) ||
          handoverError
        ) && (
          <div className="chat-handover-area">
            {handoverError && (
              <p className="chat-handover-error">
                {handoverError}
              </p>
            )}

            {showHandover &&
              !waitingForAdmin &&
              !handledByAdmin && (
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
                        Menghubungkan ke
                        Admin...
                      </>
                    ) : (
                      <>
                        <HeadphonesIcon
                          width="16"
                          height="16"
                        />
                        Minta Bantuan Admin
                      </>
                    )}
                  </button>

                  <p className="chat-handover-hint">
                    Admin akan bergabung
                    dalam obrolan ini untuk
                    membantu Anda.
                  </p>
                </>
              )}
          </div>
        )}

        {/* WAITING ADMIN */}
        {waitingForAdmin && (
          <div className="chat-escalated-notice">
            <HeadphonesIcon
              width="16"
              height="16"
            />

            <span>
              Permintaan Anda sudah dikirim
              ke Admin. Silakan tunggu
              balasan.
            </span>
          </div>
        )}

        {/* ADMIN ACTIVE */}
        {handledByAdmin &&
          !waitingForAdmin &&
          !conversationClosed && (
            <div className="chat-escalated-notice">
              <HeadphonesIcon
                width="16"
                height="16"
              />

              <span>
                Obrolan ini sedang ditangani
                oleh Admin Kuki.
              </span>
            </div>
          )}

        {/* CLOSED */}
        {conversationClosed && (
          <div className="chat-escalated-notice">
            <span>
              Percakapan ini telah selesai.
            </span>
          </div>
        )}
      </div>

      {/* INPUT */}
      {status !== 'CLOSED' && (
        <form
          className="chat-input-area"
          onSubmit={handleSubmit}
        >
          <input
            type="text"
            value={text}
            onChange={(event) =>
              setText(event.target.value)
            }
            placeholder={
              handledByAdmin ||
              waitingForAdmin
                ? 'Tulis pesan untuk Admin...'
                : 'Tulis pertanyaan...'
            }
            aria-label="Tulis pesan"
            disabled={
              loading ||
              handoverLoading
            }
          />

          <button
            type="submit"
            className="chat-send"
            disabled={
              loading ||
              handoverLoading ||
              !text.trim()
            }
            aria-label="Kirim pesan"
          >
            <SendIcon
              width="16"
              height="16"
              aria-hidden="true"
            />
          </button>
        </form>
      )}
    </div>
  )
}

export default ChatWindow