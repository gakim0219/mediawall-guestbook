import { useBubbleLayout } from '../../hooks/useBubbleLayout.js'
import MessageBubble from './MessageBubble.jsx'

export default function BubbleCanvas({ messages, wallW }) {
  const bubbles = useBubbleLayout(messages, wallW)

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }}>
      {bubbles.map((bubble) => (
        <MessageBubble
          key={bubble.id}
          message={bubble}
          x={bubble.x}
          y={bubble.y}
          bubbleW={bubble.bubbleW}
          bubbleH={bubble.bubbleH}
          floatDuration={bubble.floatDuration}
          floatDelay={bubble.floatDelay}
          entering={bubble.entering}
          exiting={bubble.exiting}
          isNew={bubble.isNew}
        />
      ))}
    </div>
  )
}
