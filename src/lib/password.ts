export type StrengthLevel = 0 | 1 | 2 | 3 | 4

export type Strength = {
  /** 0 = empty, 1 = weak … 4 = strong. Drives the four meter segments. */
  score: StrengthLevel
  label: string
  color: string
}

const LEVELS: Record<StrengthLevel, Omit<Strength, 'score'>> = {
  0: { label: '', color: 'var(--bg-subtle)' },
  1: { label: 'Weak', color: 'var(--strength-weak)' },
  2: { label: 'Fair', color: 'var(--strength-fair)' },
  3: { label: 'Good', color: 'var(--strength-good)' },
  4: { label: 'Strong', color: 'var(--strength-strong)' },
}

/**
 * A deliberately simple heuristic: one point each for length, mixed case,
 * a digit and a symbol, with a bonus tier at 12+ characters. Good enough to
 * give honest feedback without pulling in a dictionary-based estimator.
 */
export function getStrength(password: string): Strength {
  if (!password) return { score: 0, ...LEVELS[0] }

  let points = 0
  if (password.length >= 8) points += 1
  if (password.length >= 12) points += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1
  if (/\d/.test(password)) points += 1
  if (/[^A-Za-z0-9]/.test(password)) points += 1

  // Short passwords can never read as more than weak, whatever they contain.
  if (password.length < 8) points = Math.min(points, 1)

  const score = Math.max(1, Math.min(4, points)) as StrengthLevel
  return { score, ...LEVELS[score] }
}
