import { addDays, daysUntil, isWeekend, makeId, todayISO } from './events'
import { CONTACT_NOUNS, findContactDetails } from './contactGuard'
import type { EventDayGuide, SeatingConfig, Venue, VenueSpace } from './venues'

/**
 * The venue owner's side of the platform.
 *
 * A listing is built up over several sittings, so every field starts empty and
 * the setup steps decide what "done" means — never the form that happens to be
 * on screen. The same record is what hosts eventually browse: `toDirectoryVenue`
 * turns a live listing into the `Venue` shape the host directory already reads.
 */

/* ── Listing ─────────────────────────────────────────────── */

/**
 * `draft` is still being written; `review` has been submitted and is waiting
 * on moderation; `live` is bookable; `paused` is hidden from hosts but keeps
 * its bookings.
 */
export type ListingStatus = 'draft' | 'review' | 'live' | 'paused'

export const STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Draft',
  review: 'In review',
  live: 'Live',
  paused: 'Paused',
}

export type CancellationPolicy = 'flexible' | 'moderate' | 'strict'

export const CANCELLATION_POLICIES: Record<
  CancellationPolicy,
  { label: string; summary: string; text: string }
> = {
  flexible: {
    label: 'Flexible',
    summary: 'Most attractive to hosts',
    text: 'Full refund up to 14 days before. 50% up to 7 days. No refund inside 7 days.',
  },
  moderate: {
    label: 'Moderate',
    summary: 'What most venues choose',
    text: 'Full refund up to 30 days before. 50% up to 14 days. No refund inside 14 days.',
  },
  strict: {
    label: 'Strict',
    summary: 'For dates that are hard to re-sell',
    text: 'Full refund up to 60 days before. 50% up to 30 days. No refund inside 30 days.',
  },
}

export type ListingPhoto = {
  id: string
  /** A downscaled data URL — there is no upload server in this build. */
  src: string
  caption: string
}

export type InHouseService = {
  name: string
  price: number
  /** Priced per head (catering) rather than as one flat fee. */
  perGuest: boolean
}

export type BlockedDate = {
  date: string
  reason: string
  /** Closed by an owner cancellation, so it can't be reopened and resold. */
  locked?: boolean
}

export type OwnerVenue = {
  id: string
  status: ListingStatus
  createdISO: string
  submittedISO?: string
  publishedISO?: string

  name: string
  tagline: string
  description: string
  spaceType: string

  state: string
  area: string
  address: string
  directions: string

  spaces: VenueSpace[]
  seating: SeatingConfig[]
  amenities: string[]
  /** First photo is the cover. */
  photos: ListingPhoto[]

  pricePerDay: number
  weekendPremium: number
  depositPercent: number
  inHouse: InHouseService[]

  cancellation: CancellationPolicy | ''
  curfew: string
  alcohol: string
  outsideVendors: string
  houseRules: string
  faq: { question: string; answer: string }[]

  guide: EventDayGuide
  /** Shown to the host 7 days before the event, once the balance is paid. */
  eventDayPhone: string

  blocked: BlockedDate[]
  /** Percentage off the base hire for Monday–Friday dates. 0 = no offer. */
  weekdayOffer: number
  /** ISO date the paid featured placement runs until. */
  featuredUntil?: string
  hue: number
}

export function emptyVenue(seed: Partial<OwnerVenue> = {}): OwnerVenue {
  const id = seed.id ?? `ov-${makeId()}`
  return {
    id,
    status: 'draft',
    createdISO: new Date().toISOString(),
    name: '',
    tagline: '',
    description: '',
    spaceType: '',
    state: '',
    area: '',
    address: '',
    directions: '',
    spaces: [],
    seating: [],
    amenities: [],
    photos: [],
    pricePerDay: 0,
    weekendPremium: 20,
    depositPercent: 30,
    inHouse: [],
    cancellation: '',
    curfew: '',
    alcohol: '',
    outsideVendors: '',
    houseRules: '',
    faq: [],
    guide: { arrival: '', parking: '', setup: '', power: '' },
    eventDayPhone: '',
    blocked: [],
    weekdayOffer: 0,
    hue: hueFor(id),
    ...seed,
  }
}

