import { CATERING_FLOOR, DEFAULT_FLOOR, SPLITS, naira } from './budgetPlan'
import { BUDGET_CATEGORIES } from './events'
import type { BudgetCategory, EventType, Expense } from './events'

/**
 * The budget assistant: drafts concrete expense lines from the event type, the
 * head count and the total.
 *
 * Rule-based on purpose — every figure traces back to the category splits in
 * budgetPlan.ts and the items below, so the reasoning it prints is the real
 * reasoning. A language model can replace `draftBudget` later as long as it
 * returns the same Draft shape.
 */

export type SpendStyle = 'save' | 'balanced' | 'all'

export const SPEND_STYLES: Record<SpendStyle, { label: string; hint: string; reserve: number }> = {
  save: { label: 'Keep some back', hint: '15% held for surprises', reserve: 0.15 },
  balanced: { label: 'Balanced', hint: '5% held for surprises', reserve: 0.05 },
  all: { label: 'Use it all', hint: 'Every naira planned', reserve: 0 },
}

type Item = {
  label: string
  category: BudgetCategory
  /** Share of its category, relative to the other items that apply. */
  weight: number
  /** Priced per head, so the line says what each guest gets. */
  perGuest?: boolean
  /** Omitted means every event type. */
  types?: EventType[]
}

const CELEBRATIONS: EventType[] = ['Wedding', 'Birthday', 'Naming ceremony', 'Something else']

const ITEMS: Item[] = [
  { label: 'Venue hire', category: 'Venue', weight: 1 },

  { label: 'Food — main dishes', category: 'Catering', weight: 0.55, perGuest: true },
  { label: 'Small chops', category: 'Catering', weight: 0.15, perGuest: true, types: CELEBRATIONS },
  { label: 'Drinks & water', category: 'Catering', weight: 0.2, perGuest: true },
  { label: 'Cake', category: 'Catering', weight: 0.1, types: ['Wedding', 'Birthday', 'Naming ceremony'] },
  { label: 'Tea break', category: 'Catering', weight: 0.15, perGuest: true, types: ['Corporate event'] },

  { label: 'Decor & flowers', category: 'Decor', weight: 0.75 },
  { label: 'Lighting', category: 'Decor', weight: 0.25, types: ['Wedding', 'Birthday', 'Concert or show'] },

  { label: 'Photographer', category: 'Photo & video', weight: 0.6 },
  {
    label: 'Videographer',
    category: 'Photo & video',
    weight: 0.4,
    types: ['Wedding', 'Concert or show', 'Corporate event'],
  },

  { label: 'DJ', category: 'Music', weight: 0.5, types: ['Wedding', 'Birthday', 'Naming ceremony', 'Something else'] },
  { label: 'MC / compère', category: 'Music', weight: 0.5, types: ['Wedding', 'Birthday', 'Naming ceremony', 'Burial', 'Corporate event', 'Something else'] },
  { label: 'Live band', category: 'Music', weight: 0.6, types: ['Wedding', 'Burial'] },
  { label: 'Artiste fees', category: 'Music', weight: 0.7, types: ['Concert or show'] },
  { label: 'Sound & stage', category: 'Music', weight: 0.3, types: ['Concert or show', 'Corporate event'] },

  { label: 'Outfits & aso-ebi', category: 'Attire', weight: 1, types: ['Wedding', 'Burial'] },
  { label: 'Celebrant’s outfit', category: 'Attire', weight: 1, types: ['Birthday', 'Naming ceremony', 'Something else'] },

  { label: 'Transport & logistics', category: 'Transport', weight: 1 },

  { label: 'Souvenirs', category: 'Other', weight: 0.5, perGuest: true, types: ['Wedding', 'Birthday', 'Naming ceremony', 'Burial'] },
  { label: 'Security & ushers', category: 'Other', weight: 0.35 },
  { label: 'Invitations & printing', category: 'Other', weight: 0.15, types: ['Wedding', 'Birthday', 'Naming ceremony', 'Burial', 'Something else'] },
  { label: 'Branding & printing', category: 'Other', weight: 0.4, types: ['Corporate event'] },
  { label: 'Tickets & promotion', category: 'Other', weight: 0.4, types: ['Concert or show'] },
]

const WHY_LARGEST: Partial<Record<BudgetCategory, string>> = {
  Catering: 'guests remember the food first',
  Venue: 'the hall sets the whole day',
  Music: 'the performance is the event',
}

