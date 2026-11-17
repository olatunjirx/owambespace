/**
 * A host's events, and the arithmetic every screen shares.
 *
 * A host runs many events at once — a wedding in December, a mother's 60th in
 * March, a company retreat in between. Everything here is scoped to one event
 * by id; nothing is global to the profile.
 */

export type EventType =
  | 'Wedding'
  | 'Birthday'
  | 'Naming ceremony'
  | 'Burial'
  | 'Corporate event'
  | 'Concert or show'
  | 'Something else'

export const EVENT_TYPES: EventType[] = [
  'Wedding',
  'Birthday',
  'Naming ceremony',
  'Burial',
  'Corporate event',
  'Concert or show',
  'Something else',
]

/* ── Checklist ───────────────────────────────────────────── */

export type ChecklistItem = {
  id: string
  label: string
  /** Why it matters — shown under the label, not a second task. */
  note: string
  /** Weeks before the event this should be done. Drives ordering. */
  weeksBefore: number
  done: boolean
  /** Generated items can be regenerated; custom ones the host owns. */
  custom: boolean
  /**
   * A step the app can complete on the host's behalf. Kept on the item so
   * doing the real thing — booking a venue, setting a date — ticks it off
   * instead of leaving the checklist arguing with the rest of the screen.
   */
  satisfiedBy?: 'date' | 'budget' | 'venue'
}

/* ── Guests ──────────────────────────────────────────────── */

/**
 * Stored keys stay as first written ('coming', 'declined') so lists saved by
 * earlier builds still load; the words people see are in RSVP_LABELS.
 */
export type RsvpStatus = 'invited' | 'coming' | 'maybe' | 'waitlist' | 'declined'

export type Guest = {
  id: string
  name: string
  /** Email or phone as first typed. Older guests only have this. */
  contact: string
  email?: string
  phone?: string
  status: RsvpStatus
  plusOnes: number
  dietary?: string
  /** The guest's own message, or the host's note about them. */
  note?: string
  /** Whether the host typed them in or they registered through an RSVP link. */
  source?: 'host' | 'rsvp'
  addedISO?: string
  statusISO?: string
}

export const RSVP_LABELS: Record<RsvpStatus, string> = {
  invited: 'Invited',
  coming: 'Going',
  maybe: 'Maybe',
  waitlist: 'Waitlist',
  declined: 'Not going',
}

export const RSVP_HINTS: Record<RsvpStatus, string> = {
  invited: 'Invitation sent, no reply yet.',
  coming: 'Confirmed. Counts toward the head count.',
  maybe: 'Not sure yet. Worth a follow-up closer to the day.',
  waitlist: 'Wants to come, but there is no space yet. Offer a spot if one frees up.',
  declined: 'Cannot make it.',
}

export const RSVP_ORDER: RsvpStatus[] = ['coming', 'maybe', 'invited', 'waitlist', 'declined']

export function guestEmail(guest: Guest): string {
  return guest.email ?? (guest.contact.includes('@') ? guest.contact : '')
}

export function guestPhone(guest: Guest): string {
  return guest.phone ?? (guest.contact && !guest.contact.includes('@') ? guest.contact : '')
}

/* ── Budget ──────────────────────────────────────────────── */

export type BudgetCategory =
  | 'Venue'
  | 'Catering'
  | 'Decor'
  | 'Photo & video'
  | 'Music'
  | 'Attire'
  | 'Transport'
  | 'Other'

export const BUDGET_CATEGORIES: BudgetCategory[] = [
  'Venue',
  'Catering',
  'Decor',
  'Photo & video',
  'Music',
  'Attire',
  'Transport',
  'Other',
]

/**
 * One line of the budget: what it is for and what it costs. A single amount on
 * purpose — the budget shows where the money goes, not a payments ledger.
 */
export type Expense = {
  id: string
  label: string
  category: BudgetCategory
  amount: number
  /** Set when the line was created by a venue booking rather than by hand. */
  bookingId?: string
}

/* ── Bookings ────────────────────────────────────────────── */

/**
 * Every venue books instantly, so a booking starts `confirmed` with the
 * deposit taken. Saved venues are not bookings — they live in `saved` until
 * the host commits.
 */
export type BookingStatus = 'confirmed' | 'cancelled'

export type Booking = {
  id: string
  venueId: string
  status: BookingStatus
  /** The date being booked, which need not be the event's own date yet. */
  date: string
  guests: number
  /** Names of in-house services added at checkout. */
  addOns: string[]
  total: number
  deposit: number
  balanceDueISO: string
  /** Set once the host has paid the rest. */
  balancePaidISO?: string
  createdISO: string
}

/**
 * A service provider booked for the event — caterer, DJ, photographer. Same
 * instant-book rules as a venue: a fixed-price package, a deposit up front,
 * and chat only once that deposit is paid. The provider's name is copied in
 * so a hire still reads properly if the listing is later removed.
 */
export type Hire = {
  id: string
  vendorId: string
  vendorName: string
  /** Directory category slug, e.g. 'catering'. */
  category: string
  packageId: string
  packageName: string
  status: BookingStatus
  date: string
  guests: number
  total: number
  deposit: number
  balanceDueISO: string
  balancePaidISO?: string
  createdISO: string
}

/* ── The event ───────────────────────────────────────────── */