/** A stable placeholder hue per listing, so cards are not all one purple. */
function hueFor(id: string): number {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 360
  return hash
}

export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'V'
  return (words[0][0] + (words[1]?.[0] ?? '')).toUpperCase()
}

/** Rows the owner has actually filled in — a blank row is not a space. */
export function filledSpaces(venue: OwnerVenue): VenueSpace[] {
  return venue.spaces.filter((space) => space.name.trim() && space.capacity > 0)
}

export function filledSeating(venue: OwnerVenue): SeatingConfig[] {
  return venue.seating.filter((layout) => layout.capacity > 0)
}

/**
 * The one number hosts compare. Banquet when it is given, because that is
 * how halls are quoted; otherwise the largest space.
 */
export function headlineCapacity(venue: OwnerVenue): number {
  const banquet = venue.seating.find((layout) => layout.name === 'Banquet')?.capacity ?? 0
  const largestSpace = venue.spaces.reduce((max, space) => Math.max(max, space.capacity), 0)
  return banquet || largestSpace
}

/* ── Setup steps ─────────────────────────────────────────── */

export type SetupStep =
  | 'basics'
  | 'location'
  | 'spaces'
  | 'amenities'
  | 'photos'
  | 'pricing'
  | 'policies'
  | 'eventday'
  | 'review'

export const SETUP_STEPS: { id: SetupStep; label: string; hint: string }[] = [
  { id: 'basics', label: 'Basics', hint: 'Name, type and the pitch' },
  { id: 'location', label: 'Location', hint: 'Where hosts will find you' },
  { id: 'spaces', label: 'Spaces & capacity', hint: 'Rooms and seating layouts' },
  { id: 'amenities', label: 'Amenities', hint: 'What comes with the hire' },
  { id: 'photos', label: 'Photos', hint: 'At least three, cover first' },
  { id: 'pricing', label: 'Pricing', hint: 'Day rate, deposit and extras' },
  { id: 'policies', label: 'Policies', hint: 'Cancellation and house rules' },
  { id: 'eventday', label: 'Event day', hint: 'What hosts get after booking' },
  { id: 'review', label: 'Review & publish', hint: 'Check it, then go live' },
]

export const MIN_PHOTOS = 3
export const MAX_PHOTOS = 12
export const MIN_DESCRIPTION = 80

/**
 * What still stands between a step and done, in words an owner can act on.
 * An empty list means the step is complete.
 */
