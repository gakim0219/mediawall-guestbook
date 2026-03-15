import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL || ''

let socket = null

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL + '/wall', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      reconnectionAttempts: Infinity,
    })
  }
  return socket
}
