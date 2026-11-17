/**
 * The service-provider directory: everything an event hires that is not the
 * hall itself.
 *
 * Stand-in data shaped like the listing endpoint will be, same as venues.ts —
 * swapping the constant for a fetch touches the discovery screens and nothing
 * else. Prices are "from" figures in whole naira.
 */

export type VendorCategory = {
  slug: string
  label: string
  /** Decorative tile mark; real category art comes with the design pass. */
  emoji: string
  blurb: string
}

export const VENDOR_CATEGORIES: VendorCategory[] = [
  { slug: 'catering', label: 'Catering & drinks', emoji: '🍲', blurb: 'Caterers, small chops, bartenders' },
  { slug: 'decor', label: 'Decor & rentals', emoji: '🎀', blurb: 'Decorators, florists, chairs and linen' },
  { slug: 'photo', label: 'Photo & video', emoji: '📸', blurb: 'Photographers, videographers, drones' },
  { slug: 'music', label: 'Music & DJs', emoji: '🎧', blurb: 'DJs, live bands, sound engineers' },
  { slug: 'mc', label: 'MCs & hosts', emoji: '🎤', blurb: 'MCs, comedians, hype men' },
  { slug: 'security', label: 'Security & ushers', emoji: '🛡️', blurb: 'Bouncers, guards, protocol, ushers' },
  { slug: 'beauty', label: 'Makeup & styling', emoji: '💄', blurb: 'Makeup artists, gele, hair stylists' },
  { slug: 'planners', label: 'Planners', emoji: '📋', blurb: 'Full-service event planners' },
]

/**
 * One fixed-price thing a provider sells. Every vendor books instantly, the
 * same as venues: the host picks a package, pays the deposit, and only then
 * can the two sides message. A quote-first flow would need chat before
 * payment, which the platform does not allow.
 */
export type ServicePackage = {
  id: string
  name: string
  summary: string
  /** Whole naira, read with `priceUnit`. */
  price: number
  priceUnit: 'per event' | 'per guest'
  includes: string[]
  /** Per-guest packages only: the smallest head count it is sold for. */
  minGuests: number
  /** Hours of cover on the day. 0 = not time-bound (a delivery, a cake). */
  hours: number
}

export type Vendor = {
  id: string
  name: string
  category: string
  tagline: string
  area: string
  state: string
  /** "From" price in naira, read with `priceUnit`. */
  priceFrom: number
  priceUnit: 'per guest' | 'per event' | 'per day'
  rating: number
  reviews: number
  services: string[]
  /** Paid placement — surfaces on the Explore landing before any search. */
  promoted?: boolean
  initials: string
  hue: number
  /** Set for listings created by providers on the platform. */
  packages?: ServicePackage[]
  depositPercent?: number
  cancellation?: string
  /** Dates the provider has closed or is fully booked. */
  unavailable?: string[]
  /** Paused by the provider: reachable by link, absent from browsing. */
  hidden?: boolean
  /** True for a real provider listing rather than seeded directory data. */
  listed?: boolean
}