export function stepGaps(venue: OwnerVenue, step: SetupStep): string[] {
  const gaps: string[] = []

  // Free text hosts can read must not carry a way to reach the owner.
  const noContact = (label: string, text: string): void => {
    const found = findContactDetails(text)
    if (found) gaps.push(`Remove the ${CONTACT_NOUNS[found]} from ${label}`)
  }

  if (step === 'basics') {
    if (venue.name.trim().length < 2) gaps.push('Add the venue name')
    if (!venue.spaceType) gaps.push('Pick the kind of space')
    if (venue.tagline.trim().length < 10) gaps.push('Write a one-line tagline')
    if (venue.description.trim().length < MIN_DESCRIPTION) {
      gaps.push(`Describe the venue in at least ${MIN_DESCRIPTION} characters`)
    }
    noContact('the venue name', venue.name)
    noContact('the tagline', venue.tagline)
    noContact('the description', venue.description)
  }

  if (step === 'location') {
    if (!venue.state) gaps.push('Choose the state')
    if (venue.area.trim().length < 2) gaps.push('Add the area or neighbourhood')
    if (venue.address.trim().length < 6) gaps.push('Add the street address')
    noContact('the directions', venue.directions)
  }

  if (step === 'spaces') {
    if (filledSpaces(venue).length === 0) gaps.push('Add at least one space with its capacity')
    if (filledSeating(venue).length === 0) gaps.push('Turn on a seating layout and give it a number')
  }

  if (step === 'amenities' && venue.amenities.length === 0) {
    gaps.push('Tick what the hire includes')
  }

  if (step === 'photos' && venue.photos.length < MIN_PHOTOS) {
    const short = MIN_PHOTOS - venue.photos.length
    gaps.push(`Upload ${short} more photo${short === 1 ? '' : 's'}`)
  }

  if (step === 'photos') {
    for (const photo of venue.photos) noContact('a photo caption', photo.caption)
  }

  if (step === 'pricing') {
    if (venue.pricePerDay <= 0) gaps.push('Set your day rate')
    if (venue.depositPercent < 10 || venue.depositPercent > 100) {
      gaps.push('Set a deposit between 10% and 100%')
    }
    for (const service of venue.inHouse) noContact('an in-house service name', service.name)
  }

  if (step === 'policies') {
    if (!venue.cancellation) gaps.push('Choose a cancellation policy')
    if (!venue.curfew.trim()) gaps.push('Say when the event has to end')
    if (!venue.alcohol.trim()) gaps.push('Say whether alcohol is allowed')
    if (!venue.outsideVendors.trim()) gaps.push('Say whether outside vendors are allowed')
    noContact('the house rules', venue.houseRules)
    for (const entry of venue.faq) noContact('a question and answer', `${entry.question} ${entry.answer}`)
  }

  if (step === 'eventday') {
    if (!venue.guide.arrival.trim()) gaps.push('Say how hosts and guests arrive')
    if (!venue.guide.parking.trim()) gaps.push('Explain parking and vendor vehicles')
    if (!venue.guide.setup.trim()) gaps.push('Give the set-up and clear-down times')
    if (!venue.guide.power.trim()) gaps.push('Explain the power arrangements')
    const digits = venue.eventDayPhone.replace(/\D/g, '').length
    if (digits < 10 || digits > 14) gaps.push('Add a valid event-day phone number')
    noContact('the arrival details', venue.guide.arrival)
    noContact('the parking details', venue.guide.parking)
    noContact('the set-up details', venue.guide.setup)
    noContact('the power details', venue.guide.power)
  }

  if (step === 'review') {
    for (const other of SETUP_STEPS) {
      if (other.id !== 'review' && stepGaps(venue, other.id).length > 0) {
        gaps.push(`Finish ${other.label.toLowerCase()}`)
      }
    }
  }

  return gaps
}

export function listingProgress(venue: OwnerVenue): {
  done: number
  total: number
  nextStep: SetupStep
} {
  const steps = SETUP_STEPS.filter((step) => step.id !== 'review')
  const incomplete = steps.filter((step) => stepGaps(venue, step.id).length > 0)
  return {
    done: steps.length - incomplete.length,
    total: steps.length,
    nextStep: incomplete[0]?.id ?? 'review',
  }
}

export function isReadyToPublish(venue: OwnerVenue): boolean {
  return stepGaps(venue, 'review').length === 0
}

/* ── Listing strength (Promote) ──────────────────────────── */

export type StrengthTip = { text: string; step: SetupStep; points: number }

/**
 * A score out of 100 for how well a listing will convert — separate from
 * "can it publish". Every point is tied to something hosts actually filter or
 * look for, and every missing point comes with the step that fixes it.
 */
export function listingStrength(venue: OwnerVenue): { score: number; tips: StrengthTip[] } {
  const checks: (StrengthTip & { met: boolean })[] = [
    { met: venue.photos.length >= 8, points: 20, step: 'photos', text: 'Hosts book from photos. Listings with 8 or more get far more bookings.' },
    { met: venue.photos.some((photo) => photo.caption.trim()), points: 5, step: 'photos', text: 'Caption your photos so hosts know which space they are looking at.' },
    { met: venue.description.trim().length >= 250, points: 10, step: 'basics', text: 'Expand your description to 250+ characters — mention parking, power and access.' },
    { met: venue.amenities.length >= 6, points: 10, step: 'amenities', text: 'Tick every amenity you have. Hosts filter on these.' },
    { met: venue.amenities.includes('Backup power'), points: 10, step: 'amenities', text: 'Backup power is the most-filtered amenity. Add it if you have a generator.' },
    { met: venue.seating.length >= 2, points: 10, step: 'spaces', text: 'Add more seating layouts (theatre, cocktail) so you appear in more searches.' },
    { met: venue.inHouse.length > 0, points: 10, step: 'pricing', text: 'Offer in-house services — they raise the value of every booking.' },
    { met: isGuideComplete(venue), points: 10, step: 'eventday', text: 'Finish your Event Day Guide so hosts have what they need after booking.' },
    { met: venue.faq.length > 0, points: 5, step: 'policies', text: 'Answer the questions hosts always ask in an FAQ.' },
    { met: venue.directions.trim().length > 0, points: 5, step: 'location', text: 'Add directions or a landmark so guests find you first time.' },
    { met: Boolean(venue.houseRules.trim()), points: 5, step: 'policies', text: 'Spell out your house rules to avoid surprises on the day.' },
  ]

  const score = checks.reduce((sum, check) => sum + (check.met ? check.points : 0), 0)
  const tips = checks
    .filter((check) => !check.met)
    .sort((a, b) => b.points - a.points)
    .map(({ text, step, points }) => ({ text, step, points }))

  return { score, tips }
}

