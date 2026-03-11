let _io

export function initSocket(io) {
  _io = io
  io.of('/wall').on('connection', (socket) => {
    console.log('Wall client connected:', socket.id)
    socket.on('disconnect', () => {
      console.log('Wall client disconnected:', socket.id)
    })
  })
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
