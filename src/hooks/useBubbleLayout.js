import { useState, useEffect, useRef, useCallback } from 'react'

// ── 캔버스 치수 ──────────────────────────────────────────
const WALL_W = 6016
const WALL_H = 1152

// ── 그리드 (촘촘하게 분할하여 다양한 위치에 배치) ──────────
const COLS = 14
const ROWS = 4
const ZONE_W = WALL_W / COLS   // ~430
const ZONE_H = WALL_H / ROWS   // 288

// ── 버블 실제 치수 (MessageBubble.jsx와 일치) ─────────────
const BUBBLE_W = 576
const BUBBLE_H = 264

// ── 안전 여백 ─────────────────────────────────────────────
const TOP_PAD     = 24
const BOTTOM_PAD  = 56 + 24   // 하단 바 + 여백

// ── 좌측 경계 (타이틀 패널 오른쪽 끝) ───────────────────
const LEFT_BOUND = 824

// ── 우측 경계 (배경 이미지 로고 영역 제외) ───────────────
const RIGHT_LOGO_W = 300
const RIGHT_BOUND = WALL_W - RIGHT_LOGO_W  // 5716

// ── 타이틀/초상 영역: 좌측 경계 이내 컬럼 제외 ─────────────
function isExcluded(col) {
  const zoneRight = (col + 1) * ZONE_W
  if (zoneRight <= LEFT_BOUND) return true
  const zoneLeft = col * ZONE_W
  if (zoneLeft >= WALL_W - RIGHT_LOGO_W) return true
  return false
}

// ── 겹침 허용: 버블 면적의 ~20%까지 겹쳐도 페널티 없음 ────
// 끝부분이 자연스럽게 겹치되, 본문 텍스트가 가려지지 않는 수준
const OVERLAP_TOLERANCE = 100

// ── 최대 동시 표시 개수 ────────────────────────────────────
const MAX_VISIBLE = 30

// ── 퇴장 애니메이션 시간 ──────────────────────────────────
const EXIT_DURATION = 1500

// ─────────────────────────────────────────────────────────

function getBBox(x, y) {
  return {
    x1: x - BUBBLE_W / 2,
    y1: y - BUBBLE_H / 2,
    x2: x + BUBBLE_W / 2,
    y2: y + BUBBLE_H / 2,
  }
}

function clamp(x, y) {
  const left  = x - BUBBLE_W / 2
  const right = x + BUBBLE_W / 2
  const top   = y - BUBBLE_H / 2
  const bot   = y + BUBBLE_H / 2

  let dx = 0, dy = 0
  if (left  < LEFT_BOUND)          dx = LEFT_BOUND - left
  if (right > RIGHT_BOUND)         dx = RIGHT_BOUND - right
  if (top   < TOP_PAD)             dy = TOP_PAD - top
  if (bot   > WALL_H - BOTTOM_PAD) dy = (WALL_H - BOTTOM_PAD) - bot

  return { x: x + dx, y: y + dy }
}

/**
 * OVERLAP_TOLERANCE만큼 박스를 축소한 뒤 겹침 면적 계산.
 * → 끝부분 겹침은 허용, 깊이 겹침만 페널티.
 */
function overlapArea(a, boxes) {
  const inner = {
    x1: a.x1 + OVERLAP_TOLERANCE,
    y1: a.y1 + OVERLAP_TOLERANCE,
    x2: a.x2 - OVERLAP_TOLERANCE,
    y2: a.y2 - OVERLAP_TOLERANCE,
  }
  if (inner.x2 <= inner.x1 || inner.y2 <= inner.y1) return 0

  return boxes.reduce((sum, b) => {
    const ox = Math.max(0, Math.min(inner.x2, b.x2) - Math.max(inner.x1, b.x1))
    const oy = Math.max(0, Math.min(inner.y2, b.y2) - Math.max(inner.y1, b.y1))
    return sum + ox * oy
  }, 0)
}

/**
 * 전체 배치 가능 영역에서 겹침이 가장 적은 위치를 찾는다.
 * 존 제한 없이 랜덤 샘플링 → 빽빽하면서도 텍스트는 읽히는 배치.
 */
function findBestPosition(existingBoxes) {
  const MAX_TRIES = 40
  let best = null
  let bestArea = Infinity

  for (let i = 0; i < MAX_TRIES; i++) {
    // 유효 영역 내 완전 랜덤 위치
    const rawX = LEFT_BOUND + BUBBLE_W / 2 + Math.random() * (RIGHT_BOUND - LEFT_BOUND - BUBBLE_W)
    const rawY = TOP_PAD + BUBBLE_H / 2 + Math.random() * (WALL_H - TOP_PAD - BOTTOM_PAD - BUBBLE_H)
    const { x, y } = clamp(rawX, rawY)
    const box = getBBox(x, y)
    const area = overlapArea(box, existingBoxes)
    if (area === 0) return { x, y, box }
    if (area < bestArea) { bestArea = area; best = { x, y, box } }
  }

  return best
}

// ─────────────────────────────────────────────────────────

export function useBubbleLayout(messages) {
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
    if (activeCount.current >= MAX_VISIBLE) {
      evictOldest()
    }

    const existingBoxes = Array.from(bubbleBoxes.current.values())
    const pos = findBestPosition(existingBoxes)
    if (!pos) return

    bubbleBoxes.current.set(msg.id, pos.box)
    activeCount.current += 1

    setBubbles((prev) => [...prev, {
      ...msg,
      x: pos.x,
      y: pos.y,
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
