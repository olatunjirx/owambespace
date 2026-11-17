import { BUDGET_CATEGORIES, budgetTotals } from './events'
import type { BudgetCategory, EventRecord, EventType } from './events'

/**
 * Budget guidance — spec §10.7.
 *
 * Splits a ceiling across categories using the shape typical for that kind of
 * event, then compares what the host has actually committed against it and
 * says where they are heavy or light.
 *
 * The splits are published planning rules of thumb, not model output. That
 * matters: every number here can be traced to the table below, so the advice
 * is auditable in a way a generated answer would not be. A real model would
 * refine these against actual bookings by city — the shape it returns should
 * stay the same.
 */

type Split = Partial<Record<BudgetCategory, number>>

/** Shares of the total, per event type. Each column sums to 1. */
export const SPLITS: Record<EventType, Split> = {
  Wedding: {
    Venue: 0.3,
    Catering: 0.28,
    Decor: 0.12,
    'Photo & video': 0.1,
    Music: 0.07,
    Attire: 0.08,
    Transport: 0.02,
    Other: 0.03,
  },
  Birthday: {
    Venue: 0.26,
    Catering: 0.34,
    Decor: 0.14,
    'Photo & video': 0.08,
    Music: 0.1,
    Attire: 0.03,
    Transport: 0.02,
    Other: 0.03,
  },
  'Naming ceremony': {
    Venue: 0.22,
    Catering: 0.4,
    Decor: 0.14,
    'Photo & video': 0.1,
    Music: 0.06,
    Attire: 0.04,
    Transport: 0.02,
    Other: 0.02,
  },
  Burial: {
    Venue: 0.2,
    Catering: 0.42,
    Decor: 0.08,
    'Photo & video': 0.06,
    Music: 0.04,
    Attire: 0.06,
    Transport: 0.1,
    Other: 0.04,
  },
  'Corporate event': {
    Venue: 0.38,
    Catering: 0.3,
    Decor: 0.06,
    'Photo & video': 0.09,
    Music: 0.05,
    Transport: 0.05,
    Other: 0.07,
  },
  'Concert or show': {
    Venue: 0.34,
    Music: 0.3,
    Catering: 0.08,
    'Photo & video': 0.08,
    Decor: 0.06,
    Transport: 0.04,
    Other: 0.1,
  },
  'Something else': {
    Venue: 0.3,
    Catering: 0.3,
    Decor: 0.12,
    'Photo & video': 0.1,
    Music: 0.08,
    Transport: 0.04,
    Other: 0.06,
  },
}

/**
 * Rough per-head catering floors by state, in naira. Used to sanity-check a
 * budget against the head count rather than only against itself.
 */
export const CATERING_FLOOR: Record<string, number> = {
  Lagos: 7_500,
  'Abuja (FCT)': 8_000,
  Rivers: 7_000,
  Oyo: 5_500,
  Enugu: 5_500,
}

export const DEFAULT_FLOOR = 6_000

export type CategoryPlan = {
  category: BudgetCategory
  /** What the split suggests for this category. */
  suggested: number
  /** What the host has actually committed. */
  planned: number
  /** planned − suggested. Negative means room left. */
  delta: number
  /** Only set when the gap is worth mentioning. */
  note?: string
}

export type BudgetGuidance = {
  total: number
  rows: CategoryPlan[]
  /** Sentences worth surfacing above the table. */
  flags: string[]
}

export function budgetGuidance(event: EventRecord): BudgetGuidance {
  const totals = budgetTotals(event)
  const split = SPLITS[event.type] ?? SPLITS['Something else']

  const plannedBy = new Map<BudgetCategory, number>()
  for (const expense of event.expenses) {
    plannedBy.set(expense.category, (plannedBy.get(expense.category) ?? 0) + expense.amount)
  }

  const rows: CategoryPlan[] = BUDGET_CATEGORIES.map((category) => {
    const share = split[category] ?? 0
    const suggested = Math.round(event.budget * share)
    const planned = plannedBy.get(category) ?? 0
    const delta = planned - suggested

    let note: string | undefined
    if (suggested > 0 && planned > 0) {
      const ratio = planned / suggested
      // Only speak up when the gap is big enough to act on.
      if (ratio >= 1.25) note = `${Math.round((ratio - 1) * 100)}% above typical`
      else if (ratio <= 0.7) note = `${Math.round((1 - ratio) * 100)}% below typical`
    }

    return { category, suggested, planned, delta, note }
  }).filter((row) => row.suggested > 0 || row.planned > 0)

  const flags: string[] = []

  if (event.budget > 0 && event.guestEstimate > 0) {
    const floor = CATERING_FLOOR[event.state] ?? DEFAULT_FLOOR
    const cateringShare = Math.round(event.budget * (split.Catering ?? 0.3))
    const needed = floor * event.guestEstimate

    if (needed > cateringShare) {
      flags.push(
        `Feeding ${event.guestEstimate} guests in ${event.state || 'this area'} starts around ${naira(needed)}, but a typical ${event.type.toLowerCase()} budget leaves ${naira(cateringShare)} for catering. Expect to raise the budget or trim the list.`,
      )
    }
  }

  if (totals.over > 0) {
    flags.push(
      `You have committed ${naira(totals.over)} more than the budget across all categories.`,
    )
  }

  const unallocated = event.budget - totals.spent
  if (unallocated > event.budget * 0.35 && totals.spent > 0) {
    flags.push(
      `${naira(unallocated)} is still unallocated — the categories below show where it usually goes.`,
    )
  }

  return { total: event.budget, rows, flags }
}

/** Local formatter; money.ts is for display, this is for message strings. */
export function naira(amount: number): string {
  if (amount >= 1_000_000) return `₦${(Math.round(amount / 100_000) / 10).toLocaleString('en-NG')}m`
  if (amount >= 1_000) return `₦${Math.round(amount / 1_000).toLocaleString('en-NG')}k`
  return `₦${Math.round(amount).toLocaleString('en-NG')}`
}

/**
 * A starting total for a host with no number in mind, worked back from what
 * feeding the expected guests costs locally and catering's usual share.
 * Money already budgeted past a category's usual share is added on top, so the
 * suggestion never comes in under what is already committed.
 */
export function suggestedBudget(event: EventRecord): number {
  const split = SPLITS[event.type] ?? SPLITS['Something else']
  const heads = event.guestEstimate > 0 ? event.guestEstimate : 100
  const floor = CATERING_FLOOR[event.state] ?? DEFAULT_FLOOR
  const base = (floor * heads) / (split.Catering ?? 0.3)

  let extra = 0
  for (const category of BUDGET_CATEGORIES) {
    const committed = event.expenses
      .filter((expense) => expense.category === category)
      .reduce((sum, expense) => sum + expense.amount, 0)
    extra += Math.max(0, committed - base * (split[category] ?? 0))
  }

  return Math.ceil((base + extra) / 100_000) * 100_000
}
