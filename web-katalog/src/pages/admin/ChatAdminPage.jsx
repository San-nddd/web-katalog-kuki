import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { ambilDaftarObrolan, ambilDetailObrolan, kirimBalasanAdmin, ambilPesanBaru, ambilStatistikObrolan, ambilPertanyaanTidakTerjawab } from '../../services/chatAdminService'
import { SendIcon, AlertCircleIcon, ArrowLeftIcon } from '../../components/icons'
import { api } from '../../services/api'
import './admin.css'

const STATUS_LABEL = {
  waiting: 'Menunggu',
  active: 'Aktif',
  closed: 'Selesai',
  escalated: 'Butuh Admin',
}

const STATUS_CLASS = {
  waiting: 'status-waiting',
  active: 'status-active',
  closed: 'status-closed',
  escalated: 'status-escalated',
}

function AdminChatPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isDetail = Boolean(id)

  const [obrolanList, setObrolanList] = useState([])
  const [selectedObrolan, setSelectedObrolan] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)
  const [unansweredCount, setUnansweredCount] = useState(0)
  const [polling, setPolling] = useState(false)

  const messagesEndRef = useRef(null)
  const replyInputRef = useRef(null)
  const lastMessageIdRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const tandaiDibacaServer = useCallback(async (obrolanId) => {
    try {
      await api.post(`/admin/obrolan/${encodeURIComponent(obrolanId)}/baca`, {})
    } catch {
      // ignore
    }
  }, [])

  const muatDaftar = useCallback(async () => {
    try {
      setLoading(true)
      const data = await ambilDaftarObrolan({ status: 'all', limit: 50 })
      setObrolanList(data.data || data)
      const statData = await ambilStatistikObrolan()
      setStats(statData.data || statData)
      const unanswered = await ambilPertanyaanTidakTerjawab({ limit: 1 })
      setUnansweredCount(unanswered.data?.total || unanswered.total || 0)
      setError('')
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar obrolan')
    } finally {
      setLoading(false)
    }
  }, [])

  const muatDetail = useCallback(async (obrolanId) => {
    try {
      setLoading(true)
      const data = await ambilDetailObrolan(obrolanId)
      const obrolan = data.data || data
      setSelectedObrolan(obrolan)
      setMessages(obrolan.pesan || [])
      lastMessageIdRef.current = obrolan.pesan?.[obrolan.pesan.length - 1]?.id || null
      setError('')
      await tandaiDibacaServer(obrolanId)
      setPolling(true)
    } catch (err) {
      setError(err.message || 'Gagal memuat detail obrolan')
    } finally {
      setLoading(false)
    }
  }, [tandaiDibacaServer])

  const handleKirimBalasan = async (e) => {
    e.preventDefault()
    if (!replyText.trim() || !selectedObrolan || sending) return

    setSending(true)
    try {
      await kirimBalasanAdmin({ obrolanId: selectedObrolan.id, message: replyText.trim() })
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
    setSelectedObrolan(obrolan)
    muatDetail(obrolan.id)
  }

  const handleKembali = () => {
    setSelectedObrolan(null)
    setMessages([])
    setPolling(false)
    navigate('/admin/chat')
  }

  // Polling untuk pesan baru
  useEffect(() => {
    if (!polling || !selectedObrolan) return

    const interval = setInterval(async () => {
      try {
        const data = await ambilPesanBaru(selectedObrolan.id, lastMessageIdRef.current)
        const pesanBaru = data.data || data
        if (pesanBaru.length > 0) {
          setMessages(prev => [...prev, ...pesanBaru])
          lastMessageIdRef.current = pesanBaru[pesanBaru.length - 1].id
        }
      } catch {
        // ignore polling errors
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [polling, selectedObrolan])

  // Auto-refresh daftar obrolan setiap 30 detik
  useEffect(() => {
    if (isDetail) return
    const interval = setInterval(muatDaftar, 30000)
    return () => clearInterval(interval)
  }, [isDetail, muatDaftar])

  useEffect(() => {
    muatDaftar()
    if (isDetail) {
      muatDetail(id)
    }
  }, [id, isDetail, muatDaftar, muatDetail])

  if (isDetail && !selectedObrolan && !loading) {
    return (
      <AdminLayout title="Chat Admin">
        <div className="admin-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Obrolan tidak ditemukan</p>
          <button className="admin-btn admin-btn-primary" onClick={handleKembali}>Kembali ke Daftar</button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={isDetail ? `Chat: ${selectedObrolan?.pengunjung?.nama || selectedObrolan?.session_id || 'Obrolan'}` : 'Chat Admin'}>
      <>
        {error && <div className="admin-alert" role="alert">{error}</div>}

        {!isDetail ? (
          // Daftar Obrolan
          <section className="admin-card">
            <div className="admin-card-head">
              <h2 className="display-font">Kelola Chat</h2>
              <div className="admin-stats-row">
                {stats && (
                  <>
                    <span className="admin-stat"><strong>{stats.total_waiting || 0}</strong> Menunggu</span>
                    <span className="admin-stat"><strong>{stats.total_active || 0}</strong> Aktif</span>
                    <span className="admin-stat"><strong>{stats.total_escalated || 0}</strong> Butuh Admin</span>
                    <span className="admin-stat"><strong>{stats.total_closed || 0}</strong> Selesai</span>
                  </>
                )}
                {unansweredCount > 0 && (
                  <span className="admin-stat admin-stat-warning"><strong>{unansweredCount}</strong> Pertanyaan Tidak Terjawab</span>
                )}
              </div>
            </div>

            {loading ? (
              <p className="admin-empty">Memuat obrolan...</p>
            ) : obrolanList.length === 0 ? (
              <p className="admin-empty">Belum ada obrolan.</p>
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
                      <tr key={obrolan.id} onClick={() => handlePilihObrolan(obrolan)} style={{ cursor: 'pointer' }}>
                        <td>
                          <strong>{obrolan.pengunjung?.nama || 'Pengunjung'}</strong>
                          {obrolan.pengunjung?.email && <small className="admin-sub">{obrolan.pengunjung.email}</small>}
                          {obrolan.product && <span className="admin-badge admin-badge-info">{obrolan.product.nama}</span>}
                        </td>
                        <td>
                          <span className={`admin-badge ${STATUS_CLASS[obrolan.status] || ''}`}>
                            {STATUS_LABEL[obrolan.status] || obrolan.status}
                          </span>
                        </td>
                        <td>
                          <span className="admin-message-preview">
                            {obrolan.pesan_terakhir?.isi || 'Belum ada pesan'}
                          </span>
                        </td>
                        <td>
                          {obrolan.updated_at ? new Date(obrolan.updated_at).toLocaleString('id-ID') : '-'}
                        </td>
                        <td>
                          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={(e) => { e.stopPropagation(); handlePilihObrolan(obrolan); }}>
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
          // Detail Obrolan
          <section className="admin-card">
            <div className="admin-card-head">
              <div className="admin-chat-header">
                <button type="button" className="admin-btn admin-btn-ghost admin-btn-back" onClick={handleKembali}>
                  <ArrowLeftIcon width="16" height="16" /> Kembali
                </button>
                <div className="chat-header-info">
                  <strong>{selectedObrolan?.pengunjung?.nama || 'Pengunjung'}</strong>
                  <small className="admin-sub">
                    {selectedObrolan?.pengunjung?.email || ''}
                    {selectedObrolan?.session_id && <span> • Session: {selectedObrolan.session_id.slice(0, 8)}...</span>}
                  </small>
                  {selectedObrolan?.product && (
                    <span className="admin-badge admin-badge-info" style={{ marginTop: '0.25rem' }}>
                      Produk: {selectedObrolan.product.nama}
                    </span>
                  )}
                </div>
                <div className="chat-header-status">
                  <span className={`admin-badge ${STATUS_CLASS[selectedObrolan?.status] || ''}`}>
                    {STATUS_LABEL[selectedObrolan?.status] || selectedObrolan?.status}
                  </span>
                  {selectedObrolan?.status === 'escalated' && (
                    <span className="admin-badge admin-badge-warning">
                      <AlertCircleIcon width="12" height="12" /> Butuh Tindakan Admin
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="admin-chat-area">
              <div className="admin-chat-messages">
                {loading ? (
                  <div className="admin-chat-loading">Memuat pesan...</div>
                ) : messages.length === 0 ? (
                  <div className="admin-chat-empty">Belum ada pesan dalam obrolan ini.</div>
                ) : (
                  <>
                    {messages.map((pesan) => (
                      <div key={pesan.id} className={`admin-chat-message ${pesan.pengirim === 'admin' ? 'admin' : 'pengunjung'}`}>
                        <div className="admin-chat-message-header">
                          <span className="admin-chat-sender">
                            {pesan.pengirim === 'admin' ? 'Admin' : (pesan.pengirim === 'bot' ? 'Kuki AI' : 'Pengunjung')}
                          </span>
                          <span className="admin-chat-time">
                            {pesan.created_at ? new Date(pesan.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <div className="admin-chat-message-bubble">
                          {pesan.isi}
                          {pesan.metadata && typeof pesan.metadata === 'object' && pesan.metadata.handover && (
                            <div className="admin-handover-notice">
                              <AlertCircleIcon width="14" height="14" />
                              <span>AI menyerahkan ke Admin: {pesan.metadata.alasan || 'Pertanyaan di luar cakupan AI'}</span>
                            </div>
                          )}
                          {pesan.metadata && typeof pesan.metadata === 'object' && pesan.metadata.escalation_reason && (
                            <div className="admin-escalation-notice">
                              <AlertCircleIcon width="14" height="14" />
                              <span>Alasan eskalasi: {pesan.metadata.escalation_reason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <form className="admin-chat-reply-form" onSubmit={handleKirimBalasan}>
                <div className="admin-chat-reply-input">
                  <textarea
                    ref={replyInputRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Ketik balasan Anda..."
                    rows={3}
                    disabled={sending || !selectedObrolan}
                    aria-label="Balasan admin"
                  />
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary admin-chat-send-btn"
                    disabled={sending || !replyText.trim() || !selectedObrolan}
                  >
                    {sending ? (
                      <>
                        <span className="admin-btn-spinner" aria-hidden="true"></span>
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
                {selectedObrolan?.status === 'waiting' && (
                  <p className="admin-chat-hint">
                    Obrolan ini status Menunggu. Balasan Anda akan mengubah status menjadi Aktif.
                  </p>
                )}
              </form>
            </div>
          </section>
        )}
      </>
    </AdminLayout>
  )
}

export default AdminChatPage