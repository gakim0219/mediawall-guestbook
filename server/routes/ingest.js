import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { insertMessages } from '../db.js'
import { broadcast } from '../socket.js'

const router = Router()
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-secret'

// ── 배치 메시지 큐 ──────────────────────────────────────────
const queue = []
let flushTimer = null
const FLUSH_INTERVAL = 200  // 200ms마다 큐 비우기
const MAX_QUEUE_SIZE = 2000 // 큐 최대 길이
const BATCH_SIZE = 50       // 한번에 최대 50건 배치 쓰기

function enqueue(msg) {
  if (queue.length >= MAX_QUEUE_SIZE) {
    console.warn(`Queue full (${MAX_QUEUE_SIZE}), dropping message`)
    return false
  }
  queue.push(msg)
  // 즉시 브로드캐스트 (DB 저장과 무관하게 Wall에 바로 표시)
  broadcast(msg)
  // 플러시 타이머 시작
  if (!flushTimer) scheduleFlush()
  return true
}

function scheduleFlush() {
  flushTimer = setTimeout(flushQueue, FLUSH_INTERVAL)
}

async function flushQueue() {
  flushTimer = null
  if (queue.length === 0) return

  const batch = queue.splice(0, BATCH_SIZE)
  try {
    await insertMessages(batch)
  } catch (err) {
    console.error(`Failed to flush ${batch.length} messages:`, err)
  }

  // 아직 큐에 남아있으면 다음 플러시 예약
  if (queue.length > 0) scheduleFlush()
}

// ── Rate Limiting (초당 2건 per IP — 행사장 공유 WiFi 대응) ──
const rateMap = new Map()
const RATE_WINDOW = 5000  // 5초
const RATE_LIMIT = 10     // 5초당 10건 (초당 2건)

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

// ── 큐 모니터링 (30초마다) ───────────────────────────────────
setInterval(() => {
  if (queue.length > 0) {
    console.log(`[Ingest] Queue depth: ${queue.length}/${MAX_QUEUE_SIZE}`)
  }
}, 30000)

// ──────────────────────────────────────────────────────────

router.post('/', (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many requests, please wait' })
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
