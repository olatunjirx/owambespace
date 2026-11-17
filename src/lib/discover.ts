import { NO_FILTERS, allVenues, filterVenues } from './venues'
import type { Venue } from './venues'
import { allVendors, findCategory } from './vendors'
import type { Vendor } from './vendors'

/**
 * Search across everything an event hires — venues and services alike.
 *
 * Two modes share one engine. Classic search is plain text matching. Describe
 * mode runs the same matching after extracting structure from a sentence:
 * "catering in Lagos for 200 guests under ₦2m" becomes a category, a state, a
 * head count and a price ceiling.
 *
 * The extraction is rule-based and runs on the device. It is the seam where
 * the spec's conversational AI search plugs in later — the AI's job will be
 * producing this same Intent shape, so nothing downstream changes.
 */

export type Intent = {
  /** A vendor category slug, or 'venues'. Unset when the sentence has none. */
  category?: string
  state?: string
  minCapacity?: number
  maxPrice?: number
  /** What is left after the structured parts are pulled out. */
  keywords: string
}

const CATEGORY_HINTS: Record<string, RegExp> = {
  venues: /\b(venue|hall|centre|center|ballroom|garden|rooftop|roof top|space|dome|event cent)\w*/,
  catering: /\b(cater|food|jollof|chops|buffet|chef|drinks?|bartend)\w*/,
  decor: /\b(decor|flower|floral|balloon|rental|chairs?|tables?|linen|drap)\w*/,
  photo: /\b(photo|video|camera|film|drone|livestream)\w*/,
  music: /\b(dj|band|music|sound)\w*/,
  mc: /\b(mc|comedian|compere|hype ?man|host)\w*/,
  security: /\b(security|bouncer|guard|usher|protocol)\w*/,
  beauty: /\b(makeup|make-up|gele|hair|styling|beauty)\w*/,
  planners: /\b(planner|coordinat)\w*/,
}

/** Areas people actually type, mapped to the state the data uses. */
const PLACE_TO_STATE: Record<string, string> = {
  lagos: 'Lagos',
  lekki: 'Lagos',
  ikeja: 'Lagos',
  yaba: 'Lagos',
  ikoyi: 'Lagos',
  surulere: 'Lagos',
  'victoria island': 'Lagos',
  vi: 'Lagos',
  abuja: 'Abuja (FCT)',
  maitama: 'Abuja (FCT)',
  wuse: 'Abuja (FCT)',
  jabi: 'Abuja (FCT)',
  garki: 'Abuja (FCT)',
  'port harcourt': 'Rivers',
  rivers: 'Rivers',
  ibadan: 'Oyo',
  bodija: 'Oyo',
  oyo: 'Oyo',
  enugu: 'Enugu',
}

export function parseIntent(input: string): Intent {
  let text = ` ${input.toLowerCase()} `
  const intent: Intent = { keywords: '' }

  // Guests first — "200 guests" must never be read as ₦200.
  const guests = text.match(/([\d][\d,]*)\s*(?:guests?|people|persons)/)
  if (guests) {
    intent.minCapacity = Number(guests[1].replace(/,/g, ''))
    text = text.replace(guests[0], ' ')
  }

  // Money needs a marker: a ₦ prefix, a unit suffix, or a budget word before
  // it. A bare number is never money — that is how "hall for 300" stays a
  // description instead of becoming a ₦300 ceiling.
  const money =
    text.match(/₦\s*([\d][\d,]*(?:\.\d+)?)\s*(m\b|million|k\b|thousand)?/) ??
    text.match(/\b([\d][\d,]*(?:\.\d+)?)\s*(m\b|million|k\b|thousand)\b/) ??
    text.match(/(?:budget|under|below|max|up to|within|less than)\s*(?:of\s*)?₦?\s*([\d][\d,]*)()/)
  if (money) {
    const value = Number(money[1].replace(/,/g, ''))
    if (!Number.isNaN(value) && value > 0) {
      const unit = money[2] ?? ''
      // All stated amounts are ceilings — that is how people give budgets.
      intent.maxPrice = unit.startsWith('m')
        ? Math.round(value * 1_000_000)
        : unit.startsWith('k') || unit.startsWith('t')
          ? Math.round(value * 1_000)
          : Math.round(value)
      text = text.replace(money[0], ' ')
    }
  }

  for (const [place, state] of Object.entries(PLACE_TO_STATE)) {
    if (text.includes(` ${place} `) || text.includes(` ${place},`)) {
      intent.state = state
      break
    }
  }

  for (const [slug, pattern] of Object.entries(CATEGORY_HINTS)) {
    if (pattern.test(text)) {
      intent.category = slug
      break
    }
  }

  intent.keywords = text.replace(/\s+/g, ' ').trim()
  return intent
}

/** Human-readable echo of what the parser understood, for the chips row. */
export function describeIntent(intent: Intent): string[] {
  const parts: string[] = []

  if (intent.category === 'venues') parts.push('Venues')
  else if (intent.category) {
    parts.push(findCategory(intent.category)?.label ?? intent.category)
  }

  if (intent.state) parts.push(intent.state)
  if (intent.minCapacity) parts.push(`${intent.minCapacity.toLocaleString('en-NG')}+ guests`)
  if (intent.maxPrice) {
    parts.push(
      intent.maxPrice >= 1_000_000
        ? `under ₦${(intent.maxPrice / 1_000_000).toLocaleString('en-NG')}m`
        : `under ₦${(intent.maxPrice / 1_000).toLocaleString('en-NG')}k`,
    )
  }

  return parts
}

export type SearchResults = {
  venues: Venue[]
  vendors: Vendor[]
}