export type EventRecord = {
  id: string
  name: string
  type: EventType
  /** ISO yyyy-mm-dd, or '' while the host is still deciding. */
  date: string
  guestEstimate: number
  state: string
  city: string
  budget: number
  createdISO: string
  checklist: ChecklistItem[]
  guests: Guest[]
  expenses: Expense[]
  bookings: Booking[]
  /** Service providers booked for this event. */
  hires: Hire[]
  /** Venue ids saved for later, in save order. */
  saved: string[]
  /**
   * The day-of run sheet, once the host has touched it. Absent means "show
   * the generated one" — storing a copy only when it is edited keeps a sheet
   * following the head count until the host takes it over.
   *
   * Typed through `import()` rather than a top-level import: runSheet.ts
   * already imports this module, and an inline import type is erased at
   * compile time, so the runtime dependency stays one-way.
   */
  runSheet?: import('./runSheet').RunSheet
  /** Typed through `import()` for the same one-way-dependency reason. */
  flyer?: import('./flyers').FlyerDesign
}

export function emptyEvent(): EventRecord {
  return {
    id: makeId(),
    name: '',
    type: 'Wedding',
    date: '',
    guestEstimate: 0,
    state: '',
    city: '',
    budget: 0,
    createdISO: new Date().toISOString(),
    checklist: [],
    guests: [],
    expenses: [],
    bookings: [],
    hires: [],
    saved: [],
  }
}

/** Hires still standing — what the event has actually committed to. */
export function activeHires(event: EventRecord): Hire[] {
  return event.hires.filter((hire) => hire.status === 'confirmed')
}

/* ── Derived numbers ─────────────────────────────────────── */

export type GuestTotals = {
  invited: number
  coming: number
  declined: number
  maybe: number
  waitlist: number
  /** Heads, not invitations: everyone coming plus their plus-ones. */
  headCount: number
  /** Invited with no answer, plus maybes. The waitlist has answered. */
  awaiting: number
}

export function guestTotals(guests: Guest[]): GuestTotals {
  const totals: GuestTotals = {
    invited: guests.length,
    coming: 0,
    declined: 0,
    maybe: 0,
    waitlist: 0,
    headCount: 0,
    awaiting: 0,
  }

  for (const guest of guests) {
    if (guest.status === 'coming') {
      totals.coming += 1
      totals.headCount += 1 + guest.plusOnes
    } else if (guest.status === 'declined') {
      totals.declined += 1
    } else if (guest.status === 'waitlist') {
      totals.waitlist += 1
    } else if (guest.status === 'maybe') {
      totals.maybe += 1
      totals.awaiting += 1
    } else {
      totals.awaiting += 1
    }
  }

  return totals
}

export type BudgetTotals = {
  budget: number
  /** Everything listed in the budget. */
  spent: number
  /** Budget minus spent. Negative once the list outgrows the budget. */
  remaining: number
  over: number
  /** spent / budget, capped at 1, for meters. */
  ratio: number
}

export function budgetTotals(event: EventRecord): BudgetTotals {
  const spent = event.expenses.reduce((sum, item) => sum + item.amount, 0)
  return {
    budget: event.budget,
    spent,
    remaining: event.budget - spent,
    over: Math.max(0, spent - event.budget),
    ratio: event.budget > 0 ? Math.min(1, spent / event.budget) : 0,
  }
}

export function checklistProgress(event: EventRecord): { done: number; total: number } {
  return {
    done: event.checklist.filter((item) => item.done).length,
    total: event.checklist.length,
  }
}

export function activeBookings(event: EventRecord): Booking[] {
  return event.bookings.filter((booking) => booking.status !== 'cancelled')
}

/**
 * Which lifecycle bucket an event sits in.
 *
 * Derived, never stored: an event is "in planning" until a venue is actually
 * confirmed, which is the point where it stops being an idea and becomes a
 * commitment.
 */
export type EventStage = 'upcoming' | 'planning' | 'past'

export function eventStage(event: EventRecord): EventStage {
  const days = daysUntil(event.date)
  if (days !== null && days < 0) return 'past'

  const committed = activeBookings(event).some(
    (booking) => booking.status === 'confirmed',
  )
  return committed ? 'upcoming' : 'planning'
}

/** What an event still needs before it counts as committed. */
export function missingPieces(event: EventRecord): string[] {
  const missing: string[] = []
  if (!event.date) missing.push('a date')
  if (!activeBookings(event).some((booking) => booking.status === 'confirmed')) {
    missing.push('a booked venue')
  }
  return missing
}

/* ── Dates ───────────────────────────────────────────────── */

const LONG_DATE = new Intl.DateTimeFormat('en-NG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const SHORT_DATE = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatEventDate(iso: string): string {
  const date = parseISO(iso)
  return date ? LONG_DATE.format(date) : 'Date not set'
}

export function formatShortDate(iso: string): string {
  const date = parseISO(iso)
  return date ? SHORT_DATE.format(date) : 'No date'
}

function parseISO(iso: string): Date | null {
  if (!iso) return null
  const date = new Date(`${iso}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Whole days from today. Negative once the date has passed. */
export function daysUntil(iso: string): number | null {
  const target = parseISO(iso)
  if (!target) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export function countdownLabel(iso: string): string {
  const days = daysUntil(iso)
  if (days === null) return 'No date yet'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 0) return `${Math.abs(days)} days ago`
  if (days < 31) return `${days} days away`

  const months = Math.round(days / 30)
  return months === 1 ? 'About a month away' : `About ${months} months away`
}

/** Today as yyyy-mm-dd in the user's own zone, for date-input floors. */
export function todayISO(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10)
}

/**
 * Adds days to an ISO date, for deposit balance dates.
 *
 * Formatted from local parts rather than `toISOString`, which converts to UTC
 * and lands a day early anywhere ahead of it — Lagos included.
 */
export function addDays(iso: string, days: number): string {
  const date = parseISO(iso)
  if (!date) return ''

  date.setDate(date.getDate() + days)

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function isWeekend(iso: string): boolean {
  const date = parseISO(iso)
  if (!date) return false
  const day = date.getDay()
  return day === 0 || day === 6
}

export function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}
