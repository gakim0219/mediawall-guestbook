import { useState, useEffect, useRef } from 'react'
import { getSocket } from '../services/socket.js'
import { mockMessages } from '../data/mockMessages.js'

const MAX_MESSAGES = 20

export function useMessages() {
  const [messages, setMessages] = useState([])
  const [connected, setConnected] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const loadedRef = useRef(false)
  const lastTimestampRef = useRef(null)

  function updateLastTimestamp(msgs) {
    if (msgs.length > 0) {
      const latest = msgs[msgs.length - 1].timestamp
      if (!lastTimestampRef.current || latest > lastTimestampRef.current) {
        lastTimestampRef.current = latest
      }
    }
  }

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true

      // 히스토리 + 총 개수 병렬 로드
      Promise.all([
        fetch('/api/messages?limit=20').then((r) => r.json()).catch(() => null),
        fetch('/api/messages/count').then((r) => r.json()).catch(() => null),
      ]).then(([data, countData]) => {
        if (countData?.count != null) setTotalCount(countData.count)

        if (Array.isArray(data) && data.length > 0) {
          const sorted = data.reverse().slice(-MAX_MESSAGES)
          updateLastTimestamp(sorted)
          setMessages(sorted)
        } else {
          setMessages(mockMessages.slice(0, MAX_MESSAGES))
          if (!countData?.count) setTotalCount(mockMessages.length)
        }
      })
    }

    const socket = getSocket()

    socket.on('connect', () => {
      setConnected(true)
      if (lastTimestampRef.current) {
        fetch(`/api/messages?after=${encodeURIComponent(lastTimestampRef.current)}&limit=20`)
          .then((r) => r.json())
          .then((data) => {
            if (Array.isArray(data) && data.length > 0) {
              const withNew = data.map((m) => ({ ...m, isNew: true }))
              updateLastTimestamp(withNew)
              setMessages((prev) => {
                const ids = new Set(prev.map((m) => m.id))
                const fresh = withNew.filter((m) => !ids.has(m.id))
                return [...prev, ...fresh].slice(-MAX_MESSAGES)
              })
            }
          })
          .catch(() => {})
      }
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('new_message', (msg) => {
      const newMsg = { ...msg, isNew: true }
      updateLastTimestamp([newMsg])
      setTotalCount((n) => n + 1)
      setMessages((prev) => [...prev, newMsg].slice(-MAX_MESSAGES))
    })

    socket.on('message_deleted', ({ id }) => {
      setTotalCount((n) => Math.max(0, n - 1))
      setMessages((prev) => prev.filter((m) => m.id !== id))
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('new_message')
      socket.off('message_deleted')
    }
  }, [])

  return { messages, connected, totalCount }
}
