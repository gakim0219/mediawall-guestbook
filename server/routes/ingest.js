import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { insertMessage } from '../db.js'
import { broadcast } from '../socket.js'

const router = Router()
const INGEST_TOKEN = process.env.INGEST_TOKEN || 'dev-token'

// ── 메시지 큐 ────────────────────────────────────────────
const queue = []
let processing = false
const PROCESS_INTERVAL = 50   // ms between processing each message (~20 msgs/sec)
const MAX_QUEUE_SIZE = 1000   // 큐 최대 길이

function enqueue(msg) {
  if (queue.length >= MAX_QUEUE_SIZE) {
    console.warn(`Queue full (${MAX_QUEUE_SIZE}), dropping message`)
    return false
  }
  queue.push(msg)
  if (!processing) processNext()
  return true
}

async function processNext() {
  if (queue.length === 0) {
    processing = false
    return
  }
  processing = true
  const msg = queue.shift()
  try {
    await insertMessage(msg)
    broadcast(msg)
  } catch (err) {
    console.error('Failed to process message:', err)
  }
  setTimeout(processNext, PROCESS_INTERVAL)
}

// ── IP Rate Limiting (10초당 3건) ─────────────────────────
const rateMap = new Map()
const RATE_WINDOW = 10000 // 10초
const RATE_LIMIT = 3      // 윈도우당 최대 요청 수

function isRateLimited(ip) {
  const now = Date.now()
  const record = rateMap.get(ip)
  if (!record || now - record.windowStart > RATE_WINDOW) {
    rateMap.set(ip, { windowStart: now, count: 1 })
    return false
  }
  record.count++
  return record.count > RATE_LIMIT
}

// 5분마다 오래된 rate 기록 정리
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of rateMap) {
    if (now - record.windowStart > RATE_WINDOW * 2) rateMap.delete(ip)
  }
}, 300000)

// ──────────────────────────────────────────────────────────

router.post('/', (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many requests, please wait' })
  }

  const token = req.headers['x-ingest-token']
  if (token !== INGEST_TOKEN && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { senderName, text, avatarUrl } = req.body
  if (!senderName || !text) {
    return res.status(400).json({ error: 'senderName and text are required' })
  }

  const msg = {
    id: uuidv4(),
    senderName: String(senderName).slice(0, 50),
    avatarUrl: avatarUrl || null,
    text: String(text).slice(0, 65),
    timestamp: new Date().toISOString(),
    source: 'manual',
  }

  const accepted = enqueue(msg)
  if (!accepted) {
    return res.status(503).json({ error: 'Server busy, try again later' })
  }

  res.status(201).json({ ok: true, id: msg.id, queued: queue.length })
})

export default router