/** Classic mode: plain text against both directories. */
export function searchAll(query: string): SearchResults {
  const needle = query.trim().toLowerCase()
  if (!needle) return { venues: [], vendors: [] }

  return {
    venues: allVenues().filter((venue) =>
      `${venue.name} ${venue.area} ${venue.state} ${venue.spaceType} ${venue.tagline}`
        .toLowerCase()
        .includes(needle),
    ),
    vendors: allVendors().filter((vendor) =>
      `${vendor.name} ${vendor.area} ${vendor.state} ${vendor.tagline} ${vendor.services.join(' ')}`
        .toLowerCase()
        .includes(needle),
    ),
  }
}

/** Describe mode: structure first, text matching on whatever remains. */
export function searchByIntent(intent: Intent): SearchResults {
  const wantsVenues = intent.category === 'venues' || (!intent.category && Boolean(intent.minCapacity))
  const wantsVendors = intent.category !== 'venues'

  const venues = wantsVenues
    ? filterVenues(allVenues(), {
        ...NO_FILTERS,
        state: intent.state ?? '',
        minCapacity: intent.minCapacity ?? 0,
        maxPrice: intent.maxPrice ?? 0,
      })
    : []

  let vendors = wantsVendors
    ? allVendors().filter((vendor) => {
        if (intent.category && vendor.category !== intent.category) return false
        if (intent.state && vendor.state !== intent.state) return false
        if (intent.maxPrice && vendor.priceFrom > intent.maxPrice) return false
        return true
      })
    : []

  // Nothing structured at all — fall back to plain text so the box never
  // pretends to understand less than classic search does.
  if (!intent.category && !intent.state && !intent.minCapacity && !intent.maxPrice) {
    return searchAll(intent.keywords)
  }

  // A category alone with leftover words narrows further by text.
  if (intent.keywords && !intent.category) {
    const needle = intent.keywords
    vendors = vendors.filter((vendor) =>
      `${vendor.name} ${vendor.tagline} ${vendor.services.join(' ')}`
        .toLowerCase()
        .includes(needle),
    )
  }

  return { venues, vendors }
}

/* ── Ranking and explanations (spec §10.1) ────────────────────
 * Matches come back ordered by how well they fit, each with a sentence
 * saying why. The reasons are generated from the actual comparison — no
 * model is involved, so nothing here can claim a fit the data does not
 * support. When a real model lands it should produce this same shape.
 */

export type Ranked<T> = {
  item: T
  score: number
  /** Short phrases, joined into a sentence by the caller. */
  reasons: string[]
}

export function rankVenues(venues: Venue[], intent: Intent): Ranked<Venue>[] {
  return venues
    .map((venue) => {
      const reasons: string[] = []
      let score = 0

      if (intent.state && venue.state === intent.state) {
        score += 3
        reasons.push(`in ${venue.area}, ${venue.state}`)
      }

      if (intent.minCapacity) {
        const headroom = venue.capacity - intent.minCapacity
        if (headroom >= 0) {
          // A hall barely big enough is a worse fit than one with room.
          score += headroom < intent.minCapacity * 0.5 ? 3 : 2
          reasons.push(
            headroom === 0
              ? `seats exactly ${venue.capacity}`
              : `seats ${venue.capacity}, ${headroom} spare`,
          )
        }
      }

      if (intent.maxPrice) {
        const under = intent.maxPrice - venue.pricePerDay
        if (under >= 0) {
          score += 2
          reasons.push(
            under > intent.maxPrice * 0.3
              ? 'well inside your budget'
              : 'just inside your budget',
          )
        }
      }

      score += venue.rating - 4
      if (venue.rating >= 4.7) reasons.push(`rated ${venue.rating.toFixed(1)}`)

      return { item: venue, score, reasons }
    })
    .sort((a, b) => b.score - a.score)
}

export function rankVendors(vendors: Vendor[], intent: Intent): Ranked<Vendor>[] {
  return vendors
    .map((vendor) => {
      const reasons: string[] = []
      let score = 0

      if (intent.state && vendor.state === intent.state) {
        score += 3
        reasons.push(`works in ${vendor.area}, ${vendor.state}`)
      }

      if (intent.maxPrice) {
        // Per-guest pricing has to be multiplied out before it can be
        // compared to a budget, or every caterer looks cheap.
        const effective =
          vendor.priceUnit === 'per guest' && intent.minCapacity
            ? vendor.priceFrom * intent.minCapacity
            : vendor.priceFrom

        if (effective <= intent.maxPrice) {
          score += 2
          reasons.push(
            vendor.priceUnit === 'per guest' && intent.minCapacity
              ? `about ${formatShort(effective)} for ${intent.minCapacity}`
              : 'inside your budget',
          )
        }
      }

      score += vendor.rating - 4
      if (vendor.reviews >= 100) {
        score += 0.5
        reasons.push(`${vendor.reviews} reviews`)
      }

      return { item: vendor, score, reasons }
    })
    .sort((a, b) => b.score - a.score)
}

function formatShort(amount: number): string {
  if (amount >= 1_000_000) return `₦${Math.round(amount / 100_000) / 10}m`
  if (amount >= 1_000) return `₦${Math.round(amount / 1_000)}k`
  return `₦${amount}`
}

/** Turns reason phrases into one sentence, or empty when there is nothing. */
export function explain(reasons: string[]): string {
  if (reasons.length === 0) return ''
  if (reasons.length === 1) return capitalise(reasons[0])
  const head = reasons.slice(0, -1).join(', ')
  return capitalise(`${head} and ${reasons[reasons.length - 1]}`)
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