export type DraftLine = {
  key: string
  label: string
  category: BudgetCategory
  amount: number
  note?: string
}

export type Draft = {
  lines: DraftLine[]
  /** Plain sentences explaining the draft, in reading order. */
  insights: string[]
  /** Something the host should act on before accepting. */
  warning?: string
}

type DraftInput = {
  type: EventType
  guests: number
  budget: number
  state: string
  /** Already in the budget; their categories are treated as covered. */
  existing: Expense[]
  style: SpendStyle
}

function round(amount: number): number {
  const step = amount >= 100_000 ? 5_000 : 1_000
  return Math.max(0, Math.round(amount / step) * step)
}

export function draftBudget({ type, guests, budget, state, existing, style }: DraftInput): Draft {
  const split = SPLITS[type] ?? SPLITS['Something else']
  const heads = guests > 0 ? guests : 100
  const reserve = round(budget * SPEND_STYLES[style].reserve)

  const committed = existing.reduce((sum, expense) => sum + expense.amount, 0)
  const covered = BUDGET_CATEGORIES.filter((category) =>
    existing.some((expense) => expense.category === category),
  )
  const open = BUDGET_CATEGORIES.filter(
    (category) => (split[category] ?? 0) > 0 && !covered.includes(category),
  )
  const available = budget - reserve - committed

  if (available <= 0 || open.length === 0) {
    return {
      lines: [],
      insights: [],
      warning:
        committed >= budget
          ? `What is already in your budget (${naira(committed)}) uses the whole ${naira(budget)}. Raise the budget to plan the rest.`
          : 'Every category already has something in it. Add more lines by hand below.',
    }
  }

  const shareTotal = open.reduce((sum, category) => sum + (split[category] ?? 0), 0)
  const lines: DraftLine[] = []

  for (const category of open) {
    const categoryAmount = (available * (split[category] ?? 0)) / shareTotal
    const items = ITEMS.filter(
      (item) => item.category === category && (!item.types || item.types.includes(type)),
    )
    const weights = items.reduce((sum, item) => sum + item.weight, 0)

    for (const item of items) {
      const amount = round((categoryAmount * item.weight) / weights)
      if (amount === 0) continue
      lines.push({
        key: `${category}-${item.label}`,
        label: item.label,
        category,
        amount,
        note: item.perGuest ? `About ${naira(amount / heads)} per guest` : undefined,
      })
    }
  }

  if (reserve > 0) {
    lines.push({
      key: 'Other-contingency',
      label: 'Contingency',
      category: 'Other',
      amount: reserve,
      note: 'Held back for last-minute costs',
    })
  }

  const insights: string[] = []

  const byCategory = open
    .map((category) => ({
      category,
      amount: lines.filter((line) => line.category === category).reduce((sum, line) => sum + line.amount, 0),
    }))
    .sort((a, b) => b.amount - a.amount)
  const largest = byCategory[0]
  if (largest) {
    const why = WHY_LARGEST[largest.category]
    insights.push(
      `${largest.category} gets the biggest share, ${naira(largest.amount)}${why ? ` — at a ${type.toLowerCase()}, ${why}` : ''}.`,
    )
  }

  if (covered.length > 0) {
    insights.push(
      `${covered.join(', ')} already ${covered.length === 1 ? 'has' : 'have'} ${naira(committed)} in your budget, so the rest is spread across everything else.`,
    )
  }

  let warning: string | undefined
  const food = lines
    .filter((line) => line.category === 'Catering' && line.note)
    .reduce((sum, line) => sum + line.amount, 0)
  if (food > 0) {
    const perGuest = food / heads
    const floor = CATERING_FLOOR[state] ?? DEFAULT_FLOOR
    insights.push(`That is about ${naira(perGuest)} per guest on food and drinks for ${heads} guests.`)
    if (perGuest < floor) {
      // Food grows in step with the money left to plan, so scale that up to
      // the floor and add back what is held or already committed.
      const neededAvailable = (floor * heads) / (food / available)
      const neededBudget =
        Math.ceil((neededAvailable + committed) / (1 - SPEND_STYLES[style].reserve) / 100_000) * 100_000
      warning = `Food usually starts around ${naira(floor)} per guest${state ? ` in ${state}` : ''}. Raise the budget to about ${naira(neededBudget)}, or trim the list to about ${Math.floor(food / floor)} guests.`
    }
  }

  if (reserve > 0) insights.push(`${naira(reserve)} is held back for surprises.`)

  return { lines, insights, warning }
}
