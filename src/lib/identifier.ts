/**
 * One field accepts either an email address or a Nigerian phone number, so
 * everything downstream needs to know which it got and store it in a single
 * canonical form.
 */
export type IdentifierKind = 'email' | 'phone' | 'unknown'

export type Identifier = {
  kind: IdentifierKind
  /** Canonical form: lowercased email, or +234XXXXXXXXXX. */
  value: string
  /** What the user actually typed, untouched. */
  raw: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
/** Anything that is only digits, spaces, hyphens, brackets and a lead +. */
const PHONE_SHAPE_RE = /^\+?[\d\s()-]+$/

/**
 * Nigerian mobile numbers are 10 digits after the country code, and users
 * write them every possible way: 0803…, 234803…, +234 803…, 0803-123-4567.
 * They all collapse to +234803…
 */
export function normalisePhone(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, '').replace(/^\+/, '')
  if (!/^\d+$/.test(digits)) return null

  let local: string
  if (digits.startsWith('234')) local = digits.slice(3)
  else if (digits.startsWith('0')) local = digits.slice(1)
  else local = digits

  // Every Nigerian mobile line is 10 digits and starts 7, 8 or 9.
  if (!/^[789]\d{9}$/.test(local)) return null
  return `+234${local}`
}

export function parseIdentifier(input: string): Identifier {
  const raw = input.trim()
  if (!raw) return { kind: 'unknown', value: '', raw }

  if (raw.includes('@')) {
    const value = raw.toLowerCase()
    return { kind: EMAIL_RE.test(value) ? 'email' : 'unknown', value, raw }
  }

  if (PHONE_SHAPE_RE.test(raw)) {
    const phone = normalisePhone(raw)
    if (phone) return { kind: 'phone', value: phone, raw }
    return { kind: 'unknown', value: raw, raw }
  }

  return { kind: 'unknown', value: raw, raw }
}

export function isValidIdentifier(input: string): boolean {
  return parseIdentifier(input).kind !== 'unknown'
}

/** Human-facing form: emails as typed, phones spaced for readability. */
export function formatIdentifier(identifier: Identifier): string {
  if (identifier.kind !== 'phone') return identifier.value
  const local = identifier.value.slice(4)
  return `+234 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
}

/* ── Domain typo suggestions ─────────────────────────────── */

const COMMON_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
  'live.com', 'aol.com', 'protonmail.com', 'yahoo.co.uk',
]

/** Levenshtein, capped — we only care about distances of 1 or 2. */
function editDistance(a: string, b: string): number {
  const rows = a.length + 1
  const cols = b.length + 1
  let prev = Array.from({ length: cols }, (_, i) => i)

  for (let i = 1; i < rows; i += 1) {
    const curr = [i]
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    prev = curr
  }
  return prev[cols - 1]
}

/**
 * "olu@gmial.com" → "olu@gmail.com". Returns null when the domain is already
 * a known one, or is too far from any of them to guess at safely.
 */
export function suggestEmailFix(input: string): string | null {
  const raw = input.trim().toLowerCase()
  const at = raw.lastIndexOf('@')
  if (at < 1) return null

  const local = raw.slice(0, at)
  const domain = raw.slice(at + 1)
  if (!domain || COMMON_DOMAINS.includes(domain)) return null

  let best: string | null = null
  let bestDistance = Infinity
  for (const candidate of COMMON_DOMAINS) {
    const distance = editDistance(domain, candidate)
    if (distance < bestDistance) {
      bestDistance = distance
      best = candidate
    }
  }

  // Distance 1–2 is a typo; further than that and they probably meant it.
  if (best && bestDistance > 0 && bestDistance <= 2) return `${local}@${best}`
  return null
}