/* ── Directory bridge ────────────────────────────────────── */

/**
 * The host-facing shape. `unavailable` carries blocked and already-booked
 * dates so checkout can refuse them.
 */
export function toDirectoryVenue(venue: OwnerVenue, bookedDates: string[]): Venue {
  const policy = venue.cancellation ? CANCELLATION_POLICIES[venue.cancellation].text : ''
  const featured = Boolean(venue.featuredUntil && (daysUntil(venue.featuredUntil) ?? -1) >= 0)

  return {
    id: venue.id,
    name: venue.name,
    tagline: venue.tagline,
    description: venue.description,
    area: venue.area,
    state: venue.state,
    spaceType: venue.spaceType,
    capacity: headlineCapacity(venue),
    seating: filledSeating(venue),
    spaces: filledSpaces(venue),
    pricePerDay: venue.pricePerDay,
    weekendPremium: venue.weekendPremium,
    depositPercent: venue.depositPercent,
    rating: 0,
    reviews: [],
    amenities: venue.amenities,
    inHouse: venue.inHouse.filter((service) => service.name.trim() && service.price > 0),
    policies: {
      cancellation: policy,
      curfew: venue.curfew,
      alcohol: venue.alcohol || 'Not stated by the venue.',
      outsideVendors: venue.outsideVendors || 'Not stated by the venue.',
    },
    faq: venue.faq.filter((entry) => entry.question.trim() && entry.answer.trim()),
    initials: initialsFor(venue.name),
    hue: venue.hue,
    photos: venue.photos.map((photo) => photo.src),
    unavailable: [...new Set([...venue.blocked.map((entry) => entry.date), ...bookedDates])],
    weekdayOffer: venue.weekdayOffer,
    featured,
    afterBooking: {
      address: venue.address,
      directions: venue.directions,
      guide: venue.guide,
      phone: venue.eventDayPhone,
    },
    isNew: true,
  }
}

/* ── Bookings ────────────────────────────────────────────── */

/**
 * Every venue books instantly: `confirmed` holds the date with the deposit in
 * escrow, `completed` is after the event, when the payout is released.
 */
export type OwnerBookingStatus = 'confirmed' | 'completed' | 'cancelled'

/** Only set when the owner ended the booking; a host cancel leaves it empty. */
export type OwnerCancellation = {
  reason: string
  /** 0 when support confirmed an emergency. */
  penalty: number
  atISO: string
}

export type BookingMessage = {
  id: string
  from: 'host' | 'owner'
  text: string
  atISO: string
}

export type OwnerBooking = {
  id: string
  /** `sample` records teach the flow; `host` ones come from a real checkout. */
  source: 'sample' | 'host'
  /** For host bookings, where the record lives in the events store. */
  eventId?: string
  hostBookingId?: string
  venueId: string
  hostName: string
  eventName: string
  eventType: string
  date: string
  guests: number
  addOns: string[]
  total: number
  deposit: number
  status: OwnerBookingStatus
  createdISO: string
  balancePaid: boolean
  messages: BookingMessage[]
  /** Host messages sent after this have not been read by the owner. */
  ownerReadISO?: string
  cancellation?: OwnerCancellation
}

/** The id both sides use for a real booking's conversation. */
export function hostChatId(eventId: string, bookingId: string): string {
  return `hb-${eventId}-${bookingId}`
}

