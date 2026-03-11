import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '..', 'messages.db')

let db

export function initDb() {
  db = new Database(DB_PATH)
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id          TEXT PRIMARY KEY,
      senderName  TEXT NOT NULL,
      avatarUrl   TEXT,
      text        TEXT NOT NULL,
      timestamp   TEXT NOT NULL,
      source      TEXT NOT NULL DEFAULT 'manual'
    )
  `)
  console.log('SQLite DB initialized at', DB_PATH)
}

export function insertMessage(msg) {
  const stmt = db.prepare(`
    INSERT INTO messages (id, senderName, avatarUrl, text, timestamp, source)
    VALUES (@id, @senderName, @avatarUrl, @text, @timestamp, @source)
  `)
  stmt.run(msg)
}

export function deleteMessage(id) {
  return db.prepare('DELETE FROM messages WHERE id = ?').run(id)
}

export function deleteAllMessages() {
  return db.prepare('DELETE FROM messages').run()
}

export function getCount() {
  return db.prepare('SELECT COUNT(*) as count FROM messages').get().count
}

export function getMessages({ limit = 50, offset = 0, after } = {}) {
  if (after) {
    return db.prepare(
      'SELECT * FROM messages WHERE timestamp > ? ORDER BY timestamp ASC LIMIT ? OFFSET ?'
    ).all(after, limit, offset)
  }
  return db.prepare(
    'SELECT * FROM messages ORDER BY timestamp DESC LIMIT ? OFFSET ?'
  ).all(limit, offset)
}
