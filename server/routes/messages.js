import { Router } from 'express'
import { getMessages, getCount, deleteMessage, deleteAllMessages } from '../db.js'
import { broadcastDelete, broadcastDeleteAll, broadcastRefresh } from '../socket.js'

const router = Router()
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-secret'

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token']
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

router.delete('/all', requireAdmin, async (req, res) => {
  await deleteAllMessages()
  broadcastDeleteAll()
  res.json({ ok: true })
})

router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  const result = await deleteMessage(id)
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' })
  broadcastDelete(id)
  res.json({ ok: true })
})

router.get('/count', async (req, res) => {
  const count = await getCount()
  res.json({ count })
})

router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100)
  const offset = parseInt(req.query.offset) || 0
  const after = req.query.after || null
  const messages = await getMessages({ limit, offset, after })
  res.json(messages)
})

// ── Admin 로그인 (비밀번호 검증) ────────────────────────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'HD12345'

router.post('/admin/refresh-wall', requireAdmin, (req, res) => {
  broadcastRefresh()
  res.json({ ok: true })
})

router.post('/admin/login', (req, res) => {
  const { password } = req.body
  if (password === ADMIN_PASSWORD) {
    return res.json({ ok: true, token: ADMIN_TOKEN })
  }
  res.status(401).json({ error: 'Invalid password' })
})

export default router
