import { useState, useEffect, useRef, useCallback } from 'react'

// ── 캔버스 치수 ──────────────────────────────────────────
const WALL_W = 6016
const WALL_H = 1152

// ── 그리드 ───────────────────────────────────────────────
const COLS = 10
const ROWS = 3
const ZONE_W = WALL_W / COLS   // 601.6
const ZONE_H = WALL_H / ROWS   // 384

// ── 버블 실제 치수 (MessageBubble.jsx와 일치) ─────────────
const BUBBLE_W = 576
const BUBBLE_H = 264
const TOTAL_W = BUBBLE_W

// ── 안전 여백 ─────────────────────────────────────────────
const EDGE_PAD    = 24
const TOP_PAD     = 24
const BOTTOM_PAD  = 56 + 24   // 하단 바 + 여백

// ── 좌측 경계 (타이틀 패널 오른쪽 끝) ───────────────────
// TitleOverlay: left=64, width=760 → x=824
const LEFT_BOUND = 824

// ── 우측 경계 (배경 이미지 로고 영역 제외) ───────────────
// 로고: 약 300×175px, 이미지 오른쪽 끝에 위치
const RIGHT_LOGO_W = 300
const RIGHT_BOUND = WALL_W - RIGHT_LOGO_W  // 5716

// ── 타이틀/초상 영역 그리드 제외 ─────────────────────────
// 좌측 2컬럼 전 행 제외, 우측 1컬럼 제외
const TITLE_EXCLUDE_COLS = 2
const TITLE_EXCLUDE_ROWS = 3
const RIGHT_EXCLUDE_COLS = 1

// ── 버블 간 최소 여백 ─────────────────────────────────────
// getBBox를 이 값만큼 확장하여 버블 사이 강제 여백 확보
const BUBBLE_GAP = 24

// ── 겹침 허용 범위 ───────────────────────────────────────
// BUBBLE_GAP으로 이미 여백이 확보되므로 추가 허용 없음
const OVERLAP_TOLERANCE = 0

// ── 최대 동시 표시 개수 ────────────────────────────────────
// 계산 근거:
//   유효 구역: x=824~5992 (폭 5168px), 3행
//   버블 실효폭 (GAP 포함): 758 + 96 = 854px
//   행당 최대: 5168 / 854 ≈ 6개 → 쾌적 밀도 행당 3-4개
//   3행 × 7 = 21개 (최대 가용), 20개로 제한 → 빽빽한 추모 메시지 느낌
const MAX_VISIBLE = 20

// ── 퇴장 애니메이션 시간 ──────────────────────────────────
const EXIT_DURATION = 1500

// ─────────────────────────────────────────────────────────

function isExcluded(col, row) {
  if (col >= COLS - RIGHT_EXCLUDE_COLS) return true
  return col < TITLE_EXCLUDE_COLS && row < TITLE_EXCLUDE_ROWS
}

function getBBox(x, y) {
  // BUBBLE_GAP만큼 확장 → 버블 사이 최소 여백 강제
  return {
    x1: x - BUBBLE_W / 2 - BUBBLE_GAP,
    y1: y - BUBBLE_H / 2 - BUBBLE_GAP,
    x2: x + BUBBLE_W / 2 + BUBBLE_GAP,
    y2: y + BUBBLE_H / 2 + BUBBLE_GAP,
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
 * OVERLAP_TOLERANCE를 초과하는 겹침 면적만 페널티로 반환.
 * → 허용 범위(50px) 내 겹침은 자연스러운 끝이 닿는 것으로 간주해 패널티 없음.
 * → 초과분만큼만 패널티 → 알고리즘이 "살짝 겹침"은 선호하되 "깊이 겹침"은 회피.
 */
function overlapArea(a, boxes) {
  // 허용 범위만큼 a 박스를 안쪽으로 축소
  const inner = {
    x1: a.x1 + OVERLAP_TOLERANCE,
    y1: a.y1 + OVERLAP_TOLERANCE,
    x2: a.x2 - OVERLAP_TOLERANCE,
    y2: a.y2 - OVERLAP_TOLERANCE,
  }
  // 버블이 너무 작아 inner가 역전되면 패널티 없음 (사실상 발생 안 함)
  if (inner.x2 <= inner.x1 || inner.y2 <= inner.y1) return 0

  return boxes.reduce((sum, b) => {
    const ox = Math.max(0, Math.min(inner.x2, b.x2) - Math.max(inner.x1, b.x1))
    const oy = Math.max(0, Math.min(inner.y2, b.y2) - Math.max(inner.y1, b.y1))
    return sum + ox * oy
  }, 0)
}

function findBestPosition(col, row, existingBoxes) {
  const MAX_TRIES = 24
  const baseX = col * ZONE_W + ZONE_W / 2
  const baseY = row * ZONE_H + ZONE_H / 2

  let best = null
  let bestArea = Infinity

  for (let i = 0; i < MAX_TRIES; i++) {
    const rawX = baseX + (Math.random() - 0.5) * ZONE_W * 0.7
    const rawY = baseY + (Math.random() - 0.5) * ZONE_H * 0.6
    const { x, y } = clamp(rawX, rawY)
    const box = getBBox(x, y)
    const area = overlapArea(box, existingBoxes)
    if (area === 0) return { x, y, box }
    if (area < bestArea) { bestArea = area; best = { x, y, box } }
  }

  return best
}

function pickZone(usedZones) {
  const available = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const key = `${col},${row}`
      if (!isExcluded(col, row) && !usedZones.has(key)) {
        available.push({ col, row, key })
      }
    }
  }
  if (available.length === 0) return null
  return available[Math.floor(Math.random() * available.length)]
}