export const VENDORS: Vendor[] = [
  {
    id: 'iya-oyo-kitchen',
    name: "Iya Oyo's Kitchen",
    category: 'catering',
    tagline: 'Party jollof that ends arguments, plus full buffet service.',
    area: 'Surulere',
    state: 'Lagos',
    priceFrom: 6_500,
    priceUnit: 'per guest',
    rating: 4.8,
    reviews: 214,
    services: ['Buffet service', 'Small chops', 'Traditional soups', 'Serving staff'],
    promoted: true,
    initials: 'IO',
    hue: 22,
  },
  {
    id: 'chop-life-events',
    name: 'Chop Life Events Catering',
    category: 'catering',
    tagline: 'Corporate and society menus with dietary options handled.',
    area: 'Victoria Island',
    state: 'Lagos',
    priceFrom: 12_000,
    priceUnit: 'per guest',
    rating: 4.6,
    reviews: 98,
    services: ['Plated dinners', 'Cocktail canapés', 'Vegetarian menus', 'Bar service'],
    initials: 'CL',
    hue: 350,
  },
  {
    id: 'abuja-grills',
    name: 'Abuja Grills & Continental',
    category: 'catering',
    tagline: 'Grills, continental and northern dishes for large crowds.',
    area: 'Wuse 2',
    state: 'Abuja (FCT)',
    priceFrom: 8_000,
    priceUnit: 'per guest',
    rating: 4.5,
    reviews: 76,
    services: ['Grill stations', 'Buffet service', 'Masa & northern dishes'],
    initials: 'AG',
    hue: 10,
  },
  {
    id: 'bloom-and-gold',
    name: 'Bloom & Gold Decor',
    category: 'decor',
    tagline: 'Stage, floral and full-hall transformations.',
    area: 'Lekki Phase 1',
    state: 'Lagos',
    priceFrom: 450_000,
    priceUnit: 'per event',
    rating: 4.7,
    reviews: 121,
    services: ['Stage design', 'Floral arches', 'Centrepieces', 'Draping & lighting'],
    promoted: true,
    initials: 'BG',
    hue: 42,
  },
  {
    id: 'rent-all-ng',
    name: 'RentAll NG',
    category: 'decor',
    tagline: 'Chairs, tables, linen and glassware delivered and collected.',
    area: 'Ikeja',
    state: 'Lagos',
    priceFrom: 120_000,
    priceUnit: 'per event',
    rating: 4.3,
    reviews: 187,
    services: ['Chiavari chairs', 'Banquet tables', 'Linen', 'Glassware', 'Canopies'],
    initials: 'RA',
    hue: 200,
  },
  {
    id: 'lens-and-light',
    name: 'Lens & Light Studios',
    category: 'photo',
    tagline: 'Weddings shot like editorials, previews in 48 hours.',
    area: 'Yaba',
    state: 'Lagos',
    priceFrom: 350_000,
    priceUnit: 'per event',
    rating: 4.9,
    reviews: 143,
    services: ['Photography', 'Cinematic video', 'Same-day previews', 'Drone coverage'],
    promoted: true,
    initials: 'LL',
    hue: 262,
  },
  {
    id: 'capital-frames',
    name: 'Capital Frames',
    category: 'photo',
    tagline: 'Corporate coverage and conference livestreams in Abuja.',
    area: 'Maitama',
    state: 'Abuja (FCT)',
    priceFrom: 280_000,
    priceUnit: 'per day',
    rating: 4.4,
    reviews: 52,
    services: ['Event photography', 'Livestreaming', 'Headshot booth'],
    initials: 'CF',
    hue: 210,
  },
  {
    id: 'dj-spinall-jr',
    name: 'DJ Ekwe',
    category: 'music',
    tagline: 'Owambe sets that keep three generations dancing.',
    area: 'Ikeja',
    state: 'Lagos',
    priceFrom: 200_000,
    priceUnit: 'per event',
    rating: 4.8,
    reviews: 167,
    services: ['DJ set', 'Sound system', 'MC handover mixes', 'Lighting rig'],
    promoted: true,
    initials: 'DE',
    hue: 280,
  },
  {
    id: 'highlife-collective',
    name: 'Highlife Collective',
    category: 'music',
    tagline: 'Nine-piece live band — highlife, juju and afrobeats.',
    area: 'Port Harcourt',
    state: 'Rivers',
    priceFrom: 650_000,
    priceUnit: 'per event',
    rating: 4.7,
    reviews: 43,
    services: ['Live band', 'First-dance arrangements', 'Sound engineer'],
    initials: 'HC',
    hue: 150,
  },
  {
    id: 'mc-gbenga',
    name: 'MC Gbenga Live',
    category: 'mc',
    tagline: 'Bilingual MC — English and Yoruba — with clean comedy.',
    area: 'Ibadan',
    state: 'Oyo',
    priceFrom: 150_000,
    priceUnit: 'per event',
    rating: 4.6,
    reviews: 88,
    services: ['Event hosting', 'Comedy sets', 'Protocol announcements'],
    initials: 'MG',
    hue: 32,
  },
  {
    id: 'amaka-hosts',
    name: 'Amaka Hosts',
    category: 'mc',
    tagline: 'Corporate galas and award nights, run to the minute.',
    area: 'Victoria Island',
    state: 'Lagos',
    priceFrom: 250_000,
    priceUnit: 'per event',
    rating: 4.8,
    reviews: 61,
    services: ['Corporate hosting', 'Award ceremonies', 'Panel moderation'],
    initials: 'AH',
    hue: 330,
  },
  {
    id: 'shield-protocol',
    name: 'Shield Protocol Services',
    category: 'security',
    tagline: 'Licensed guards, access control and VIP protection.',
    area: 'Lekki Phase 1',
    state: 'Lagos',
    priceFrom: 180_000,
    priceUnit: 'per event',
    rating: 4.5,
    reviews: 94,
    services: ['Door security', 'Guest list control', 'VIP escort', 'Parking marshals'],
    initials: 'SP',
    hue: 220,
  },
  {
    id: 'grace-ushers',
    name: 'Grace Ushering Agency',
    category: 'security',
    tagline: 'Trained ushers and protocol officers in matching attire.',
    area: 'Garki',
    state: 'Abuja (FCT)',
    priceFrom: 90_000,
    priceUnit: 'per event',
    rating: 4.4,
    reviews: 71,
    services: ['Ushering', 'Protocol', 'QR check-in support'],
    initials: 'GU',
    hue: 130,
  },
  {
    id: 'tara-beauty',
    name: 'Tara Beauty Studio',
    category: 'beauty',
    tagline: 'Bridal makeup with a trial included, gele that stays up.',
    area: 'Lekki Phase 1',
    state: 'Lagos',
    priceFrom: 120_000,
    priceUnit: 'per event',
    rating: 4.9,
    reviews: 132,
    services: ['Bridal makeup', 'Gele tying', 'Bridal party packages', 'Hair styling'],
    promoted: true,
    initials: 'TB',
    hue: 315,
  },
  {
    id: 'ph-glam',
    name: 'PH Glam Squad',
    category: 'beauty',
    tagline: 'On-location makeup team for bridal parties of any size.',
    area: 'Old GRA',
    state: 'Rivers',
    priceFrom: 80_000,
    priceUnit: 'per event',
    rating: 4.5,
    reviews: 47,
    services: ['Makeup', 'Hair', 'Touch-up service through the event'],
    initials: 'PG',
    hue: 300,
  },
  {
    id: 'zenith-planners',
    name: 'Zenith Event Planners',
    category: 'planners',
    tagline: 'Full planning and vendor coordination for society weddings.',
    area: 'Ikoyi',
    state: 'Lagos',
    priceFrom: 1_500_000,
    priceUnit: 'per event',
    rating: 4.8,
    reviews: 57,
    services: ['Full planning', 'Vendor coordination', 'Run of show', 'On-day management'],
    initials: 'ZP',
    hue: 250,
  },
  {
    id: 'abuja-corporate-events',
    name: 'ACE Planners',
    category: 'planners',
    tagline: 'Conferences, retreats and government functions in Abuja.',
    area: 'Central Area',
    state: 'Abuja (FCT)',
    priceFrom: 900_000,
    priceUnit: 'per event',
    rating: 4.6,
    reviews: 39,
    services: ['Corporate planning', 'AV coordination', 'Delegate management'],
    initials: 'AC',
    hue: 190,
  },
]

