import { useState, useEffect, useRef, useCallback } from 'react'
import { getSocket } from '../../services/socket.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch { return '' }
}

function getInitial(name) {
  return name ? [...name][0] : '?'
}

function getAvatarColor(name) {
  const colors = ['#1d4ed8','#0369a1','#0f766e','#7c3aed','#be185d','#b45309']
  let hash = 0
  for (const c of (name || '')) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return colors[Math.abs(hash) % colors.length]
}

// ── 삭제 확인 버튼 ──────────────────────────────────────
function DeleteButton({ onConfirm }) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => { onConfirm(); setConfirming(false) }}
          style={{
            padding: '4px 12px', borderRadius: 6, border: 'none',
            background: 'rgba(239,68,68,0.8)', color: '#fff',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Noto Sans KR', sans-serif",
          }}
        >삭제</button>
        <button
          onClick={() => setConfirming(false)}
          style={{
            padding: '4px 10px', borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'transparent', color: '#94A3B8',
            fontSize: 13, cursor: 'pointer',
            fontFamily: "'Noto Sans KR', sans-serif",
          }}
        >취소</button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      style={{
        padding: '4px 12px', borderRadius: 6,
        border: '1px solid rgba(239,68,68,0.3)',
        background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.7)',
        fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
      onMouseEnter={(e) => {
        e.target.style.background = 'rgba(239,68,68,0.2)'
        e.target.style.color = '#fca5a5'
      }}
      onMouseLeave={(e) => {
        e.target.style.background = 'rgba(239,68,68,0.08)'
        e.target.style.color = 'rgba(239,68,68,0.7)'
      }}
    >삭제</button>
  )
}

// ── 전체 삭제 버튼 ──────────────────────────────────────
function DeleteAllButton({ onConfirm, count }) {
  const [confirming, setConfirming] = useState(false)

  if (count === 0) return null

  if (confirming) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => { onConfirm(); setConfirming(false) }}
          style={{
            padding: '6px 14px', borderRadius: 8, border: 'none',
            background: 'rgba(239,68,68,0.8)', color: '#fff',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Noto Sans KR', sans-serif",
          }}
        >전체 삭제 확인</button>
        <button
          onClick={() => setConfirming(false)}
          style={{
            padding: '6px 10px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'transparent', color: '#94A3B8',
            fontSize: 13, cursor: 'pointer',
            fontFamily: "'Noto Sans KR', sans-serif",
          }}
        >취소</button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      style={{
        padding: '6px 14px', borderRadius: 8,
        border: '1px solid rgba(239,68,68,0.3)',
        background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.7)',
        fontSize: 13, cursor: 'pointer',
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >전체 삭제</button>
  )
}

// ── 메시지 행 ────────────────────────────────────────────
function MessageRow({ msg, onDelete, isNew }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        padding: '14px 16px',
        background: isNew ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isNew ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 12,
        transition: 'background 0.5s',
      }}
    >
      {/* 내용 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: "'Noto Sans KR', sans-serif" }}>
            {msg.senderName}
          </span>
          {isNew && (
            <span style={{
              fontSize: 11, padding: '1px 7px', borderRadius: 10,
              background: 'rgba(59,130,246,0.3)', color: '#93c5fd',
              fontWeight: 700,
            }}>NEW</span>
          )}
          <span style={{ color: '#475569', fontSize: 12, marginLeft: 'auto' }}>
            {formatDateTime(msg.timestamp)}
          </span>
        </div>
        <p style={{
          color: '#94A3B8', fontSize: 14, lineHeight: 1.6, margin: 0,
          fontFamily: "'Noto Sans KR', sans-serif",
          wordBreak: 'break-all',
        }}>
          {msg.text}
        </p>
      </div>

      {/* 삭제 버튼 */}
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        <DeleteButton onConfirm={() => onDelete(msg.id)} />
      </div>
    </div>
  )
}

