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
  const leftBound  = 60
  const rightBound = wallW - 60

  const bubbleW = Math.round(Math.min(576, Math.max(300, wallW * 0.195)))
  const bubbleH = Math.round(bubbleW * 264 / 576)

  const maxVisible = 30

  // UI 오버레이 금지 영역 (버블이 이 영역과 겹치지 않도록)
  const exclusionZones = [
    // 좌상단: 제목 + 부제목 + 날짜 + 카운터 + QR 코드
    {
      x1: 0,
      y1: 0,
      x2: Math.round(880 * titleScale) + 30,
      y2: Math.round(740 * titleScale) + 30,
    },
    // 우상단: HD 로고
    {
      x1: wallW - Math.round(280 * titleScale),
      y1: 0,
      x2: wallW,
      y2: 160,
    },
  ]

  return { leftBound, rightBound, bubbleW, bubbleH, maxVisible, exclusionZones }
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

function overlapsExclusion(box, zones) {
  const pad = 10
  for (const z of zones) {
    if (box.x2 > z.x1 + pad && box.x1 < z.x2 - pad &&
        box.y2 > z.y1 + pad && box.y1 < z.y2 - pad) {
      return true
    }
  }
  return false
}

function minDistToBoxes(x, y, boxes) {
  if (boxes.length === 0) return Infinity
  let min = Infinity
  for (const b of boxes) {
    const d = Math.hypot(x - (b.x1 + b.x2) / 2, y - (b.y1 + b.y2) / 2)
    if (d < min) min = d
  }
  return min
}

function findBestPosition(existingBoxes, dims) {
  const { leftBound, rightBound, bubbleW, bubbleH, exclusionZones } = dims
  const MAX_TRIES = 60
  let best = null
  let bestScore = -Infinity

  for (let i = 0; i < MAX_TRIES; i++) {
    const rawX = leftBound + bubbleW / 2 + Math.random() * (rightBound - leftBound - bubbleW)
    const rawY = TOP_PAD + bubbleH / 2 + Math.random() * (WALL_H - TOP_PAD - BOTTOM_PAD - bubbleH)
    const { x, y } = clamp(rawX, rawY, dims)
    const box = getBBox(x, y, bubbleW, bubbleH)

    if (overlapsExclusion(box, exclusionZones)) continue

    const overlap = overlapArea(box, existingBoxes)
    const spread = minDistToBoxes(x, y, existingBoxes)

    // 겹침 없는 후보에 큰 보너스, 그 중에서 기존 버블과 가장 먼 위치 선택
    const score = (overlap === 0 ? 100000 : 0) - overlap + spread

    if (score > bestScore) {
      bestScore = score
      best = { x, y, box }
    }
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
