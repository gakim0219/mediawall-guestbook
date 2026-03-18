function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

const REF_W = 576

export default function MessageBubble({ message, x, y, bubbleW = 576, bubbleH = 264, floatDuration, floatDelay, entering, exiting, isNew }) {
  const { senderName, text, timestamp } = message
  const fs = bubbleW / REF_W  // font scale factor

  const animClass = entering ? 'bubble-enter' : exiting ? 'bubble-exit' : 'bubble-float'

  return (
    <div
      className={animClass}
      style={{
        position: 'absolute',
        left: x - bubbleW / 2,
        top: y - bubbleH / 2,
        width: bubbleW,
        background: 'rgba(255,255,255,0.25)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: isNew ? '1px solid rgba(100,200,255,0.6)' : '1px solid rgba(255,255,255,0.35)',
        borderRadius: 18,
        padding: `${Math.round(22 * fs)}px ${Math.round(29 * fs)}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        boxShadow: isNew ? '0 0 32px rgba(100,200,255,0.5), 0 0 8px rgba(100,200,255,0.3)' : 'none',
        '--float-duration': `${floatDuration}s`,
        '--float-delay': `${floatDelay}s`,
        zIndex: isNew ? 7 : 5,
      }}
    >
      <div style={{
        color: '#FFFFFF',
        fontSize: Math.round(34 * fs),
        fontWeight: 700,
        fontFamily: "'Noto Sans KR', sans-serif",
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {senderName}
      </div>
      <div style={{
        color: '#E0E8F0',
        fontSize: Math.round(29 * fs),
        fontFamily: "'Noto Sans KR', sans-serif",
        fontWeight: 400,
        lineHeight: 1.55,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
      }}>
        {text}
      </div>
      <div style={{ color: '#94A3B8', fontSize: Math.round(22 * fs), fontFamily: "'Noto Sans KR', sans-serif", marginTop: 2 }}>
        {formatTime(timestamp)}
      </div>
    </div>
  )
}