// ── 비밀번호 게이트 ───────────────────────────────────────
function PasswordGate({ onAuth }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`${API_BASE}/api/messages/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        const { token } = await res.json()
        sessionStorage.setItem('admin_token', token)
        onAuth()
      } else {
        setError(true)
        setPassword('')
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000a1e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Noto Sans KR', sans-serif",
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 360,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: '40px 32px',
      }}>
        <h2 style={{
          color: '#fff', fontSize: 20, fontWeight: 700,
          textAlign: 'center', marginBottom: 8,
        }}>
          관리자 인증
        </h2>
        <p style={{
          color: '#475569', fontSize: 14, textAlign: 'center', marginBottom: 32,
        }}>
          비밀번호를 입력하세요
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            placeholder="비밀번호"
            autoFocus
            style={{
              width: '100%', padding: '12px 16px',
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 10, color: '#fff', fontSize: 16,
              fontFamily: "'Noto Sans KR', sans-serif",
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          {error && (
            <div style={{
              color: '#fca5a5', fontSize: 14, textAlign: 'center',
            }}>
              비밀번호가 올바르지 않습니다.
            </div>
          )}
          <button
            type="submit"
            style={{
              padding: '12px', borderRadius: 10,
              background: 'rgba(59,130,246,0.7)',
              border: '1px solid rgba(59,130,246,0.4)',
              color: '#fff', fontSize: 15, fontWeight: 700,
              fontFamily: "'Noto Sans KR', sans-serif",
              cursor: 'pointer',
            }}
          >
            로그인
          </button>
        </form>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function AdminForm() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!sessionStorage.getItem('admin_token')
  )
  const [senderName, setSenderName] = useState('')
  const [text, setText] = useState('')
  const [submitStatus, setSubmitStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const [messages, setMessages] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [connected, setConnected] = useState(false)
  const [search, setSearch] = useState('')
  const [newIds, setNewIds] = useState(new Set())
  const [activeTab, setActiveTab] = useState('form') // 'form' | 'list'

  const windowWidth = useWindowWidth()
  const isMobile = windowWidth < 768

  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const PAGE_SIZE = 100

  const loadMessages = useCallback(() => {
    setHasMore(true)
    fetch(`${API_BASE}/api/messages?limit=${PAGE_SIZE}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(data)
          if (data.length < PAGE_SIZE) setHasMore(false)
        }
      })
      .catch(() => {})
    fetch(`${API_BASE}/api/messages/count`)
      .then((r) => r.json())
      .then((d) => { if (d?.count != null) setTotalCount(d.count) })
      .catch(() => {})
  }, [])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    fetch(`${API_BASE}/api/messages?limit=${PAGE_SIZE}&offset=${messages.length}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setMessages((prev) => [...prev, ...data])
          if (data.length < PAGE_SIZE) setHasMore(false)
        } else {
          setHasMore(false)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }, [loadingMore, hasMore, messages.length])

  useEffect(() => {
    if (!isAuthenticated) return
    loadMessages()
    const socket = getSocket()
    socket.on('connect', () => {
      setConnected(true)
      // 재연결 시 최신 데이터로 갱신
      loadMessages()
    })
    socket.on('disconnect', () => setConnected(false))
    socket.on('new_message', (msg) => {
      setMessages((prev) => [msg, ...prev])
      setTotalCount((n) => n + 1)
      setNewIds((prev) => new Set([...prev, msg.id]))
      setTimeout(() => setNewIds((prev) => { const s = new Set(prev); s.delete(msg.id); return s }), 5000)
    })
    socket.on('message_deleted', ({ id }) => {
      setMessages((prev) => prev.filter((m) => m.id !== id))
      setTotalCount((n) => Math.max(0, n - 1))
    })
    socket.on('all_messages_deleted', () => {
      setMessages([])
      setTotalCount(0)
    })
    return () => {
      socket.off('connect'); socket.off('disconnect')
      socket.off('new_message'); socket.off('message_deleted')
      socket.off('all_messages_deleted')
    }
  }, [isAuthenticated, loadMessages])

  if (!isAuthenticated) {
    return <PasswordGate onAuth={() => setIsAuthenticated(true)} />
  }

  const adminToken = sessionStorage.getItem('admin_token') || ''

  async function handleSubmit(e) {
    e.preventDefault()
    if (!senderName.trim() || !text.trim()) return
    setLoading(true)
    setSubmitStatus(null)
    try {
      const res = await fetch(`${API_BASE}/api/messages/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderName: senderName.trim(), text: text.trim() }),
      })
      if (res.ok) {
        setSubmitStatus({ type: 'success', msg: '메시지가 전송되었습니다!' })
        setSenderName('')
        setText('')
      } else {
        const err = await res.json()
        setSubmitStatus({ type: 'error', msg: err.error || '전송 실패' })
      }
    } catch {
      setSubmitStatus({ type: 'error', msg: '서버 연결 실패' })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    try {
      await fetch(`${API_BASE}/api/messages/${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Token': adminToken },
      })
    } catch {
      alert('삭제 실패')
    }
  }

  async function handleDeleteAll() {
    try {
      await fetch(`${API_BASE}/api/messages/all`, {
        method: 'DELETE',
        headers: { 'X-Admin-Token': adminToken },
      })
    } catch {
      alert('전체 삭제 실패')
    }
  }

  const filtered = messages.filter((m) =>
    !search || m.senderName.includes(search) || m.text.includes(search)
  )

  // ── 입력 폼 패널 ─────────────────────────────────────────
  const FormPanel = (
    <div style={{
      ...(isMobile ? { width: '100%', padding: '24px 16px' } : {
        width: 360, flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.08)',
        padding: '32px 28px', overflowY: 'auto',
      }),
    }}>
      <h2 style={{ color: '#E0E8F0', fontSize: 16, fontWeight: 700, marginBottom: 24 }}>
        메시지 입력
      </h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ color: '#64748B', fontSize: 13, display: 'block', marginBottom: 6 }}>이름</label>
          <input
            type="text" value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="홍길동" maxLength={50} required
            style={{
              width: '100%', padding: '10px 14px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, color: '#fff', fontSize: 16,
              fontFamily: "'Noto Sans KR', sans-serif", outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <label style={{ color: '#64748B', fontSize: 13, display: 'block', marginBottom: 6 }}>메시지</label>
          <textarea
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder="도전과 개척의 정신, 정주영 회장님을 기억합니다" maxLength={65} required rows={5}
            style={{
              width: '100%', padding: '10px 14px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, color: '#fff', fontSize: 16,
              fontFamily: "'Noto Sans KR', sans-serif",
              resize: 'vertical', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ color: '#334155', fontSize: 12, textAlign: 'right', marginTop: 3 }}>
            {text.length} / 65
          </div>
        </div>
        <button
          type="submit" disabled={loading}
          style={{
            padding: '11px', borderRadius: 8,
            background: loading ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.7)',
            border: '1px solid rgba(59,130,246,0.4)',
            color: '#fff', fontSize: 15, fontWeight: 700,
            fontFamily: "'Noto Sans KR', sans-serif",
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '전송 중...' : '메시지 전송'}
        </button>
        {submitStatus && (
          <div style={{
            padding: '10px 14px', borderRadius: 8,
            background: submitStatus.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${submitStatus.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: submitStatus.type === 'success' ? '#86efac' : '#fca5a5',
            fontSize: 14,
          }}>
            {submitStatus.msg}
          </div>
        )}
      </form>
    </div>
  )

  // ── 목록 패널 ─────────────────────────────────────────────
  const ListPanel = (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
    }}>
      {/* 검색 바 */}
      <div style={{
        padding: isMobile ? '12px 16px' : '16px 28px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <input
          type="text" value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름 또는 메시지 검색..."
          style={{
            flex: 1, padding: '9px 14px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, color: '#fff', fontSize: 14,
            fontFamily: "'Noto Sans KR', sans-serif", outline: 'none',
          }}
        />
        <span style={{ color: '#475569', fontSize: 13, flexShrink: 0 }}>
          {filtered.length}건
        </span>
      </div>

      {/* 목록 */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: isMobile ? '12px 16px' : '16px 28px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {filtered.length === 0 ? (
          <div style={{ color: '#334155', fontSize: 15, padding: '40px 0', textAlign: 'center' }}>
            {search ? '검색 결과가 없습니다.' : '메시지가 없습니다.'}
          </div>
        ) : (
          filtered.map((msg) => (
            <MessageRow
              key={msg.id}
              msg={msg}
              onDelete={handleDelete}
              isNew={newIds.has(msg.id)}
            />
          ))
        )}
        {hasMore && !search && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              padding: '12px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: '#94A3B8', fontSize: 14,
              cursor: loadingMore ? 'not-allowed' : 'pointer',
              fontFamily: "'Noto Sans KR', sans-serif",
              marginTop: 4,
            }}
          >
            {loadingMore ? '불러오는 중...' : '이전 메시지 더 보기'}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000a1e',
      fontFamily: "'Noto Sans KR', sans-serif",
      overflow: 'auto',
    }}>
      {/* 헤더 */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: isMobile ? '14px 16px' : '20px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,10,30,0.8)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ color: '#fff', fontSize: isMobile ? 16 : 20, fontWeight: 700, margin: 0 }}>
            추모 메시지 관리
          </h1>
          <span style={{
            padding: '3px 12px', borderRadius: 20,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#94A3B8', fontSize: 13,
          }}>
            총 <strong style={{ color: '#fff' }}>{totalCount.toLocaleString('ko-KR')}</strong>건
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16 }}>
          <button
            onClick={async () => {
              try {
                await fetch(`${API_BASE}/api/messages/admin/refresh-wall`, {
                  method: 'POST',
                  headers: { 'X-Admin-Token': adminToken },
                })
              } catch {}
            }}
            style={{
              padding: '6px 14px', borderRadius: 8,
              border: '1px solid rgba(59,130,246,0.3)',
              background: 'rgba(59,130,246,0.08)', color: 'rgba(59,130,246,0.8)',
              fontSize: 13, cursor: 'pointer',
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          >Wall 새로고침</button>
          <DeleteAllButton onConfirm={handleDeleteAll} count={totalCount} />
          {!isMobile && (
            <a href="/wall" target="_blank" style={{
              padding: '7px 16px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)', color: '#E0E8F0',
              fontSize: 14, textDecoration: 'none',
            }}>미디어월 →</a>
          )}
          {isMobile && (
            <a href="/wall" target="_blank" style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)', color: '#E0E8F0',
              fontSize: 16, textDecoration: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>↗</a>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: connected ? '#22c55e' : '#ef4444',
              boxShadow: connected ? '0 0 8px #22c55e' : 'none',
            }} />
            <span style={{ color: connected ? '#86efac' : '#fca5a5', fontSize: 12 }}>
              {connected ? 'LIVE' : 'OFF'}
            </span>
          </div>
        </div>
      </div>

      {isMobile ? (
        /* ── 모바일: 탭 레이아웃 ── */
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 57px)' }}>
          {/* 탭 버튼 */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            {[
              { key: 'form', label: '메시지 입력' },
              { key: 'list', label: '메시지 목록' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  flex: 1, padding: '12px',
                  background: activeTab === key ? 'rgba(59,130,246,0.15)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === key ? '2px solid rgba(59,130,246,0.7)' : '2px solid transparent',
                  color: activeTab === key ? '#93c5fd' : '#475569',
                  fontSize: 14, fontWeight: activeTab === key ? 700 : 400,
                  fontFamily: "'Noto Sans KR', sans-serif",
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {/* 탭 내용 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'form' ? FormPanel : ListPanel}
          </div>
        </div>
      ) : (
        /* ── 데스크탑: side-by-side 레이아웃 ── */
        <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 65px)' }}>
          {FormPanel}
          {ListPanel}
        </div>
      )}
    </div>
  )
}
