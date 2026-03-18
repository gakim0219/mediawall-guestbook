import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// ── 캔버스 높이 (기준값, 너비는 뷰포트 비율에 따라 동적) ──
const WALL_H = 1152

// ── 안전 여백 ─────────────────────────────────────────────
const TOP_PAD     = 24
const BOTTOM_PAD  = 56 + 24   // 하단 바 + 여백

// ── 겹침 허용 ─────────────────────────────────────────────
const OVERLAP_TOLERANCE = 80

// ── 퇴장 애니메이션 시간 ──────────────────────────────────
const EXIT_DURATION = 1500

// ── 뷰포트 너비에 따른 동적 치수 계산 ────────────────────
function computeDims(wallW) {
  const titleScale = Math.min(1, wallW / 2400)
  const leftBound  = Math.round(824 * titleScale + 40)
  const rightBound = wallW - 60

  const availableW = rightBound - leftBound
  const bubbleW = Math.round(Math.min(576, Math.max(300, wallW * 0.195)))
  const bubbleH = Math.round(bubbleW * 264 / 576)

  const availableArea = availableW * (WALL_H - TOP_PAD - BOTTOM_PAD)
  const bubbleArea    = bubbleW * bubbleH
  const maxVisible    = Math.min(30, Math.max(6, Math.floor(availableArea / bubbleArea * 0.6)))

  return { leftBound, rightBound, bubbleW, bubbleH, maxVisible }
}

// ─────────────────────────────────────────────────────────

function getBBox(x, y, bw, bh) {
  return { x1: x - bw / 2, y1: y - bh / 2, x2: x + bw / 2, y2: y + bh / 2 }
}

function clamp(x, y, dims) {
  const { leftBound, rightBound, bubbleW, bubbleH } = dims
  let dx = 0, dy = 0

  const left  = x - bubbleW / 2
  const right = x + bubbleW / 2
  const top   = y - bubbleH / 2
  const bot   = y + bubbleH / 2

  if (left  < leftBound)             dx = leftBound - left
  if (right > rightBound)            dx = rightBound - right
  if (top   < TOP_PAD)               dy = TOP_PAD - top
  if (bot   > WALL_H - BOTTOM_PAD)   dy = (WALL_H - BOTTOM_PAD) - bot

  return { x: x + dx, y: y + dy }
}

function overlapArea(a, boxes) {
  const t = OVERLAP_TOLERANCE
  const inner = { x1: a.x1 + t, y1: a.y1 + t, x2: a.x2 - t, y2: a.y2 - t }
  if (inner.x2 <= inner.x1 || inner.y2 <= inner.y1) return 0

  return boxes.reduce((sum, b) => {
    const ox = Math.max(0, Math.min(inner.x2, b.x2) - Math.max(inner.x1, b.x1))
    const oy = Math.max(0, Math.min(inner.y2, b.y2) - Math.max(inner.y1, b.y1))
    return sum + ox * oy
  }, 0)
}

function findBestPosition(existingBoxes, dims) {
  const { leftBound, rightBound, bubbleW, bubbleH } = dims
  const MAX_TRIES = 40
  let best = null
  let bestArea = Infinity

  for (let i = 0; i < MAX_TRIES; i++) {
    const rawX = leftBound + bubbleW / 2 + Math.random() * (rightBound - leftBound - bubbleW)
    const rawY = TOP_PAD + bubbleH / 2 + Math.random() * (WALL_H - TOP_PAD - BOTTOM_PAD - bubbleH)
    const { x, y } = clamp(rawX, rawY, dims)
    const box = getBBox(x, y, bubbleW, bubbleH)
    const area = overlapArea(box, existingBoxes)
    if (area === 0) return { x, y, box }
    if (area < bestArea) { bestArea = area; best = { x, y, box } }
  }

  return best
}

// ─────────────────────────────────────────────────────────

