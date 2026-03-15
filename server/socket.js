let _io
let connectionCount = 0
const MAX_CONNECTIONS = 1000

export function initSocket(io) {
  _io = io
  const wallNs = io.of('/wall')

  wallNs.use((socket, next) => {
    if (connectionCount >= MAX_CONNECTIONS) {
      console.warn(`Connection rejected: limit ${MAX_CONNECTIONS} reached`)
      return next(new Error('Server at capacity'))
    }
    next()
  })

  wallNs.on('connection', (socket) => {
    connectionCount++
    console.log(`Wall client connected: ${socket.id} (${connectionCount}/${MAX_CONNECTIONS})`)
    socket.on('disconnect', () => {
      connectionCount--
      console.log(`Wall client disconnected: ${socket.id} (${connectionCount}/${MAX_CONNECTIONS})`)
    })
  })

  // 주기적 상태 로그 (60초마다)
  setInterval(() => {
    if (connectionCount > 0) {
      console.log(`[Monitor] Connections: ${connectionCount}/${MAX_CONNECTIONS}`)
    }
  }, 60000)
}

export function broadcast(msg) {
  if (_io) {
    _io.of('/wall').emit('new_message', msg)
  }
}

export function broadcastDelete(id) {
  if (_io) {
    _io.of('/wall').emit('message_deleted', { id })
  }
}

export function broadcastDeleteAll() {
  if (_io) {
    _io.of('/wall').emit('all_messages_deleted')
  }
}
