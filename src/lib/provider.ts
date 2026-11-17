import { addDays, makeId, todayISO } from './events'
import { CANCELLATION_POLICIES, initialsFor } from './owner'
import type { BlockedDate, CancellationPolicy, ListingStatus, OwnerBooking } from './owner'
import { PLANNING_SERVICE } from './signupFlow'
import { VENDOR_CATEGORIES } from './vendors'
import type { ServicePackage, Vendor } from './vendors'

/**
 * The service provider's side of the platform: caterers, decorators,
 * photographers, DJs, MCs, security, beauty and planners.
 *
 * It follows the venue owner's rules on purpose. Every provider books
 * instantly: they sell fixed-price packages, the host pays a deposit into
 * escrow, and chat opens only after that payment, with contact details
 * blocked. A quote-first flow would need messaging before money moves,
 * which the platform does not allow.
 *
 * One provider has one listing. A caterer who also rents chairs lists both
 * as packages under the same profile rather than running two shops.
 */

/* ── Listing ─────────────────────────────────────────────── */

export type ProviderListing = {
  id: string
  status: ListingStatus
  createdISO: string
  submittedISO?: string
  publishedISO?: string

  name: string
  /** Directory category slug from lib/vendors, e.g. 'catering'. */
  category: string
  tagline: string
  about: string
  state: string
  area: string
  /** Other states they will travel to. Their own state is always served. */
  travelStates: string[]
  /** Short tags hosts scan, e.g. "Small chops". */
  services: string[]
  packages: ServicePackage[]

  depositPercent: number
  cancellation: CancellationPolicy | ''
  /** How many events they can cover on one date. */
  perDay: number
  /** What the provider needs from the host or venue on the day. */
  needs: string

  blocked: BlockedDate[]
  hue: number
}

export function emptyListing(seed: Partial<ProviderListing> = {}): ProviderListing {
  const id = seed.id ?? `pv-${makeId()}`
  return {
    id,
    status: 'draft',
    createdISO: new Date().toISOString(),
    name: '',
    category: '',
    tagline: '',
    about: '',
    state: '',
    area: '',
    travelStates: [],
    services: [],
    packages: [],
    depositPercent: 30,
    cancellation: '',
    perDay: 1,
    needs: '',
    blocked: [],
    hue: hueFor(id),
    ...seed,
  }
}

function hueFor(id: string): number {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 360
  return hash
}

export function emptyPackage(seed: Partial<ServicePackage> = {}): ServicePackage {
  return {
    id: `pk-${makeId()}`,
    name: '',
    summary: '',
    price: 0,
    priceUnit: 'per event',
    includes: [],
    minGuests: 0,
    hours: 0,
    ...seed,
  }
}

/** Sign-up asks "what kind of service?" in words; the directory files by slug. */
const SIGNUP_TO_SLUG: Record<string, string> = {
  [PLANNING_SERVICE]: 'planners',
  'Catering & drinks': 'catering',
  'Decor & rentals': 'decor',
  'Photo & video': 'photo',
  'Music & entertainment': 'music',
  'Beauty & styling': 'beauty',
  'Staffing & security': 'security',
}

export function categoryFromSignup(service: string): string {
  return SIGNUP_TO_SLUG[service] ?? ''
}

export function categoryLabel(slug: string): string {
  return VENDOR_CATEGORIES.find((category) => category.slug === slug)?.label ?? 'Service'
}

/** Per-guest pricing is how caterers quote; everyone else prices the event. */
export function defaultUnit(category: string): ServicePackage['priceUnit'] {
  return category === 'catering' ? 'per guest' : 'per event'
}

/** Tag suggestions per category, so a new provider is not staring at a blank box. */
export const SERVICE_SUGGESTIONS: Record<string, string[]> = {
  catering: ['Buffet service', 'Small chops', 'Traditional soups', 'Grills', 'Serving staff', 'Bar service', 'Cakes'],
  decor: ['Stage design', 'Floral arches', 'Centrepieces', 'Draping', 'Lighting', 'Chairs & tables', 'Linen'],
  photo: ['Photography', 'Videography', 'Drone coverage', 'Same-day previews', 'Photo booth', 'Livestream'],
  music: ['DJ set', 'Live band', 'Sound system', 'Lighting rig', 'Sound engineer'],
  mc: ['Event hosting', 'Comedy', 'Bilingual MC', 'Protocol announcements', 'Hype man'],
  security: ['Door security', 'Ushers', 'VIP escort', 'Parking marshals', 'Guest list control'],
  beauty: ['Bridal makeup', 'Gele tying', 'Hair styling', 'Bridal party', 'Touch-ups on the day'],
  planners: ['Full planning', 'Day-of coordination', 'Vendor management', 'Budgeting', 'Run of show'],
}

