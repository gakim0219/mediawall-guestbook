import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export default function TitleOverlay({ totalCount = 0, wallW = 2048 }) {
  const [submitUrl, setSubmitUrl] = useState('')

  useEffect(() => {
    setSubmitUrl(`${window.location.origin}/submit`)
  }, [])

  const now = new Date()
  const dateStr = now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const titleScale = Math.min(1, wallW / 2400)

  return (
    <>
      {/* 좌상단 타이틀 + 티커 + QR */}
      <div style={{
        position: 'absolute',
        top: 48,
        left: 64,
        zIndex: 10,
        width: 760,
        transform: `scale(${titleScale})`,
        transformOrigin: 'top left',
      }}>
        {/* 타이틀 */}
        <div style={{
          fontFamily: "'HyundaiSans', 'Noto Sans KR', sans-serif",
          fontWeight: 700,
          fontSize: 68,
          letterSpacing: '0.1em',
          color: '#FFFFFF',
          lineHeight: 1.3,
          textShadow: '0 2px 20px rgba(0,0,0,0.8)',
        }}>
          아산 정주영 창업자
        </div>
        <div style={{
          fontFamily: "'HyundaiSans', 'Noto Sans KR', sans-serif",
          fontWeight: 500,
          fontSize: 44,
          letterSpacing: '0.15em',
          color: 'rgba(200,220,240,0.8)',
          marginTop: 8,
          textShadow: '0 2px 12px rgba(0,0,0,0.8)',
        }}>
          서거 25주기
        </div>
        <div style={{
          fontFamily: "'Noto Sans KR', sans-serif",
          fontWeight: 300,
          fontSize: 22,
          color: 'rgba(148,163,184,0.7)',
          marginTop: 10,
          letterSpacing: '0.05em',
        }}>
          {dateStr}
        </div>

        {/* 구분선 */}
        <div style={{
          width: 120,
          height: 1,
          background: 'linear-gradient(to right, rgba(255,255,255,0.3), transparent)',
          margin: '32px 0 0',
        }} />

        {/* 누적 메시지 건수 */}
        <div style={{
          marginTop: 36,
          display: 'inline-block',
          background: 'rgba(255,255,255,0.13)',
          borderRadius: 14,
          padding: '10px 20px',
        }}>
          <span style={{ color: 'rgba(200,220,240,0.85)', fontSize: 33, fontFamily: "'Noto Sans KR', sans-serif" }}>
            현재까지 온 메시지
          </span>
          {' '}
          <span
            key={totalCount}
            className="count-number"
            style={{ color: '#FFFFFF', fontSize: 42, fontWeight: 700, fontFamily: "'Noto Sans KR', sans-serif", fontVariantNumeric: 'tabular-nums' }}
          >
            {totalCount.toLocaleString('ko-KR')}
          </span>
          <span style={{ color: 'rgba(200,220,240,0.85)', fontSize: 33, fontFamily: "'Noto Sans KR', sans-serif" }}>
            건
          </span>
        </div>

        {/* QR 코드 */}
        {submitUrl && (
          <div style={{ marginTop: 48, display: 'flex', alignItems: 'flex-start', gap: 20 }}>
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: 12,
              display: 'inline-flex',
              boxShadow: '0 0 32px rgba(100,160,255,0.2)',
            }}>
              <QRCodeSVG
                value={submitUrl}
                size={200}
                bgColor="#ffffff"
                fgColor="#000a1e"
                level="M"
              />
            </div>
            <div style={{ paddingTop: 8 }}>
              <div style={{
                color: '#FFFFFF',
                fontSize: 34,
                fontWeight: 700,
                fontFamily: "'Noto Sans KR', sans-serif",
                marginBottom: 10,
                letterSpacing: '0.05em',
              }}>
                추모 메시지 남기기
              </div>
              <div style={{
                color: 'rgba(148,163,184,0.7)',
                fontSize: 17,
                fontFamily: "'Noto Sans KR', sans-serif",
                lineHeight: 1.6,
              }}>
                QR 코드를 스캔하여<br/>
                추모 메시지를 보내주세요
              </div>
              <div style={{
                marginTop: 12,
                color: 'rgba(100,150,200,0.6)',
                fontSize: 15,
                fontFamily: "monospace",
                letterSpacing: '0.03em',
              }}>
                {submitUrl}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 우측 상단 HD 로고 */}
      <div style={{
        position: 'absolute',
        top: 48,
        right: 64,
        zIndex: 10,
      }}>
        <img
          src="/HD_LOGO_CI.png"
          alt="HD Logo"
          style={{
            height: 80,
            width: 'auto',
            opacity: 0.85,
            filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.5))',
          }}
        />
      </div>

{/* 하단 바 */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 56,
        background: 'rgba(0,10,30,0.6)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 64,
        paddingRight: 64,
        zIndex: 10,
      }}>
        <span style={{
          fontFamily: "'Noto Sans KR', sans-serif",
          fontSize: 20,
          color: 'rgba(148,163,184,0.6)',
          letterSpacing: '0.08em',
        }}>
          아산 정주영 창업자 서거 25주기 · {dateStr}
        </span>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.12)', margin: '0 48px' }} />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 19, color: 'rgba(148,163,184,0.55)' }}>총</span>
          <span
            key={totalCount}
            className="count-number"
            style={{
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: 26, fontWeight: 700, color: '#FFFFFF',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {totalCount.toLocaleString('ko-KR')}
          </span>
          <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 19, color: 'rgba(148,163,184,0.55)' }}>
            건의 추모 메시지
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.35 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#94A3B8' }} />
          ))}
        </div>
      </div>
    </>
  )
}
