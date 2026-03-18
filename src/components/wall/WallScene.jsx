import { useMessages } from '../../hooks/useMessages.js'
import BubbleCanvas from './BubbleCanvas.jsx'
import TitleOverlay from './TitleOverlay.jsx'
import { useState, useEffect, useRef } from 'react'

// /wall 페이지는 스크롤 잠금
if (typeof document !== 'undefined') {
  document.body.style.overflow = 'hidden'
}

const WALL_H = 1152

export default function WallScene() {
  const { messages, connected, totalCount } = useMessages()
  const [wallW, setWallW] = useState(() =>
    typeof window !== 'undefined'
      ? Math.round(WALL_H * (window.innerWidth / window.innerHeight))
      : 2048
  )
  const [scale, setScale] = useState(1)
  const [flash, setFlash] = useState(false)
  const prevCountRef = useRef(0)

  // Auto-scale: 캔버스 너비를 뷰포트 비율에 맞춰 동적 계산
  useEffect(() => {
    function updateDims() {
      const ar = window.innerWidth / window.innerHeight
      setWallW(Math.round(WALL_H * ar))
      setScale(window.innerHeight / WALL_H)
    }
    updateDims()
    window.addEventListener('resize', updateDims)
    return () => window.removeEventListener('resize', updateDims)
  }, [])

  // Flash on new incoming message (not on initial load)
  useEffect(() => {
    const newCount = messages.filter((m) => m.isNew).length
    if (newCount > prevCountRef.current && prevCountRef.current >= 0) {
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 900)
      return () => clearTimeout(t)
    }
    prevCountRef.current = newCount
  }, [messages])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#000a1e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        className="wall-container"
        style={{
          width: wallW,
          height: WALL_H,
          position: 'relative',
          overflow: 'hidden',
          backgroundImage: 'url(/background3.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#000a1e',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0,
        }}
      >
        {/* Dark overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,10,30,0.45)', zIndex: 0 }} />

        {/* New-message flash */}
        {flash && (
          <div
            className="new-message-flash"
            style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}
          />
        )}

        <TitleOverlay totalCount={totalCount} wallW={wallW} />
        <BubbleCanvas messages={messages} wallW={wallW} />

        {/* Connection indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: 14,
            right: 48,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: connected ? '#22c55e' : '#ef4444',
              boxShadow: connected ? '0 0 10px #22c55e' : 'none',
            }}
          />
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 20, fontFamily: "'Noto Sans KR', sans-serif" }}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>
    </div>
  )
}
