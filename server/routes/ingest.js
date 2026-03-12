import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { insertMessage } from '../db.js'
import { broadcast } from '../socket.js'

const router = Router()
const INGEST_TOKEN = process.env.INGEST_TOKEN || 'dev-token'

// ── 메시지 큐 ────────────────────────────────────────────
const queue = []
let processing = false
const PROCESS_INTERVAL = 150 // ms between processing each message

function enqueue(msg) {
  queue.push(msg)
  if (!processing) processNext()
}

function processNext() {
  if (queue.length === 0) {
    processing = false
    return
  }
  processing = true
  const msg = queue.shift()
  try {
    insertMessage(msg)
    broadcast(msg)
  } catch (err) {
    console.error('Failed to process message:', err)
  }
  setTimeout(processNext, PROCESS_INTERVAL)
}

// ──────────────────────────────────────────────────────────

router.post('/', (req, res) => {
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

  enqueue(msg)

  res.status(201).json({ ok: true, id: msg.id, queued: queue.length })
})

export default router
