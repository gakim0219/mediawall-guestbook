import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function SubmitPage() {
  const [step, setStep] = useState('form') // 'form' | 'success'
  const [senderName, setSenderName] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!senderName.trim() || !text.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/messages/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ingest-Token': 'dev-token',
        },
        body: JSON.stringify({ senderName: senderName.trim(), text: text.trim() }),
      })
      if (res.ok) {
        setStep('success')
      } else {
        const err = await res.json()
        setError(err.error || '전송에 실패했습니다. 다시 시도해주세요.')
      }
    } catch {
      setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const base = {
    minHeight: '100dvh',
    background: 'linear-gradient(160deg, #000a1e 0%, #001235 50%, #000e28 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: "'Noto Sans KR', sans-serif",
    padding: '0 0 max(40px, env(safe-area-inset-bottom)) 0',
  }

  if (step === 'success') {
    return (
      <div style={base}>
        <div style={{
          width: '100%', maxWidth: 480,
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 24px',
          textAlign: 'center',
        }}>
          {/* 체크 아이콘 */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(34,197,94,0.15)',
            border: '2px solid rgba(34,197,94,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 32,
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 16, letterSpacing: '0.02em' }}>
            추모 메시지가 전달되었습니다
          </h2>
          <p style={{ color: '#94A3B8', fontSize: 16, lineHeight: 1.8, marginBottom: 8 }}>
            <strong style={{ color: '#E0E8F0' }}>{senderName}</strong> 님의 소중한 메시지가
          </p>
          <p style={{ color: '#94A3B8', fontSize: 16, lineHeight: 1.8, marginBottom: 40 }}>
            추모 메시지월에 표시됩니다.
          </p>

          <div style={{
            padding: '16px 24px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            marginBottom: 40,
            maxWidth: 360,
          }}>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 8 }}>보내신 메시지</p>
            <p style={{ color: '#E0E8F0', fontSize: 15, lineHeight: 1.7, margin: 0 }}>{text}</p>
          </div>

          <button
            onClick={() => { setStep('form'); setSenderName(''); setText('') }}
            style={{
              padding: '14px 36px', borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#E0E8F0', fontSize: 16,
              cursor: 'pointer',
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          >
            다른 메시지 보내기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={base}>
      {/* 헤더 */}
      <div style={{
        width: '100%',
        padding: '32px 24px 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        maxWidth: 480,
      }}>
        <img
          src="/CI_HD.png"
          alt="HD현대"
          style={{
            height: 36, objectFit: 'contain',
            filter: 'brightness(0) invert(1) opacity(0.8)',
            marginBottom: 28,
          }}
          onError={(e) => { e.target.style.display = 'none' }}
        />

        <div style={{
          width: 1, height: 40,
          background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.2), transparent)',
          marginBottom: 28,
        }} />

        <p style={{
          color: 'rgba(148,163,184,0.8)', fontSize: 14,
          letterSpacing: '0.12em', marginBottom: 12,
        }}>
          故 정주영 현대그룹 회장
        </p>
        <h1 style={{
          color: '#FFFFFF', fontSize: 22, fontWeight: 300,
          letterSpacing: '0.1em', lineHeight: 1.5, marginBottom: 32,
        }}>
          서거 25주기 추모 메시지
        </h1>
      </div>

      {/* 폼 */}
      <div style={{
        width: '100%', maxWidth: 480,
        padding: '0 20px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          padding: '28px 24px',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{
                display: 'block', color: '#64748B',
                fontSize: 13, letterSpacing: '0.05em', marginBottom: 8,
              }}>
                성함
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="홍길동"
                maxLength={50}
                required
                autoComplete="name"
                style={{
                  width: '100%', padding: '14px 16px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12, color: '#fff', fontSize: 16,
                  fontFamily: "'Noto Sans KR', sans-serif",
                  outline: 'none', boxSizing: 'border-box',
                  WebkitAppearance: 'none',
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block', color: '#64748B',
                fontSize: 13, letterSpacing: '0.05em', marginBottom: 8,
              }}>
                추모 메시지
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="삼가 고인의 명복을 빕니다."
                maxLength={300}
                required
                rows={5}
                style={{
                  width: '100%', padding: '14px 16px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12, color: '#fff', fontSize: 16,
                  fontFamily: "'Noto Sans KR', sans-serif",
                  resize: 'none', outline: 'none',
                  boxSizing: 'border-box',
                  WebkitAppearance: 'none',
                  lineHeight: 1.7,
                }}
              />
              <div style={{ color: '#334155', fontSize: 12, textAlign: 'right', marginTop: 4 }}>
                {text.length} / 300
              </div>
            </div>

            {error && (
              <div style={{
                padding: '12px 16px', borderRadius: 10,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#fca5a5', fontSize: 14,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !senderName.trim() || !text.trim()}
              style={{
                padding: '16px',
                background: (loading || !senderName.trim() || !text.trim())
                  ? 'rgba(59,130,246,0.25)'
                  : 'rgba(59,130,246,0.75)',
                border: '1px solid rgba(59,130,246,0.4)',
                borderRadius: 12, color: '#fff',
                fontSize: 16, fontWeight: 700,
                fontFamily: "'Noto Sans KR', sans-serif",
                cursor: (loading || !senderName.trim() || !text.trim()) ? 'not-allowed' : 'pointer',
                letterSpacing: '0.05em',
              }}
            >
              {loading ? '전송 중...' : '추모 메시지 보내기'}
            </button>
          </form>
        </div>

        <p style={{
          color: '#334155', fontSize: 12, textAlign: 'center',
          lineHeight: 1.6, padding: '0 8px',
        }}>
          입력하신 메시지는 추모 메시지월에 실시간으로 표시됩니다.
        </p>
      </div>
    </div>
  )
}
