/**
 * Naira formatting.
 *
 * Amounts are held as whole naira integers — no kobo. Nothing in event
 * planning is priced to the kobo, and integers keep the budget arithmetic
 * exact without a decimal library.
 */
const FULL = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
})

const PLAIN = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 })

export function formatNaira(amount: number): string {
  return FULL.format(Math.round(amount))
}

/**
 * Shortened for stat tiles and venue cards, where the full number would wrap:
 * ₦1.2m, ₦850k. Anything under 1,000 keeps its digits.
 */
export function formatNairaShort(amount: number): string {
  const value = Math.round(amount)
  if (value >= 1_000_000) return `₦${trim(value / 1_000_000)}m`
  if (value >= 1_000) return `₦${trim(value / 1_000)}k`
  return `₦${PLAIN.format(value)}`
}

function trim(value: number): string {
  // 1.0m reads worse than 1m; 1.25m reads worse than 1.3m.
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/** Digits only — lets people type "1,500,000" or "₦1.5m" and mean it. */
export function parseNaira(input: string): number {
  const cleaned = input.replace(/[^\d.]/g, '')
  if (!cleaned) return 0

  const value = Number(cleaned)
  if (Number.isNaN(value)) return 0

  // "1.5m" / "850k" are how people actually write budgets.
  if (/m\b|m$/i.test(input.trim())) return Math.round(value * 1_000_000)
  if (/k\b|k$/i.test(input.trim())) return Math.round(value * 1_000)
  return Math.round(value)
}

/** Groups digits as the user types, without fighting the caret. */
export function formatAmountInput(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (!digits) return ''
  return PLAIN.format(Number(digits))
}