export function useBubbleLayout(messages, wallW = 2048) {
  const dims = useMemo(() => computeDims(wallW), [wallW])
  const dimsRef = useRef(dims)
  useEffect(() => { dimsRef.current = dims }, [dims])

  const [bubbles, setBubbles] = useState([])
  const bubblesRef     = useRef([])
  const bubbleBoxes    = useRef(new Map())   // id → bbox
  const exitingIds     = useRef(new Set())
  const activeCount    = useRef(0)
  const prevIdsRef     = useRef(new Set())
  const initializedRef = useRef(false)

  useEffect(() => { bubblesRef.current = bubbles }, [bubbles])

  // ── 퇴장 ──────────────────────────────────────────────────
  const evictOldest = useCallback(() => {
    const cur = bubblesRef.current
    const target = cur.find((b) => !exitingIds.current.has(b.id))
    if (!target) return

    exitingIds.current.add(target.id)
    activeCount.current = Math.max(0, activeCount.current - 1)
    bubbleBoxes.current.delete(target.id)

    setBubbles((prev) =>
      prev.map((b) => b.id === target.id ? { ...b, exiting: true } : b)
    )

    setTimeout(() => {
      exitingIds.current.delete(target.id)
      setBubbles((prev) => prev.filter((b) => b.id !== target.id))
    }, EXIT_DURATION)
  }, [])

  // ── 배치 ─────────────────────────────────────────────────
  const assignBubble = useCallback((msg) => {
    const d = dimsRef.current
    if (activeCount.current >= d.maxVisible) {
      evictOldest()
    }

    const existingBoxes = Array.from(bubbleBoxes.current.values())
    const pos = findBestPosition(existingBoxes, d)
    if (!pos) return

    bubbleBoxes.current.set(msg.id, pos.box)
    activeCount.current += 1

    setBubbles((prev) => [...prev, {
      ...msg,
      x: pos.x,
      y: pos.y,
      bubbleW: d.bubbleW,
      bubbleH: d.bubbleH,
      floatDuration: 6 + Math.random() * 3,
      floatDelay:    Math.random() * -6,
      entering: true,
      exiting:  false,
    }])

    setTimeout(() => {
      setBubbles((prev) =>
        prev.map((b) => b.id === msg.id ? { ...b, entering: false } : b)
      )
    }, 700)

    if (msg.isNew) {
      setTimeout(() => {
        setBubbles((prev) =>
          prev.map((b) => b.id === msg.id ? { ...b, isNew: false } : b)
        )
      }, 4000)
    }
  }, [evictOldest])

  useEffect(() => {
    const currentIds = new Set(messages.map((m) => m.id))

    // 삭제된 메시지 → 퇴장
    for (const id of prevIdsRef.current) {
      if (!currentIds.has(id) && bubbleBoxes.current.has(id) && !exitingIds.current.has(id)) {
        exitingIds.current.add(id)
        activeCount.current = Math.max(0, activeCount.current - 1)
        bubbleBoxes.current.delete(id)
        setBubbles((prev) => prev.map((b) => b.id === id ? { ...b, exiting: true } : b))
        setTimeout(() => {
          exitingIds.current.delete(id)
          setBubbles((prev) => prev.filter((b) => b.id !== id))
        }, EXIT_DURATION)
      }
    }

    const newMessages = messages.filter((m) => !prevIdsRef.current.has(m.id))
    messages.forEach((m) => prevIdsRef.current.add(m.id))
    for (const id of prevIdsRef.current) {
      if (!currentIds.has(id)) prevIdsRef.current.delete(id)
    }

    if (!initializedRef.current && newMessages.length > 0) {
      initializedRef.current = true
      newMessages.forEach((msg, i) => {
        setTimeout(() => assignBubble(msg), i * 130)
      })
    } else if (initializedRef.current) {
      newMessages.forEach((msg) => assignBubble(msg))
    }
  }, [messages, assignBubble])

  return bubbles
}
