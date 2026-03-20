import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

let db
const COLLECTION = 'messages'
const COUNTER_REF = () => db.collection('metadata').doc('counter')

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
    deleted: false,
  })
  batch.set(COUNTER_REF(), { count: admin.firestore.FieldValue.increment(1) }, { merge: true })
  await batch.commit()
}

// ── 배치 쓰기 (최대 249건씩) ────────────────────────────────
export async function insertMessages(msgs) {
  const BATCH_LIMIT = 249
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
        deleted: false,
      })
    }
    batch.set(COUNTER_REF(), { count: admin.firestore.FieldValue.increment(chunk.length) }, { merge: true })
    await batch.commit()
  }
}

// ── 삭제 (soft delete) ──────────────────────────────────────
export async function deleteMessage(id) {
  const doc = db.collection(COLLECTION).doc(id)
  const snap = await doc.get()
  if (!snap.exists || snap.data().deleted === true) return { changes: 0 }
  await doc.update({ deleted: true, deletedAt: new Date().toISOString() })
  return { changes: 1 }
}

export async function deleteAllMessages() {
  const snapshot = await db.collection(COLLECTION)
    .where('deleted', '==', false)
    .get()
  const BATCH_LIMIT = 500
  for (let i = 0; i < snapshot.docs.length; i += BATCH_LIMIT) {
    const batch = db.batch()
    const deletedAt = new Date().toISOString()
    snapshot.docs.slice(i, i + BATCH_LIMIT).forEach((doc) =>
      batch.update(doc.ref, { deleted: true, deletedAt })
    )
    await batch.commit()
  }
  return { changes: snapshot.size }
}

// ── 조회 ────────────────────────────────────────────────────
export async function getCount() {
  const doc = await COUNTER_REF().get()
  return doc.exists ? (doc.data().count || 0) : 0
}

export async function getMessages({ limit = 50, offset = 0, after } = {}) {
  let query = db.collection(COLLECTION).where('deleted', '==', false)

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

// ── 백필: 기존 문서에 deleted 필드 추가 ─────────────────────
export async function backfillDeletedField() {
  const BATCH_LIMIT = 500
  let backfilled = 0
  let snapshot = await db.collection(COLLECTION).limit(BATCH_LIMIT).get()

  while (!snapshot.empty) {
    const docsToUpdate = snapshot.docs.filter((doc) => doc.data().deleted === undefined)
    if (docsToUpdate.length > 0) {
      const batch = db.batch()
      docsToUpdate.forEach((doc) => batch.update(doc.ref, { deleted: false }))
      await batch.commit()
      backfilled += docsToUpdate.length
    }
    const lastDoc = snapshot.docs[snapshot.docs.length - 1]
    snapshot = await db.collection(COLLECTION).startAfter(lastDoc).limit(BATCH_LIMIT).get()
  }

  if (backfilled > 0) {
    console.log(`Backfill complete: added 'deleted: false' to ${backfilled} documents`)
  } else {
    console.log('Backfill: all documents already have deleted field')
  }
}
