import { Router } from 'express'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { parseKakaoWorkPayload } from '../adapters/kakaowork.js'
import { insertMessage } from '../db.js'
import { broadcast } from '../socket.js'

const router = Router()
const KAKAOWORK_SECRET = process.env.KAKAOWORK_SECRET || ''

function verifyHmac(req) {
  if (!KAKAOWORK_SECRET) return true // skip in dev
  const sig = req.headers['x-kakaowork-signature'] || ''
  const hmac = crypto
    .createHmac('sha256', KAKAOWORK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex')
  return sig === hmac
}

router.post('/webhook', async (req, res) => {
  if (!verifyHmac(req)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const canonical = parseKakaoWorkPayload(req.body)
  if (!canonical) {
    return res.status(400).json({ error: 'Could not parse payload' })
  }

  const msg = { ...canonical, id: uuidv4(), source: 'kakaowork' }
  await insertMessage(msg)
  broadcast(msg)

  res.json({ ok: true, id: msg.id })
})

export default router