export function unreadCount(booking: OwnerBooking): number {
  const readAt = booking.ownerReadISO ?? ''
  return booking.messages.filter((message) => message.from === 'host' && message.atISO > readAt).length
}

/* ── Chat and contact release ────────────────────────────── */

/** Days after the event a chat stays open for wrapping up. */
export const CHAT_OPEN_AFTER_DAYS = 3

/** No cancellation policy gives a refund this close to the event. */
export const PHONE_RELEASE_DAYS = 7

export type ChatAccess = 'open' | 'readonly' | 'closed'

export function chatAccess(status: OwnerBookingStatus, date: string): ChatAccess {
  if (status === 'cancelled') return 'closed'
  return (daysUntil(date) ?? 0) < -CHAT_OPEN_AFTER_DAYS ? 'readonly' : 'open'
}

export function phoneReleaseDate(date: string): string {
  return addDays(date, -PHONE_RELEASE_DAYS)
}

export function phoneVisible(date: string, balancePaid: boolean): boolean {
  return balancePaid && (daysUntil(date) ?? PHONE_RELEASE_DAYS + 1) <= PHONE_RELEASE_DAYS
}

export function isGuideComplete(venue: OwnerVenue): boolean {
  return stepGaps(venue, 'eventday').length === 0
}

/** Platform commission, taken from the owner's side when a payout is released. */
export const PLATFORM_FEE_PERCENT = 10

export function payoutFor(total: number): { gross: number; fee: number; net: number } {
  const fee = Math.round((total * PLATFORM_FEE_PERCENT) / 100)
  return { gross: total, fee, net: total - fee }
}

/* ── Owner cancellations ─────────────────────────────────── */

export const EMERGENCY_REASON = 'An emergency such as fire or flood'

export const OWNER_CANCEL_REASONS = [
  'The venue is double-booked',
  'Repairs or maintenance',
  'The venue is closed on that date',
  EMERGENCY_REASON,
  'Something else',
]

/** Provisional numbers, pending the team's decision. */
export const CANCEL_LIMITS = { rankingDropAfter: 2, suspendAfter: 3 }

/** Matches the commission, so cancelling to go direct never saves money. */
export function ownerPenalty(total: number): number {
  return payoutFor(total).fee
}

export function amountPaid(booking: OwnerBooking): number {
  return booking.balancePaid ? booking.total : booking.deposit
}

/** Penalised cancellations in the last 12 months; emergencies don't count. */
export function ownerCancellationsThisYear(bookings: OwnerBooking[]): number {
  const since = new Date(Date.now() - 365 * 86_400_000).toISOString()
  return bookings.filter(
    (booking) => booking.cancellation && booking.cancellation.penalty > 0 && booking.cancellation.atISO >= since,
  ).length
}

/**
 * Three bookings that let a brand-new owner see each state of the flow — a
 * host with a question, a date already held, and a finished event with money
 * to withdraw. They are labelled as samples everywhere and can be cleared.
 */
