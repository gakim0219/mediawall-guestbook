import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

let db
const COLLECTION = 'messages'
const COUNTER_DOC = 'meta_counter'

export function initDb() {
  let credential
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    credential = admin.credential.cert(serviceAccount)
  } else {
    const keyPath = resolve(__dirname, '..', 'mediawall-guestbook-firebase-adminsdk-fbsvc-0158bde833.json')
    const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'))
    credential = admin.credential.cert(serviceAccount)
  }

  admin.initializeApp({ credential })
  db = admin.firestore()
  console.log('Firestore initialized (project: mediawall-guestbook)')
}

// ── 단건 쓰기 ──────────────────────────────────────────────
export async function insertMessage(msg) {
  const batch = db.batch()
  batch.set(db.collection(COLLECTION).doc(msg.id), {
    senderName: msg.senderName,
    avatarUrl: msg.avatarUrl || null,
    text: msg.text,
    timestamp: msg.timestamp,
    source: msg.source || 'manual',
  })
  batch.set(db.collection(COLLECTION).doc(COUNTER_DOC),
    { count: admin.firestore.FieldValue.increment(1) },
    { merge: true }
  )
  await batch.commit()
}

// ── 배치 쓰기 (최대 250건씩) ────────────────────────────────
export async function insertMessages(msgs) {
  const BATCH_LIMIT = 249 // 카운터 업데이트 1건 포함하여 250
  for (let i = 0; i < msgs.length; i += BATCH_LIMIT) {
    const chunk = msgs.slice(i, i + BATCH_LIMIT)
    const batch = db.batch()
    for (const msg of chunk) {
      batch.set(db.collection(COLLECTION).doc(msg.id), {
        senderName: msg.senderName,
        avatarUrl: msg.avatarUrl || null,
        text: msg.text,
        timestamp: msg.timestamp,
        source: msg.source || 'manual',
      })
    }
    batch.set(db.collection(COLLECTION).doc(COUNTER_DOC),
      { count: admin.firestore.FieldValue.increment(chunk.length) },
      { merge: true }
    )
    await batch.commit()
  }
}

// ── 삭제 ────────────────────────────────────────────────────
export async function deleteMessage(id) {
  const doc = db.collection(COLLECTION).doc(id)
  const snap = await doc.get()
  if (!snap.exists) return { changes: 0 }
  const batch = db.batch()
  batch.delete(doc)
  batch.set(db.collection(COLLECTION).doc(COUNTER_DOC),
    { count: admin.firestore.FieldValue.increment(-1) },
    { merge: true }
  )
  await batch.commit()
  return { changes: 1 }
}

export async function deleteAllMessages() {
  const snapshot = await db.collection(COLLECTION)
    .where(admin.firestore.FieldPath.documentId(), '!=', COUNTER_DOC)
    .get()
  const BATCH_LIMIT = 500
  for (let i = 0; i < snapshot.docs.length; i += BATCH_LIMIT) {
    const batch = db.batch()
    snapshot.docs.slice(i, i + BATCH_LIMIT).forEach((doc) => batch.delete(doc.ref))
    await batch.commit()
  }
  // 카운터 리셋
  await db.collection(COLLECTION).doc(COUNTER_DOC).set({ count: 0 })
  return { changes: snapshot.size }
}

// ── 조회 ────────────────────────────────────────────────────
export async function getCount() {
  const doc = await db.collection(COLLECTION).doc(COUNTER_DOC).get()
  return doc.exists ? (doc.data().count || 0) : 0
}

export async function getMessages({ limit = 50, offset = 0, after } = {}) {
  let query = db.collection(COLLECTION)
    .where(admin.firestore.FieldPath.documentId(), '!=', COUNTER_DOC)

  if (after) {
    query = query.where('timestamp', '>', after).orderBy('timestamp', 'asc')
  } else {
    query = query.orderBy('timestamp', 'desc')
  }

  query = query.limit(limit)

  if (offset > 0) {
    query = query.offset(offset)
  }

  const snapshot = await query.get()
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}
