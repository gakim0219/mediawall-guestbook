function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

const BUBBLE_W = 576
const BUBBLE_H = 264

export default function MessageBubble({ message, x, y, floatDuration, floatDelay, entering, exiting, isNew }) {
  const { senderName, text, timestamp } = message

  const animClass = entering ? 'bubble-enter' : exiting ? 'bubble-exit' : 'bubble-float'

  return (
    <div
      className={animClass}
      style={{
        position: 'absolute',
        left: x - BUBBLE_W / 2,
        top: y - BUBBLE_H / 2,
        width: BUBBLE_W,
        background: 'rgba(255,255,255,0.25)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: isNew ? '1px solid rgba(100,200,255,0.6)' : '1px solid rgba(255,255,255,0.35)',
        borderRadius: 18,
        padding: '22px 29px',
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
        fontSize: 34,
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
        fontSize: 29,
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
      <div style={{ color: '#94A3B8', fontSize: 22, fontFamily: "'Noto Sans KR', sans-serif", marginTop: 2 }}>
        {formatTime(timestamp)}
      </div>
    </div>
  )
}