// ─────────────────────────────────────────────────────────

export function useBubbleLayout(messages) {
  const [bubbles, setBubbles] = useState([])
  const bubblesRef     = useRef([])
  const usedZones      = useRef(new Set())
  const bubbleZones    = useRef(new Map())   // id → zoneKey
  const bubbleBoxes    = useRef(new Map())   // id → bbox
  const exitingIds     = useRef(new Set())   // 퇴장 중인 id (중복 퇴장 방지)
  const activeCount    = useRef(0)           // 현재 화면에 있는(퇴장 중 제외) 버블 수
  const prevIdsRef     = useRef(new Set())
  const initializedRef = useRef(false)

  useEffect(() => { bubblesRef.current = bubbles }, [bubbles])

  // ── 퇴장: 즉시 자원 해제 + fade-out 후 DOM 제거 ──────────
  const evictOldest = useCallback(() => {
    const cur = bubblesRef.current
    const target = cur.find((b) => !exitingIds.current.has(b.id))
    if (!target) return

    exitingIds.current.add(target.id)
    activeCount.current = Math.max(0, activeCount.current - 1)

    // 존·박스 즉시 반환 (새 버블이 바로 사용 가능)
    const zoneKey = bubbleZones.current.get(target.id)
    if (zoneKey) {
      usedZones.current.delete(zoneKey)
      bubbleZones.current.delete(target.id)
    }
    bubbleBoxes.current.delete(target.id)

    // exiting 플래그 → CSS bubble-exit 애니메이션 트리거
    setBubbles((prev) =>
      prev.map((b) => b.id === target.id ? { ...b, exiting: true } : b)
    )

    // 애니메이션 완료 후 DOM에서 제거
    setTimeout(() => {
      exitingIds.current.delete(target.id)
      setBubbles((prev) => prev.filter((b) => b.id !== target.id))
    }, EXIT_DURATION)
  }, [])

  // ── 배치 ─────────────────────────────────────────────────
  const assignBubble = useCallback((msg) => {
    // MAX_VISIBLE 초과 시 가장 오래된 버블 퇴장 시작
    if (activeCount.current >= MAX_VISIBLE) {
      evictOldest()
    }

    let zone = pickZone(usedZones.current)
    if (!zone) {
      // 존이 없으면 추가 퇴장 후 재시도
      evictOldest()
      zone = pickZone(usedZones.current)
      if (!zone) return
    }

    const existingBoxes = Array.from(bubbleBoxes.current.values())
    const pos = findBestPosition(zone.col, zone.row, existingBoxes)
    if (!pos) return

    usedZones.current.add(zone.key)
    bubbleZones.current.set(msg.id, zone.key)
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

    // 삭제된 메시지 감지 → 해당 버블 자연스럽게 퇴장
    for (const id of prevIdsRef.current) {
      if (!currentIds.has(id) && bubbleZones.current.has(id) && !exitingIds.current.has(id)) {
        exitingIds.current.add(id)
        activeCount.current = Math.max(0, activeCount.current - 1)
        const zoneKey = bubbleZones.current.get(id)
        if (zoneKey) { usedZones.current.delete(zoneKey); bubbleZones.current.delete(id) }
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
    // 삭제된 id는 prevIds에서도 제거
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