export function sampleBookings(venue: OwnerVenue): OwnerBooking[] {
  const now = Date.now()
  const capacity = Math.max(50, headlineCapacity(venue))
  const price = venue.pricePerDay || 500_000

  const nextSaturday = (fromDays: number): string => {
    let date = addDays(todayISO(), fromDays)
    while (new Date(`${date}T00:00:00`).getDay() !== 6) {
      date = addDays(date, 1)
    }
    return date
  }

  const quote = (date: string, guests: number) => {
    const premium = isWeekend(date) ? Math.round((price * venue.weekendPremium) / 100) : 0
    const total = price + premium
    return { total, deposit: Math.round((total * venue.depositPercent) / 100), guests }
  }

  const requestDate = nextSaturday(45)
  const upcomingDate = addDays(nextSaturday(18), -1)
  const pastDate = addDays(todayISO(), -9)

  const request = quote(requestDate, Math.round(capacity * 0.8))
  const upcoming = quote(upcomingDate, Math.round(capacity * 0.5))
  const past = quote(pastDate, Math.round(capacity * 0.6))

  return [
    {
      id: `sb-${makeId()}`,
      source: 'sample',
      venueId: venue.id,
      hostName: 'Adaeze Okafor',
      eventName: 'Adaeze & Tobi’s wedding reception',
      eventType: 'Wedding',
      date: requestDate,
      guests: request.guests,
      addOns: [],
      total: request.total,
      deposit: request.deposit,
      status: 'confirmed',
      createdISO: new Date(now - 5 * 3_600_000).toISOString(),
      balancePaid: false,
      messages: [
        {
          id: makeId(),
          from: 'host',
          text: 'Hello! We love the space. Could our decorator get in from 8am on the day? We would also need a small room for the bride to change.',
          atISO: new Date(now - 5 * 3_600_000).toISOString(),
        },
      ],
    },
    {
      id: `sb-${makeId()}`,
      source: 'sample',
      venueId: venue.id,
      hostName: 'Kunle Adebayo',
      eventName: 'Mum’s 60th birthday',
      eventType: 'Birthday',
      date: upcomingDate,
      guests: upcoming.guests,
      addOns: [],
      total: upcoming.total,
      deposit: upcoming.deposit,
      status: 'confirmed',
      createdISO: new Date(now - 6 * 86_400_000).toISOString(),
      balancePaid: false,
      messages: [],
    },
    {
      id: `sb-${makeId()}`,
      source: 'sample',
      venueId: venue.id,
      hostName: 'Zainab Bello',
      eventName: 'Bello family naming ceremony',
      eventType: 'Naming ceremony',
      date: pastDate,
      guests: past.guests,
      addOns: [],
      total: past.total,
      deposit: past.deposit,
      status: 'completed',
      createdISO: new Date(now - 40 * 86_400_000).toISOString(),
      balancePaid: true,
      messages: [],
    },
  ]
}

/* ── Money ───────────────────────────────────────────────── */

export type Payout = {
  id: string
  amount: number
  requestedISO: string
  status: 'processing' | 'paid'
  bankLabel: string
}

export type EarningsSummary = {
  /** Money held for events that have not happened yet. */
  escrow: number
  /** Released after the event and not yet withdrawn. */
  available: number
  paidOut: number
  /** Net earned from events in the current calendar month. */
  thisMonth: number
  /** Owner cancellation penalties, already taken off `available`. */
  penalties: number
}

export function earningsSummary(bookings: OwnerBooking[], payouts: Payout[]): EarningsSummary {
  const month = todayISO().slice(0, 7)
  let escrow = 0
  let released = 0
  let thisMonth = 0
  let penalties = 0

  for (const booking of bookings) {
    if (booking.status === 'confirmed') escrow += amountPaid(booking)
    penalties += booking.cancellation?.penalty ?? 0
    if (booking.status === 'completed') {
      const { net } = payoutFor(booking.total)
      released += net
      if (booking.date.slice(0, 7) === month) thisMonth += net
    }
  }

  const withdrawn = payouts.reduce((sum, payout) => sum + payout.amount, 0)
  const paidOut = payouts
    .filter((payout) => payout.status === 'paid')
    .reduce((sum, payout) => sum + payout.amount, 0)

  return { escrow, available: Math.max(0, released - withdrawn - penalties), paidOut, thisMonth, penalties }
}

export const NIGERIAN_BANKS = [
  'Access Bank',
  'Ecobank',
  'Fidelity Bank',
  'First Bank',
  'FCMB',
  'GTBank',
  'Kuda',
  'Moniepoint',
  'OPay',
  'Polaris Bank',
  'Stanbic IBTC',
  'Sterling Bank',
  'UBA',
  'Union Bank',
  'Wema Bank',
  'Zenith Bank',
]

export const ID_TYPES = ['NIN slip', 'International passport', 'Driver’s licence', 'Voter’s card']

/** "0123456789" → "•••• 6789", so a full account number never sits on screen. */
export function maskAccount(number: string): string {
  return `•••• ${number.slice(-4)}`
}

/* ── Promotion ───────────────────────────────────────────── */

export const FEATURE_PLANS = [
  { days: 7, price: 15_000, label: '1 week' },
  { days: 14, price: 25_000, label: '2 weeks' },
  { days: 30, price: 45_000, label: '30 days' },
]

/* ── Seating vocabulary ──────────────────────────────────── */

export const SEATING_LAYOUTS = ['Banquet', 'Theatre', 'Cocktail', 'Classroom']
