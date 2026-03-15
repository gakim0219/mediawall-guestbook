import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

let db

export function initDb() {
  // 서비스 계정 키: 환경변수(JSON 문자열) 또는 로컬 파일
  let credential
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    credential = admin.credential.cert(serviceAccount)
  } else {
    // 로컬 개발: 프로젝트 루트의 adminsdk JSON 파일 사용
    const keyPath = resolve(__dirname, '..', 'mediawall-guestbook-firebase-adminsdk-fbsvc-0158bde833.json')
    const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'))
    credential = admin.credential.cert(serviceAccount)
  }

  admin.initializeApp({ credential })
  db = admin.firestore()
  console.log('Firestore initialized (project: mediawall-guestbook)')
}

const COLLECTION = 'messages'

export async function insertMessage(msg) {
  await db.collection(COLLECTION).doc(msg.id).set({
    senderName: msg.senderName,
    avatarUrl: msg.avatarUrl || null,
    text: msg.text,
    timestamp: msg.timestamp,
    source: msg.source || 'manual',
  })
}

export async function deleteMessage(id) {
  const doc = db.collection(COLLECTION).doc(id)
  const snap = await doc.get()
  if (!snap.exists) return { changes: 0 }
  await doc.delete()
  return { changes: 1 }
}

export async function deleteAllMessages() {
  const snapshot = await db.collection(COLLECTION).get()
  const batch = db.batch()
  snapshot.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()
  return { changes: snapshot.size }
}

export async function getCount() {
  const snapshot = await db.collection(COLLECTION).count().get()
  return snapshot.data().count
}

export async function getMessages({ limit = 50, offset = 0, after } = {}) {
  let query = db.collection(COLLECTION)

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
