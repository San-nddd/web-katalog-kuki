import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import {
  ambilDaftarObrolan,
  ambilDetailObrolan,
  kirimBalasanAdmin,
  ambilPesanBaru,
  ambilStatistikObrolan,
  ambilPertanyaanTidakTerjawab,
} from '../../services/chatAdminService'
import {
  SendIcon,
  AlertCircleIcon,
  ArrowLeftIcon,
} from '../../components/icons'
import { api } from '../../services/api'
import './admin.css'

const STATUS_LABEL = {
  AI_ACTIVE: 'AI Aktif',
  HANDOVER_PENDING: 'Menunggu Konfirmasi',
  WAITING_ADMIN: 'Menunggu Admin',
  ADMIN_ACTIVE: 'Ditangani Admin',
  CLOSED: 'Selesai',
}

const STATUS_CLASS = {
  AI_ACTIVE: 'status-ai',
  HANDOVER_PENDING: 'status-handover-pending',
  WAITING_ADMIN: 'status-waiting',
  ADMIN_ACTIVE: 'status-active',
  CLOSED: 'status-closed',
}

const MESSAGE_POLL_INTERVAL = 3000
const LIST_POLL_INTERVAL = 3000
const BOTTOM_THRESHOLD = 80

function AdminChatPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isDetail = Boolean(id)

  const [obrolanList, setObrolanList] = useState([])
  const [selectedObrolan, setSelectedObrolan] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [taking, setTaking] = useState(false)
  const [closing, setClosing] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)
  const [unansweredCount, setUnansweredCount] = useState(0)
  const [polling, setPolling] = useState(false)
  const [now, setNow] = useState(Date.now())

  const messagesContainerRef = useRef(null)
  const replyInputRef = useRef(null)
  const lastMessageIdRef = useRef(null)
  const isNearBottomRef = useRef(true)

  const status = selectedObrolan?.status
  const canTake =
    status === 'HANDOVER_PENDING' ||
    status === 'WAITING_ADMIN'
  const canReply = status === 'ADMIN_ACTIVE'
  const isClosed = status === 'CLOSED'

  const secondsRemaining = (() => {
    if (
      status !== 'HANDOVER_PENDING' ||
      !selectedObrolan?.handover_expires_at
    ) {
      return null
    }

    const expires = new Date(selectedObrolan.handover_expires_at).getTime()
    if (Number.isNaN(expires)) return null

    return Math.max(0, Math.ceil((expires - now) / 1000))
  })()

  const scrollToBottom = useCallback((behavior = 'auto') => {
    const container = messagesContainerRef.current
    if (!container) return

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    })
  }, [])

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current
    if (!container) return

    const distance =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight

    isNearBottomRef.current = distance <= BOTTOM_THRESHOLD
  }

  useEffect(() => {
    if (!isNearBottomRef.current) return

    const frame = requestAnimationFrame(() => {
      scrollToBottom('smooth')
    })

    return () => cancelAnimationFrame(frame)
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (status !== 'HANDOVER_PENDING') return undefined

    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [status])

  const tandaiDibacaServer = useCallback(async (obrolanId) => {
    try {
      await api.post(
        `/admin/obrolan/${encodeURIComponent(obrolanId)}/baca`,
        {},
      )
    } catch (err) {
      console.error('Gagal menandai chat dibaca:', err)
    }
  }, [])

  const muatDaftar = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)

      const data = await ambilDaftarObrolan({
        status: 'all',
        limit: 50,
      })

      setObrolanList(data.data || data)

      const statData = await ambilStatistikObrolan()
      setStats(statData.data || statData)

      const unanswered = await ambilPertanyaanTidakTerjawab({
        limit: 1,
      })
      setUnansweredCount(
        unanswered.meta?.total ??
          unanswered.data?.total ??
          unanswered.total ??
          0,
      )

      setError('')
    } catch (err) {
      if (!silent) {
        setError(err.message || 'Gagal memuat daftar obrolan')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  const muatDetail = useCallback(
    async (obrolanId, { silent = false } = {}) => {
      try {
        if (!silent) setLoading(true)

        const data = await ambilDetailObrolan(obrolanId)
        const obrolan = data.data || data

        setSelectedObrolan(obrolan)
        setMessages(obrolan.pesan || [])
        lastMessageIdRef.current =
          obrolan.pesan?.[obrolan.pesan.length - 1]?.id || null

        setError('')

        if (!silent) {
          isNearBottomRef.current = true
          requestAnimationFrame(() => scrollToBottom())
          await tandaiDibacaServer(obrolanId)
        }

        setPolling(true)
      } catch (err) {
        if (!silent) {
          setError(err.message || 'Gagal memuat detail obrolan')
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [scrollToBottom, tandaiDibacaServer],
  )

  const handleAmbilChat = async () => {
    if (!selectedObrolan || taking || !canTake) return

    setTaking(true)
    setError('')

    try {
      await api.post(
        `/admin/obrolan/${encodeURIComponent(selectedObrolan.id)}/ambil`,
        {},
      )
      await muatDetail(selectedObrolan.id)
      replyInputRef.current?.focus()
    } catch (err) {
      setError(err.message || 'Gagal mengambil percakapan')
      await muatDetail(selectedObrolan.id, { silent: true })
    } finally {
      setTaking(false)
    }
  }

  const handleSelesai = async () => {
    if (!selectedObrolan || closing || status !== 'ADMIN_ACTIVE') return

    setClosing(true)
    setError('')

    try {
      await api.post(
        `/admin/obrolan/${encodeURIComponent(selectedObrolan.id)}/selesai`,
        {},
      )
      await muatDetail(selectedObrolan.id)
    } catch (err) {
      setError(err.message || 'Gagal menyelesaikan percakapan')
    } finally {
      setClosing(false)
    }
  }

  const handleKirimBalasan = async (event) => {
    event.preventDefault()

    if (
      !replyText.trim() ||
      !selectedObrolan ||
      sending ||
      status !== 'ADMIN_ACTIVE'
    ) {
      return
    }

    setSending(true)
    setError('')

    try {
      await kirimBalasanAdmin({
        obrolanId: selectedObrolan.id,
        message: replyText.trim(),
      })

      setReplyText('')
      replyInputRef.current?.focus()
      await muatDetail(selectedObrolan.id)
    } catch (err) {
      setError(err.message || 'Gagal mengirim balasan')
    } finally {
      setSending(false)
    }
  }

  const handlePilihObrolan = (obrolan) => {
    navigate(`/admin/chat/${obrolan.id}`)
  }

  const handleKembali = () => {
    setSelectedObrolan(null)
    setMessages([])
    setPolling(false)
    navigate('/admin/chat')
  }

  useEffect(() => {
    if (!polling || !selectedObrolan) return undefined

    const interval = setInterval(async () => {
      try {
        const data = await ambilPesanBaru(
          selectedObrolan.id,
          lastMessageIdRef.current,
        )

        const pesanBaru = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : []

        if (pesanBaru.length > 0) {
          setMessages((prev) => {
            const existing = new Set(prev.map((pesan) => String(pesan.id)))
            const unique = pesanBaru.filter(
              (pesan) => !existing.has(String(pesan.id)),
            )
            return unique.length > 0 ? [...prev, ...unique] : prev
          })

          lastMessageIdRef.current =
            pesanBaru[pesanBaru.length - 1].id
        }

        if (data?.meta?.status) {
          setSelectedObrolan((prev) =>
            prev
              ? {
                  ...prev,
                  status: data.meta.status,
                  handover_expires_at:
                    data.meta.handover_expires_at ?? prev.handover_expires_at,
                }
              : prev,
          )
        }
      } catch (err) {
        console.error('Polling Admin Chat gagal:', err)
      }
    }, MESSAGE_POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [polling, selectedObrolan?.id])

  useEffect(() => {
    if (isDetail) return undefined

    const interval = setInterval(
      () => muatDaftar({ silent: true }),
      LIST_POLL_INTERVAL,
    )

    return () => clearInterval(interval)
  }, [isDetail, muatDaftar])

  useEffect(() => {
    muatDaftar()

    if (isDetail) {
      muatDetail(id)
    }
  }, [id, isDetail, muatDaftar, muatDetail])

  useEffect(() => {
    if (
      status === 'HANDOVER_PENDING' &&
      secondsRemaining === 0 &&
      selectedObrolan?.id
    ) {
      muatDetail(selectedObrolan.id, { silent: true })
    }
  }, [status, secondsRemaining, selectedObrolan?.id, muatDetail])

  const messageClass = (pengirim) => {
    if (pengirim === 'admin') return 'admin'
    if (['bot', 'ai', 'assistant'].includes(pengirim)) return 'ai'
    if (pengirim === 'system') return 'system'
    return 'pengunjung'
  }

  const senderLabel = (pengirim) => {
    if (pengirim === 'admin') return 'Admin'
    if (['bot', 'ai', 'assistant'].includes(pengirim)) return 'Kuki AI'
    if (pengirim === 'system') return 'Sistem'
    return 'Pengunjung'
  }

  if (isDetail && !selectedObrolan && !loading) {
    return (
      <AdminLayout title="Chat Admin">
        <div className="admin-card admin-chat-not-found">
          <p>Obrolan tidak ditemukan</p>
          <button
            className="admin-btn admin-btn-primary"
            onClick={handleKembali}
          >
            Kembali ke Daftar
          </button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      title={
        isDetail
          ? `Chat: ${
              selectedObrolan?.pengunjung?.nama ||
              selectedObrolan?.session_id ||
              'Obrolan'
            }`
          : 'Chat Admin'
      }
    >
      {error && (
        <div className="admin-alert" role="alert">
          {error}
        </div>
      )}

      {!isDetail ? (
        <section className="admin-card">
          <div className="admin-card-head">
            <h2 className="display-font">Kelola Chat</h2>

            <div className="admin-stats-row">
              {stats && (
                <>
                  <span className="admin-stat">
                    <strong>{stats.total_pending || 0}</strong>
                    Menunggu
                  </span>

                  <span className="admin-stat">
                    <strong>{stats.total_active || 0}</strong>
                    Aktif
                  </span>

                  <span className="admin-stat">
                    <strong>{stats.total_closed || 0}</strong>
                    Selesai
                  </span>
                </>
              )}

              {unansweredCount > 0 && (
                <span className="admin-stat admin-stat-warning">
                  <strong>{unansweredCount}</strong>
                  Perlu Tindakan
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <p className="admin-empty">Memuat obrolan...</p>
          ) : obrolanList.length === 0 ? (
            <p className="admin-empty">Belum ada obrolan yang membutuhkan Admin.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Pengunjung</th>
                    <th>Status</th>
                    <th>Pesan Terakhir</th>
                    <th>Waktu</th>
                    <th>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {obrolanList.map((obrolan) => (
                    <tr
                      key={obrolan.id}
                      onClick={() => handlePilihObrolan(obrolan)}
                      className="admin-chat-row"
                    >
                      <td>
                        <strong>
                          {obrolan.pengunjung?.nama || 'Pengunjung'}
                        </strong>

                        {obrolan.pengunjung?.email && (
                          <small className="admin-sub">
                            {obrolan.pengunjung.email}
                          </small>
                        )}

                        {obrolan.product && (
                          <span className="admin-badge admin-badge-info">
                            {obrolan.product.nama}
                          </span>
                        )}
                      </td>

                      <td>
                        <span
                          className={`admin-badge ${
                            STATUS_CLASS[obrolan.status] || ''
                          }`}
                        >
                          {STATUS_LABEL[obrolan.status] || obrolan.status}
                        </span>
                      </td>

                      <td>
                        <span className="admin-message-preview">
                          {obrolan.pesan_terakhir?.isi || 'Belum ada pesan'}
                        </span>
                      </td>

                      <td>
                        {obrolan.updated_at
                          ? new Date(obrolan.updated_at).toLocaleString('id-ID')
                          : '-'}
                      </td>

                      <td>
                        <button
                          className="admin-btn admin-btn-ghost admin-btn-sm"
                          onClick={(event) => {
                            event.stopPropagation()
                            handlePilihObrolan(obrolan)
                          }}
                        >
                          Buka
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className="admin-card">
          <div className="admin-card-head">
            <div className="admin-chat-header">
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-btn-back"
                onClick={handleKembali}
              >
                <ArrowLeftIcon width="16" height="16" />
                Kembali
              </button>

              <div className="admin-chat-header-info">
                <strong>
                  {selectedObrolan?.pengunjung?.nama || 'Pengunjung'}
                </strong>

                <small className="admin-sub">
                  {selectedObrolan?.pengunjung?.email || ''}

                  {selectedObrolan?.session_id && (
                    <span>
                      {' '}
                      • Session: {selectedObrolan.session_id.slice(0, 8)}...
                    </span>
                  )}
                </small>

                {selectedObrolan?.product && (
                  <span className="admin-badge admin-badge-info admin-chat-product-badge">
                    Produk: {selectedObrolan.product.nama}
                  </span>
                )}
              </div>

              <div className="admin-chat-header-status">
                <span
                  className={`admin-badge ${
                    STATUS_CLASS[selectedObrolan?.status] || ''
                  }`}
                >
                  {STATUS_LABEL[selectedObrolan?.status] ||
                    selectedObrolan?.status}
                </span>

                {status === 'HANDOVER_PENDING' && (
                  <span className="admin-badge admin-badge-warning">
                    <AlertCircleIcon width="12" height="12" />
                    {secondsRemaining !== null
                      ? `Konfirmasi ${secondsRemaining}s`
                      : 'Menunggu konfirmasi'}
                  </span>
                )}

                {status === 'WAITING_ADMIN' && (
                  <span className="admin-badge admin-badge-warning">
                    <AlertCircleIcon width="12" height="12" />
                    Pelanggan menunggu
                  </span>
                )}
              </div>
            </div>
          </div>

          {(canTake || status === 'ADMIN_ACTIVE') && (
            <div className="admin-chat-actions-bar">
              {canTake && (
                <>
                  <div>
                    <strong>
                      {status === 'HANDOVER_PENDING'
                        ? 'Pelanggan meminta bantuan Admin.'
                        : 'Pelanggan masih menunggu bantuan.'}
                    </strong>

                    {status === 'HANDOVER_PENDING' &&
                      secondsRemaining !== null && (
                        <small>
                          Sisa waktu konfirmasi cepat: {secondsRemaining} detik
                        </small>
                      )}
                  </div>

                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={handleAmbilChat}
                    disabled={taking}
                  >
                    {taking ? 'Mengambil...' : 'Ambil Chat'}
                  </button>
                </>
              )}

              {status === 'ADMIN_ACTIVE' && (
                <>
                  <div>
                    <strong>Anda sedang menangani percakapan ini.</strong>
                    <small>AI dikunci sampai percakapan selesai.</small>
                  </div>

                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    onClick={handleSelesai}
                    disabled={closing}
                  >
                    {closing ? 'Menyelesaikan...' : 'Selesai'}
                  </button>
                </>
              )}
            </div>
          )}

          <div className="admin-chat-area">
            <div
              className="admin-chat-messages"
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
            >
              {loading ? (
                <div className="admin-chat-loading">Memuat pesan...</div>
              ) : messages.length === 0 ? (
                <div className="admin-chat-empty">
                  Belum ada pesan dalam obrolan ini.
                </div>
              ) : (
                messages.map((pesan) => (
                  <div
                    key={pesan.id}
                    className={`admin-chat-message ${messageClass(
                      pesan.pengirim,
                    )}`}
                  >
                    <div className="admin-chat-message-header">
                      <span className="admin-chat-sender">
                        {senderLabel(pesan.pengirim)}
                      </span>

                      <span className="admin-chat-time">
                        {pesan.created_at
                          ? new Date(pesan.created_at).toLocaleTimeString(
                              'id-ID',
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                              },
                            )
                          : ''}
                      </span>
                    </div>

                    <div className="admin-chat-message-bubble">
                      {pesan.isi}
                    </div>
                  </div>
                ))
              )}
            </div>

            {!isClosed && (
              <form
                className="admin-chat-reply-form"
                onSubmit={handleKirimBalasan}
              >
                <div className="admin-chat-reply-input">
                  <textarea
                    ref={replyInputRef}
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    placeholder={
                      canReply
                        ? 'Ketik balasan Anda...'
                        : 'Ambil chat terlebih dahulu untuk membalas'
                    }
                    rows={3}
                    disabled={sending || !selectedObrolan || !canReply}
                    aria-label="Balasan admin"
                  />

                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary admin-chat-send-btn"
                    disabled={
                      sending ||
                      !replyText.trim() ||
                      !selectedObrolan ||
                      !canReply
                    }
                  >
                    {sending ? (
                      <>
                        <span
                          className="admin-btn-spinner"
                          aria-hidden="true"
                        />
                        Mengirim...
                      </>
                    ) : (
                      <>
                        <SendIcon width="16" height="16" />
                        Kirim
                      </>
                    )}
                  </button>
                </div>

                {canTake && (
                  <p className="admin-chat-hint">
                    Membuka chat tidak mengambil alih percakapan. Klik
                    &quot;Ambil Chat&quot; terlebih dahulu.
                  </p>
                )}
              </form>
            )}

            {isClosed && (
              <div className="admin-chat-closed">
                Percakapan sudah selesai dan tersimpan di riwayat.
              </div>
            )}
          </div>
        </section>
      )}
    </AdminLayout>
  )
}

export default AdminChatPage