/** Starting packages offered when a provider has none, priced per category. */
export function starterPackages(category: string): ServicePackage[] {
  const unit = defaultUnit(category)
  const perGuest = unit === 'per guest'
  return [
    emptyPackage({
      name: 'Essential',
      summary: 'For smaller or simpler events.',
      priceUnit: unit,
      minGuests: perGuest ? 50 : 0,
      hours: perGuest ? 0 : 5,
    }),
    emptyPackage({
      name: 'Classic',
      summary: 'What most hosts book.',
      priceUnit: unit,
      minGuests: perGuest ? 100 : 0,
      hours: perGuest ? 0 : 8,
    }),
  ]
}

/* ── Setup sections ──────────────────────────────────────── */

export type ProviderSection = 'profile' | 'packages' | 'policies'

export const PROVIDER_SECTIONS: { id: ProviderSection; label: string; hint: string }[] = [
  { id: 'profile', label: 'Profile', hint: 'Who you are and where you work' },
  { id: 'packages', label: 'Packages', hint: 'What hosts can book, at fixed prices' },
  { id: 'policies', label: 'Booking rules', hint: 'Deposit, cancellation and capacity' },
]

export const MIN_ABOUT = 60

/** A package counts once it has a name, a price and something in it. */
export function isPackageComplete(pkg: ServicePackage): boolean {
  return Boolean(pkg.name.trim()) && pkg.price > 0 && pkg.includes.length > 0
}

export function sectionGaps(listing: ProviderListing, section: ProviderSection): string[] {
  const gaps: string[] = []
  if (section === 'profile') {
    if (listing.name.trim().length < 2) gaps.push('Add your business name')
    if (!listing.category) gaps.push('Choose your category')
    if (listing.tagline.trim().length < 10) gaps.push('Write a one-line tagline')
    if (listing.about.trim().length < MIN_ABOUT) gaps.push(`Describe your work in at least ${MIN_ABOUT} characters`)
    if (!listing.state) gaps.push('Choose your state')
    if (!listing.area.trim()) gaps.push('Add your area or city')
    if (listing.services.length === 0) gaps.push('Add at least one service tag')
  }
  if (section === 'packages') {
    const complete = listing.packages.filter(isPackageComplete)
    if (complete.length === 0) gaps.push('Add at least one package with a price and what it includes')
    if (listing.packages.length > complete.length) gaps.push('Finish or remove incomplete packages')
  }
  if (section === 'policies') {
    if (!listing.cancellation) gaps.push('Choose a cancellation policy')
    if (listing.depositPercent < 10 || listing.depositPercent > 100) gaps.push('Set a deposit between 10% and 100%')
  }
  return gaps
}

export function listingProgress(listing: ProviderListing): { done: number; total: number; next: ProviderSection } {
  const open = PROVIDER_SECTIONS.filter((section) => sectionGaps(listing, section.id).length > 0)
  return {
    done: PROVIDER_SECTIONS.length - open.length,
    total: PROVIDER_SECTIONS.length,
    next: open[0]?.id ?? 'policies',
  }
}

export function isReadyToSubmit(listing: ProviderListing): boolean {
  return PROVIDER_SECTIONS.every((section) => sectionGaps(listing, section.id).length === 0)
}

/** The lowest price a host sees on cards ("from ₦…"). */
export function fromPrice(listing: ProviderListing): { price: number; unit: ServicePackage['priceUnit'] } {
  const complete = listing.packages.filter(isPackageComplete)
  if (complete.length === 0) return { price: 0, unit: defaultUnit(listing.category) }
  const cheapest = complete.reduce((low, pkg) => (pkg.price < low.price ? pkg : low))
  return { price: cheapest.price, unit: cheapest.priceUnit }
}

