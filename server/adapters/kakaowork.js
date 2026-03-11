/**
 * KakaoWork Adapter
 * Converts KakaoWork webhook payload → CanonicalMessage
 * Update this file when the actual webhook format is confirmed.
 *
 * Expected CanonicalMessage shape:
 * {
 *   senderName: string,
 *   avatarUrl:  string | null,
 *   text:       string,
 *   timestamp:  string (ISO 8601),
 * }
 */
export function parseKakaoWorkPayload(payload) {
  try {
    // TODO: Update these field paths once KakaoWork webhook format is confirmed
    const senderName =
      payload?.sender?.name ||
      payload?.user?.name ||
      payload?.from?.name ||
      '익명'

    const text =
      payload?.content?.text ||
      payload?.message?.text ||
      payload?.text ||
      ''

    const avatarUrl =
      payload?.sender?.avatar_url ||
      payload?.user?.profile_image_url ||
      null

    const timestamp =
      payload?.created_at ||
      payload?.timestamp ||
      new Date().toISOString()

    if (!text) return null

    return {
      senderName: String(senderName).slice(0, 50),
      avatarUrl: avatarUrl || null,
      text: String(text).slice(0, 500),
      timestamp: String(timestamp),
    }
  } catch {
    return null
  }
}
