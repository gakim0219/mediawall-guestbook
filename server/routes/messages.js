import { Router } from 'express'
import { getMessages, getCount, deleteMessage, deleteAllMessages } from '../db.js'
import { broadcastDelete, broadcastDeleteAll } from '../socket.js'

const router = Router()

router.delete('/all', async (req, res) => {
  await deleteAllMessages()
  broadcastDeleteAll()
  res.json({ ok: true })
})

router.delete('/:id', async (req, res) => {
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

export default router