let listedVendors: Vendor[] = []

/** Written by the provider store whenever a listing goes live or changes. */
export function setListedVendors(vendors: Vendor[]): void {
  listedVendors = vendors
}

/** The browsable directory: live provider listings first, then seeded ones. */
export function allVendors(): Vendor[] {
  return [...listedVendors.filter((vendor) => !vendor.hidden), ...VENDORS]
}

export function findVendor(id: string): Vendor | undefined {
  return listedVendors.find((vendor) => vendor.id === id) ?? VENDORS.find((vendor) => vendor.id === id)
}

/** Seeded vendors have no deposit setting of their own; this is the default. */
export const DEFAULT_VENDOR_DEPOSIT = 30

const SEED_CANCELLATION =
  'Full refund up to 30 days before. 50% up to 14 days. No refund inside 14 days.'

export function vendorDeposit(vendor: Vendor): number {
  return vendor.depositPercent ?? DEFAULT_VENDOR_DEPOSIT
}

export function vendorCancellation(vendor: Vendor): string {
  return vendor.cancellation ?? SEED_CANCELLATION
}

/**
 * What a host can book. Real listings carry their own packages; seeded
 * directory vendors get three tiers built from their "from" price so the
 * whole booking flow can be tried against any of them.
 */
export function packagesFor(vendor: Vendor): ServicePackage[] {
  if (vendor.packages) return vendor.packages
  const perGuest = vendor.priceUnit === 'per guest'
  const unit = perGuest ? 'per guest' : 'per event'
  const round = (value: number) => Math.round(value / (perGuest ? 500 : 10_000)) * (perGuest ? 500 : 10_000)
  const services = vendor.services
  return [
    {
      id: `${vendor.id}-essential`,
      name: 'Essential',
      summary: `${services[0]} for a smaller or simpler event.`,
      price: vendor.priceFrom,
      priceUnit: unit,
      includes: services.slice(0, 2),
      minGuests: perGuest ? 50 : 0,
      hours: perGuest ? 0 : 5,
    },
    {
      id: `${vendor.id}-classic`,
      name: 'Classic',
      summary: 'What most hosts book.',
      price: round(vendor.priceFrom * 1.6),
      priceUnit: unit,
      includes: services.slice(0, 3),
      minGuests: perGuest ? 100 : 0,
      hours: perGuest ? 0 : 8,
    },
    {
      id: `${vendor.id}-premium`,
      name: 'Premium',
      summary: 'Everything they offer, start to finish.',
      price: round(vendor.priceFrom * 2.5),
      priceUnit: unit,
      includes: services,
      minGuests: perGuest ? 150 : 0,
      hours: perGuest ? 0 : 12,
    },
  ]
}

export type PackageQuote = { total: number; deposit: number; balance: number }

/** Per-guest packages never bill below their minimum head count. */
export function quotePackage(pkg: ServicePackage, guests: number, depositPercent: number): PackageQuote {
  const billed = pkg.priceUnit === 'per guest' ? Math.max(guests, pkg.minGuests) * pkg.price : pkg.price
  const deposit = Math.round((billed * depositPercent) / 100)
  return { total: billed, deposit, balance: billed - deposit }
}

export function findCategory(slug: string): VendorCategory | undefined {
  return VENDOR_CATEGORIES.find((category) => category.slug === slug)
}

export function vendorsIn(categorySlug: string): Vendor[] {
  return allVendors().filter((vendor) => vendor.category === categorySlug)
}

/** Everything with paid placement, for the rail shown before any search. */
export function promotedVendors(): Vendor[] {
  return allVendors().filter((vendor) => vendor.promoted)
}
