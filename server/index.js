import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { initDb } from './db.js'
import { initSocket } from './socket.js'
import ingestRouter from './routes/ingest.js'
import messagesRouter from './routes/messages.js'
import kakaoworkRouter from './routes/kakaowork.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: { origin: '*' },
})

app.use(cors())
app.use(express.json())

initDb()
initSocket(io)

app.use('/api/messages/ingest', ingestRouter)
app.use('/api/messages', messagesRouter)
app.use('/api/kakaowork', kakaoworkRouter)

// Serve built frontend in production
const distPath = join(__dirname, '..', 'dist')
app.use(express.static(distPath))
app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'))
})

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
