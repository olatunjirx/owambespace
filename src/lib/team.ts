import { budgetGuidance } from './budgetPlan'
import type { EventRecord, EventType } from './events'
import { allVendors } from './vendors'
import type { Vendor } from './vendors'

/**
 * Suggested vendor team — spec §10.5.
 *
 * Given the event's type, place, head count and budget, picks one provider
 * per role the event actually needs and keeps the total within what the
 * budget leaves after the venue.
 *
 * Selection is scored, not generated: local providers beat distant ones,
 * affordable beats expensive, and well-reviewed breaks ties. Every suggestion
 * carries the reason it was picked, so the host can disagree with the logic
 * rather than with a black box.
 */

/** Which roles matter for which kind of event, in the order they get budget. */
const ROLES_BY_TYPE: Record<EventType, string[]> = {
  Wedding: ['catering', 'photo', 'decor', 'music', 'beauty', 'mc'],
  Birthday: ['catering', 'decor', 'music', 'photo'],
  'Naming ceremony': ['catering', 'decor', 'photo'],
  Burial: ['catering', 'security', 'photo'],
  'Corporate event': ['catering', 'photo', 'security', 'mc'],
  'Concert or show': ['music', 'security', 'photo'],
  'Something else': ['catering', 'photo', 'decor'],
}

export type Suggestion = {
  role: string
  vendor: Vendor
  /** What this vendor is likely to cost for this event. */
  estimate: number
  reasons: string[]
}

export type TeamPlan = {
  suggestions: Suggestion[]
  /** Sum of the estimates. */
  estimated: number
  /** Budget left after the venue, which the team has to fit inside. */
  available: number
  /** Roles with no provider that fits — named rather than silently dropped. */
  unfilled: string[]
}

/** Multiplies per-guest pricing out so every role is comparable. */
export function estimateFor(vendor: Vendor, guests: number): number {
  return vendor.priceUnit === 'per guest' ? vendor.priceFrom * Math.max(1, guests) : vendor.priceFrom
}

export function suggestTeam(event: EventRecord): TeamPlan {
  const guidance = budgetGuidance(event)
  const guests = event.guestEstimate || 100

  // The venue is either already booked or budgeted for; the team competes for
  // what is left, not for the whole ceiling.
  const venueRow = guidance.rows.find((row) => row.category === 'Venue')
  const venueCost = Math.max(venueRow?.planned ?? 0, venueRow?.suggested ?? 0)
  const available = Math.max(0, event.budget - venueCost)

  const roles = ROLES_BY_TYPE[event.type] ?? ROLES_BY_TYPE['Something else']
  const suggestions: Suggestion[] = []
  const unfilled: string[] = []
  let spent = 0

  for (const role of roles) {
    const remaining = available - spent
    const candidates = allVendors().filter((vendor) => vendor.category === role)

    const scored = candidates
      .map((vendor) => {
        const estimate = estimateFor(vendor, guests)
        const reasons: string[] = []
        let score = vendor.rating

        if (event.state && vendor.state === event.state) {
          score += 2
          reasons.push('local to your event')
        }

        if (estimate <= remaining) {
          score += 1.5
        } else {
          // Over what is left is not disqualifying on its own — the last
          // role should still show the cheapest option rather than nothing.
          score -= 2
        }

        if (vendor.reviews >= 100) {
          score += 0.5
          reasons.push(`${vendor.reviews} reviews`)
        }

        if (vendor.rating >= 4.7) reasons.push(`rated ${vendor.rating.toFixed(1)}`)

        return { vendor, estimate, reasons, score, affordable: estimate <= remaining }
      })
      .sort((a, b) => b.score - a.score)

    const pick = scored.find((entry) => entry.affordable) ?? scored[0]

    if (!pick) {
      unfilled.push(role)
      continue
    }

    if (!pick.affordable) {
      pick.reasons.push('over what the budget leaves')
    }

    suggestions.push({
      role,
      vendor: pick.vendor,
      estimate: pick.estimate,
      reasons: pick.reasons,
    })
    spent += pick.estimate
  }

  return { suggestions, estimated: spent, available, unfilled }
}
