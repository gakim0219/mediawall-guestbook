import { Router } from 'express'
import { getMessages, getCount, deleteMessage } from '../db.js'
import { broadcastDelete } from '../socket.js'

const router = Router()

router.delete('/:id', (req, res) => {
  const { id } = req.params
  const result = deleteMessage(id)
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' })
  broadcastDelete(id)
  res.json({ ok: true })
})

router.get('/count', (req, res) => {
  res.json({ count: getCount() })
})

router.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100)
  const offset = parseInt(req.query.offset) || 0
  const after = req.query.after || null
  const messages = getMessages({ limit, offset, after })
  res.json(messages)
})

export default router