/** Turns the provider's listing into the directory shape hosts already browse. */
export function toDirectoryVendor(listing: ProviderListing, fullDates: string[]): Vendor {
  const from = fromPrice(listing)
  return {
    id: listing.id,
    name: listing.name,
    category: listing.category,
    tagline: listing.tagline,
    area: listing.area,
    state: listing.state,
    priceFrom: from.price,
    priceUnit: from.unit,
    // New listings have no reviews yet; the page says so rather than inventing them.
    rating: 0,
    reviews: 0,
    services: listing.services,
    initials: initialsFor(listing.name),
    hue: listing.hue,
    packages: listing.packages.filter(isPackageComplete),
    depositPercent: listing.depositPercent,
    cancellation: listing.cancellation ? CANCELLATION_POLICIES[listing.cancellation].text : undefined,
    unavailable: [...listing.blocked.map((entry) => entry.date), ...fullDates],
    hidden: listing.status === 'paused',
    listed: true,
  }
}

/* ── Bookings ────────────────────────────────────────────── */

/**
 * The provider's view of a booking. It reuses the owner booking shape —
 * same statuses, money fields and chat — so escrow, payouts, chat access and
 * cancellation penalties follow one set of rules across the platform.
 * `venueId` holds the provider's listing id.
 */
export type ProviderBooking = OwnerBooking & {
  packageId: string
  packageName: string
}

/** The id both sides use for a hire's conversation. */
export function hireChatId(eventId: string, hireId: string): string {
  return `hh-${eventId}-${hireId}`
}

export const PROVIDER_CANCEL_REASONS = [
  'I’m double-booked on that date',
  'Illness or injury',
  'Equipment or supplier problem',
  'An emergency',
  'Something else',
]

export const PROVIDER_EMERGENCY = 'An emergency'

/**
 * Three bookings that show a new provider every state: a host with a
 * question, an upcoming event, and a finished one with money to withdraw.
 */
export function sampleProviderBookings(listing: ProviderListing): ProviderBooking[] {
  const now = Date.now()
  const packages = listing.packages.filter(isPackageComplete)
  const first = packages[0]
  const second = packages[1] ?? first
  if (!first) return []

  const saturday = (fromDays: number): string => {
    let date = addDays(todayISO(), fromDays)
    while (new Date(`${date}T00:00:00`).getDay() !== 6) date = addDays(date, 1)
    return date
  }

  const priced = (pkg: ServicePackage, guests: number) => {
    const total = pkg.priceUnit === 'per guest' ? Math.max(guests, pkg.minGuests) * pkg.price : pkg.price
    return { total, deposit: Math.round((total * listing.depositPercent) / 100) }
  }

  const base = (pkg: ServicePackage, guests: number) => ({
    source: 'sample' as const,
    venueId: listing.id,
    packageId: pkg.id,
    packageName: pkg.name,
    guests,
    addOns: [],
    ...priced(pkg, guests),
  })

  return [
    {
      ...base(second, 250),
      id: `sp-${makeId()}`,
      hostName: 'Adaeze Okafor',
      eventName: 'Adaeze & Tobi’s wedding reception',
      eventType: 'Wedding',
      date: saturday(40),
      status: 'confirmed',
      createdISO: new Date(now - 4 * 3_600_000).toISOString(),
      balancePaid: false,
      messages: [
        {
          id: makeId(),
          from: 'host',
          text: 'Hello! So glad we booked you. What time would your team like to arrive, and is there anything you need from the venue?',
          atISO: new Date(now - 4 * 3_600_000).toISOString(),
        },
      ],
    },
    {
      ...base(first, 120),
      id: `sp-${makeId()}`,
      hostName: 'Kunle Adebayo',
      eventName: 'Mum’s 60th birthday',
      eventType: 'Birthday',
      date: addDays(saturday(16), -1),
      status: 'confirmed',
      createdISO: new Date(now - 6 * 86_400_000).toISOString(),
      balancePaid: false,
      messages: [],
    },
    {
      ...base(first, 150),
      id: `sp-${makeId()}`,
      hostName: 'Zainab Bello',
      eventName: 'Bello family naming ceremony',
      eventType: 'Naming ceremony',
      date: addDays(todayISO(), -8),
      status: 'completed',
      createdISO: new Date(now - 35 * 86_400_000).toISOString(),
      balancePaid: true,
      messages: [],
    },
  ]
}
