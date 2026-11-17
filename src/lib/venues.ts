/** What the owner writes once, for every host who books. */
export type EventDayGuide = {
  arrival: string
  parking: string
  setup: string
  power: string
}

export type VenueAfterBooking = {
  address: string
  directions: string
  guide: EventDayGuide
  phone: string
}

/**
 * The event-centre directory.
 *
 * Stand-in data until venue owners have onboarded, but shaped like the listing
 * endpoint would be — so swapping the constant for a fetch touches the two
 * screens that read it and nothing else. Prices are per day in whole naira.
 */

export type SeatingConfig = {
  /** Banquet, theatre, cocktail, classroom. */
  name: string
  capacity: number
}

export type VenueSpace = {
  name: string
  capacity: number
}

export type VenueReview = {
  author: string
  rating: number
  /** Month and year is enough; exact dates invite guesswork. */
  when: string
  text: string
}

export type VenuePolicies = {
  cancellation: string
  curfew: string
  alcohol: string
  outsideVendors: string
}

export type Venue = {
  id: string
  name: string
  tagline: string
  area: string
  state: string
  spaceType: string
  /** Headline seated capacity — the number that decides whether a hall fits. */
  capacity: number
  seating: SeatingConfig[]
  spaces: VenueSpace[]
  pricePerDay: number
  /** Percentage added on Saturdays and Sundays. */
  weekendPremium: number
  /** Percentage of the total taken to hold the date. */
  depositPercent: number
  rating: number
  reviews: VenueReview[]
  amenities: string[]
  /** Services the venue sells itself, chosen as add-ons at checkout. */
  inHouse: { name: string; price: number; perGuest?: boolean }[]
  policies: VenuePolicies
  faq: { question: string; answer: string }[]
  initials: string
  /** Hue for the placeholder tile, so the grid is not one flat purple. */
  hue: number
  /*
   * The fields below only exist on listings created by venue owners on the
   * platform. The seeded directory leaves them out.
   */
  description?: string
  /** Photo URLs, cover first. */
  photos?: string[]
  /** ISO dates that are blocked or already booked. */
  unavailable?: string[]
  /** Percentage off the base hire on Monday–Friday dates. */
  weekdayOffer?: number
  /** Paid placement is running. */
  featured?: boolean
  /**
   * Only for hosts with a paid booking. A real API must not send this with the
   * public listing; it is on the record here because this build has no server.
   */
  afterBooking?: VenueAfterBooking
  /** Listed recently enough to have no reviews yet. */
  isNew?: boolean
  /**
   * Paused by the owner: out of search and closed to new bookings, but still
   * resolvable so hosts who already booked it see its name.
   */
  hidden?: boolean
}

/** The filterable amenity vocabulary. Venues use these exact strings. */
export const AMENITIES = [
  'Parking',
  'Backup power',
  'Air conditioning',
  'Wi-Fi',
  'Sound system',
  'Projector & screen',
  'Stage',
  'Dance floor',
  'Bridal suite',
  'Kitchen',
  'Bar area',
  'Disability access',
  'Security',
  'CCTV',
  'Outdoor space',
]

const STANDARD_FAQ = [
  {
    question: 'What time can we start setting up?',
    answer:
      'Set-up access opens four hours before your start time. Earlier access can be arranged for an extra fee.',
  },
  {
    question: 'Is the deposit refundable?',
    answer:
      'The deposit is refundable in line with the cancellation policy below. Inside 14 days it is retained.',
  },
]

export const VENUES: Venue[] = [
  {
    id: 'eko-atlantic-hall',
    name: 'Eko Atlantic Grand Hall',
    tagline: 'Oceanfront ballroom built for large society weddings.',
    area: 'Victoria Island',
    state: 'Lagos',
    spaceType: 'Event center',
    capacity: 800,
    seating: [
      { name: 'Banquet', capacity: 800 },
      { name: 'Theatre', capacity: 1100 },
      { name: 'Cocktail', capacity: 1300 },
      { name: 'Classroom', capacity: 450 },
    ],
    spaces: [
      { name: 'Grand Hall', capacity: 800 },
      { name: 'Ocean Room', capacity: 180 },
      { name: 'Bridal suite', capacity: 12 },
    ],
    pricePerDay: 3_500_000,
    weekendPremium: 20,
    depositPercent: 40,
    rating: 4.8,
    reviews: [
      {
        author: 'Adaeze N.',
        rating: 5,
        when: 'January 2026',
        text: 'We had 720 guests and it never felt tight. The staff ran the room better than our own planner.',
      },
      {
        author: 'Segun O.',
        rating: 5,
        when: 'November 2025',
        text: 'Power never blinked all night. Parking was well managed. Expensive, but you can see where it goes.',
      },
      {
        author: 'Chika E.',
        rating: 4,
        when: 'October 2025',
        text: 'Beautiful hall. Only complaint is they are strict about outside caterers.',
      },
    ],
    amenities: [
      'Parking',
      'Backup power',
      'Air conditioning',
      'Wi-Fi',
      'Sound system',
      'Stage',
      'Dance floor',
      'Bridal suite',
      'Kitchen',
      'Bar area',
      'Disability access',
      'Security',
      'CCTV',
    ],
    inHouse: [
      { name: 'In-house catering', price: 18_000 },
      { name: 'Decor package', price: 850_000 },
      { name: 'Valet parking', price: 300_000 },
    ],
    policies: {
      cancellation: 'Full refund up to 60 days before. 50% up to 30 days. No refund inside 14 days.',
      curfew: 'Music off at 1:00am, hall cleared by 2:00am.',
      alcohol: 'Permitted. Corkage applies to drinks not bought through the venue.',
      outsideVendors: 'Outside caterers require prior approval and a kitchen fee.',
    },
    faq: STANDARD_FAQ,
    initials: 'EA',
    hue: 262,
  },
  {
    id: 'harbour-point',
    name: 'Harbour Point',
    tagline: 'Waterfront hall with a marquee lawn attached.',
    area: 'Victoria Island',
    state: 'Lagos',
    spaceType: 'Event center',
    capacity: 500,
    seating: [
      { name: 'Banquet', capacity: 500 },
      { name: 'Theatre', capacity: 700 },
      { name: 'Cocktail', capacity: 850 },
    ],
    spaces: [
      { name: 'Main hall', capacity: 500 },
      { name: 'Garden lawn', capacity: 250 },
    ],
    pricePerDay: 2_200_000,
    weekendPremium: 15,
    depositPercent: 35,
    rating: 4.6,
    reviews: [
      {
        author: 'Tolu A.',
        rating: 5,
        when: 'February 2026',
        text: 'The water view at sunset made our photos. Guests kept asking how we found it.',
      },
      {
        author: 'Ibrahim K.',
        rating: 4,
        when: 'December 2025',
        text: 'Great space, though traffic on the island meant half our guests arrived late.',
      },
    ],
    amenities: [
      'Parking',
      'Backup power',
      'Air conditioning',
      'Wi-Fi',
      'Sound system',
      'Dance floor',
      'Bridal suite',
      'Bar area',
      'Security',
      'Outdoor space',
    ],
    inHouse: [
      { name: 'In-house catering', price: 15_000 },
      { name: 'Marquee hire', price: 450_000 },
    ],
    policies: {
      cancellation: 'Full refund up to 45 days before. 50% up to 21 days. No refund inside 10 days.',
      curfew: 'Outdoor music off at 11:00pm, indoors until 1:00am.',
      alcohol: 'Permitted, no corkage.',
      outsideVendors: 'Any licensed vendor welcome.',
    },
    faq: STANDARD_FAQ,
    initials: 'HP',
    hue: 208,
  },
  {
    id: 'ikeja-civic',
    name: 'Ikeja Civic Centre',
    tagline: 'Straightforward mainland hall that does the job well.',
    area: 'Ikeja GRA',
    state: 'Lagos',
    spaceType: 'Hall',
    capacity: 350,
    seating: [
      { name: 'Banquet', capacity: 350 },
      { name: 'Theatre', capacity: 500 },
      { name: 'Classroom', capacity: 200 },
    ],
    spaces: [{ name: 'Main hall', capacity: 350 }],
    pricePerDay: 850_000,
    weekendPremium: 25,
    depositPercent: 30,
    rating: 4.3,
    reviews: [
      {
        author: 'Ngozi U.',
        rating: 4,
        when: 'March 2026',
        text: 'Good value for the mainland. Sound system is basic — we hired our own.',
      },
      {
        author: 'Femi B.',
        rating: 5,
        when: 'January 2026',
        text: 'Manager answered every call. Generator kicked in within seconds when NEPA went.',
      },
    ],
    amenities: [
      'Parking',
      'Backup power',
      'Air conditioning',
      'Sound system',
      'Stage',
      'Kitchen',
      'Security',
    ],
    inHouse: [{ name: 'Chair and table hire', price: 180_000 }],
    policies: {
      cancellation: 'Full refund up to 30 days before. 50% up to 14 days. No refund inside 7 days.',
      curfew: 'Hall cleared by midnight.',
      alcohol: 'Permitted.',
      outsideVendors: 'All outside vendors welcome.',
    },
    faq: STANDARD_FAQ,
    initials: 'IC',
    hue: 292,
  },
  {
    id: 'lekki-gardens',
    name: 'The Lekki Gardens',
    tagline: 'Open-air garden for intimate outdoor receptions.',
    area: 'Lekki Phase 1',
    state: 'Lagos',
    spaceType: 'Garden',
    capacity: 250,
    seating: [
      { name: 'Banquet', capacity: 250 },
      { name: 'Cocktail', capacity: 400 },
    ],
    spaces: [
      { name: 'Main lawn', capacity: 250 },
      { name: 'Covered terrace', capacity: 80 },
    ],
    pricePerDay: 650_000,
    weekendPremium: 20,
    depositPercent: 30,
    rating: 4.7,
    reviews: [
      {
        author: 'Bisi F.',
        rating: 5,
        when: 'February 2026',
        text: 'Gorgeous at golden hour. They have a rain plan, which we ended up needing.',
      },
    ],
    amenities: [
      'Parking',
      'Backup power',
      'Outdoor space',
      'Bar area',
      'Security',
      'Disability access',
    ],
    inHouse: [
      { name: 'Marquee and rain cover', price: 380_000 },
      { name: 'Garden lighting', price: 220_000 },
    ],
    policies: {
      cancellation: 'Full refund up to 30 days before. 50% up to 14 days.',
      curfew: 'Music off at 10:30pm — residential neighbours.',
      alcohol: 'Permitted.',
      outsideVendors: 'All welcome. Caterers must bring their own prep tent.',
    },
    faq: STANDARD_FAQ,
    initials: 'LG',
    hue: 152,
  },
  {
    id: 'yaba-loft',
    name: 'Yaba Loft & Rooftop',
    tagline: 'Skyline rooftop for launches and small parties.',
    area: 'Yaba',
    state: 'Lagos',
    spaceType: 'Roof top',
    capacity: 120,
    seating: [
      { name: 'Banquet', capacity: 120 },
      { name: 'Cocktail', capacity: 200 },
      { name: 'Theatre', capacity: 150 },
    ],
    spaces: [
      { name: 'Rooftop deck', capacity: 120 },
      { name: 'Indoor loft', capacity: 70 },
    ],
    pricePerDay: 400_000,
    weekendPremium: 30,
    depositPercent: 25,
    rating: 4.4,
    reviews: [
      {
        author: 'Kelechi M.',
        rating: 4,
        when: 'January 2026',
        text: 'Perfect for our product launch. Lift is small, so loading in took a while.',
      },
    ],
    amenities: [
      'Backup power',
      'Wi-Fi',
      'Sound system',
      'Projector & screen',
      'Bar area',
      'Outdoor space',
      'Air conditioning',
    ],
    inHouse: [{ name: 'Bar package', price: 260_000 }],
    policies: {
      cancellation: 'Full refund up to 21 days before. 50% up to 7 days.',
      curfew: 'Rooftop closes at midnight.',
      alcohol: 'Venue bar only — no outside drinks.',
      outsideVendors: 'Catering must be approved; no open flames on the deck.',
    },
    faq: STANDARD_FAQ,
    initials: 'YL',
    hue: 20,
  },
  {
    id: 'transcorp-ballroom',
    name: 'Transcorp Ballroom',
    tagline: 'Hotel ballroom with rooms upstairs for travelling guests.',
    area: 'Maitama',
    state: 'Abuja (FCT)',
    spaceType: 'Hotel space',
    capacity: 600,
    seating: [
      { name: 'Banquet', capacity: 600 },
      { name: 'Theatre', capacity: 900 },
      { name: 'Classroom', capacity: 380 },
      { name: 'Cocktail', capacity: 1000 },
    ],
    spaces: [
      { name: 'Grand ballroom', capacity: 600 },
      { name: 'Breakout room A', capacity: 90 },
      { name: 'Breakout room B', capacity: 90 },
    ],
    pricePerDay: 2_800_000,
    weekendPremium: 10,
    depositPercent: 40,
    rating: 4.9,
    reviews: [
      {
        author: 'Fatima S.',
        rating: 5,
        when: 'March 2026',
        text: 'Ran a two-day retreat for 80. AV worked flawlessly both days and guests slept upstairs.',
      },
      {
        author: 'Emeka D.',
        rating: 5,
        when: 'December 2025',
        text: 'The most professional venue team I have worked with in Abuja.',
      },
    ],
    amenities: [
      'Parking',
      'Backup power',
      'Air conditioning',
      'Wi-Fi',
      'Sound system',
      'Projector & screen',
      'Stage',
      'Dance floor',
      'Kitchen',
      'Bar area',
      'Disability access',
      'Security',
      'CCTV',
    ],
    inHouse: [
      { name: 'In-house catering', price: 22_000 },
      { name: 'AV and technical crew', price: 700_000 },
      { name: 'Guest room block (10 rooms)', price: 1_200_000 },
    ],
    policies: {
      cancellation: 'Full refund up to 60 days before. 50% up to 30 days. No refund inside 14 days.',
      curfew: 'Ballroom until 2:00am.',
      alcohol: 'Hotel licence only.',
      outsideVendors: 'Catering is in-house only. Other vendors welcome.',
    },
    faq: STANDARD_FAQ,
    initials: 'TB',
    hue: 240,
  },
  {
    id: 'wuse-pavilion',
    name: 'Wuse Pavilion',
    tagline: 'Central Abuja hall with generous parking.',
    area: 'Wuse 2',
    state: 'Abuja (FCT)',
    spaceType: 'Hall',
    capacity: 300,
    seating: [
      { name: 'Banquet', capacity: 300 },
      { name: 'Theatre', capacity: 420 },
    ],
    spaces: [{ name: 'Pavilion hall', capacity: 300 }],
    pricePerDay: 750_000,
    weekendPremium: 20,
    depositPercent: 30,
    rating: 4.2,
    reviews: [
      {
        author: 'Hauwa I.',
        rating: 4,
        when: 'February 2026',
        text: 'Easy to find, plenty of parking. Decor is plain so budget for dressing it up.',
      },
    ],
    amenities: [
      'Parking',
      'Backup power',
      'Air conditioning',
      'Sound system',
      'Security',
      'Kitchen',
    ],
    inHouse: [{ name: 'Basic decor', price: 240_000 }],
    policies: {
      cancellation: 'Full refund up to 30 days before. 50% up to 14 days.',
      curfew: 'Hall cleared by 1:00am.',
      alcohol: 'Permitted.',
      outsideVendors: 'All welcome.',
    },
    faq: STANDARD_FAQ,
    initials: 'WP',
    hue: 320,
  },
  {
    id: 'jabi-lakeside',
    name: 'Jabi Lakeside Lawn',
    tagline: 'Large open ground by the water for big-crowd events.',
    area: 'Jabi',
    state: 'Abuja (FCT)',
    spaceType: 'Field (open space)',
    capacity: 1000,
    seating: [
      { name: 'Banquet', capacity: 1000 },
      { name: 'Cocktail', capacity: 1800 },
      { name: 'Theatre', capacity: 1500 },
    ],
    spaces: [{ name: 'Lakeside lawn', capacity: 1000 }],
    pricePerDay: 1_100_000,
    weekendPremium: 15,
    depositPercent: 35,
    rating: 4.5,
    reviews: [
      {
        author: 'Yusuf A.',
        rating: 5,
        when: 'January 2026',
        text: 'We ran a concert for 900. Load-in was easy and the lake backdrop looked great on camera.',
      },
    ],
    amenities: ['Parking', 'Backup power', 'Outdoor space', 'Security', 'Stage'],
    inHouse: [
      { name: 'Stage and rigging', price: 900_000 },
      { name: 'Generator hire', price: 350_000 },
    ],
    policies: {
      cancellation: 'Full refund up to 45 days before. 50% up to 21 days.',
      curfew: 'Amplified sound off at 11:00pm.',
      alcohol: 'Permitted with a licensed bar operator.',
      outsideVendors: 'All welcome.',
    },
    faq: STANDARD_FAQ,
    initials: 'JL',
    hue: 180,
  },
  {
    id: 'gra-terrace',
    name: 'Old GRA Terrace',
    tagline: 'Quiet garden terrace for family gatherings.',
    area: 'Old GRA',
    state: 'Rivers',
    spaceType: 'Garden',
    capacity: 200,
    seating: [
      { name: 'Banquet', capacity: 200 },
      { name: 'Cocktail', capacity: 300 },
    ],
    spaces: [{ name: 'Terrace garden', capacity: 200 }],
    pricePerDay: 480_000,
    weekendPremium: 20,
    depositPercent: 30,
    rating: 4.4,
    reviews: [
      {
        author: 'Ibiso W.',
        rating: 4,
        when: 'March 2026',
        text: 'Lovely for our naming ceremony. Shade is limited at midday.',
      },
    ],
    amenities: ['Parking', 'Backup power', 'Outdoor space', 'Security', 'Kitchen'],
    inHouse: [{ name: 'Canopy hire', price: 160_000 }],
    policies: {
      cancellation: 'Full refund up to 21 days before. 50% up to 10 days.',
      curfew: 'Music off at 10:00pm.',
      alcohol: 'Permitted.',
      outsideVendors: 'All welcome.',
    },
    faq: STANDARD_FAQ,
    initials: 'GT',
    hue: 130,
  },
  {
    id: 'port-harcourt-dome',
    name: 'Port Harcourt Dome',
    tagline: 'Industrial-scale dome for concerts and conventions.',
    area: 'Trans Amadi',
    state: 'Rivers',
    spaceType: 'Event center',
    capacity: 900,
    seating: [
      { name: 'Theatre', capacity: 1400 },
      { name: 'Banquet', capacity: 900 },
      { name: 'Cocktail', capacity: 1600 },
    ],
    spaces: [
      { name: 'Main dome', capacity: 900 },
      { name: 'Green room', capacity: 25 },
    ],
    pricePerDay: 1_600_000,
    weekendPremium: 15,
    depositPercent: 35,
    rating: 4.1,
    reviews: [
      {
        author: 'Tamuno G.',
        rating: 4,
        when: 'November 2025',
        text: 'Huge space and a proper stage. Acoustics need a good sound engineer.',
      },
    ],
    amenities: [
      'Parking',
      'Backup power',
      'Air conditioning',
      'Sound system',
      'Stage',
      'Security',
      'CCTV',
      'Disability access',
    ],
    inHouse: [
      { name: 'Stage and rigging', price: 750_000 },
      { name: 'Security detail', price: 420_000 },
    ],
    policies: {
      cancellation: 'Full refund up to 45 days before. 50% up to 21 days.',
      curfew: 'Events end by 1:00am.',
      alcohol: 'Permitted with licensed operator.',
      outsideVendors: 'All welcome.',
    },
    faq: STANDARD_FAQ,
    initials: 'PD',
    hue: 12,
  },
  {
    id: 'bodija-hall',
    name: 'Bodija Banquet Hall',
    tagline: 'Ibadan mainstay for traditional weddings.',
    area: 'Bodija',
    state: 'Oyo',
    spaceType: 'Hall',
    capacity: 450,
    seating: [
      { name: 'Banquet', capacity: 450 },
      { name: 'Theatre', capacity: 600 },
    ],
    spaces: [
      { name: 'Banquet hall', capacity: 450 },
      { name: 'Courtyard', capacity: 150 },
    ],
    pricePerDay: 560_000,
    weekendPremium: 25,
    depositPercent: 30,
    rating: 4.5,
    reviews: [
      {
        author: 'Ayo T.',
        rating: 5,
        when: 'February 2026',
        text: 'They have run a thousand engagements and it shows. Everything ran to time.',
      },
    ],
    amenities: [
      'Parking',
      'Backup power',
      'Air conditioning',
      'Sound system',
      'Kitchen',
      'Security',
      'Outdoor space',
    ],
    inHouse: [
      { name: 'In-house catering', price: 9_000 },
      { name: 'Traditional decor set', price: 320_000 },
    ],
    policies: {
      cancellation: 'Full refund up to 30 days before. 50% up to 14 days.',
      curfew: 'Hall cleared by midnight.',
      alcohol: 'Permitted.',
      outsideVendors: 'All welcome.',
    },
    faq: STANDARD_FAQ,
    initials: 'BB',
    hue: 42,
  },
  {
    id: 'independence-layout',
    name: 'Independence Layout Events',
    tagline: 'Enugu hall with a covered arrival forecourt.',
    area: 'Independence Layout',
    state: 'Enugu',
    spaceType: 'Event center',
    capacity: 400,
    seating: [
      { name: 'Banquet', capacity: 400 },
      { name: 'Theatre', capacity: 550 },
      { name: 'Classroom', capacity: 240 },
    ],
    spaces: [{ name: 'Main hall', capacity: 400 }],
    pricePerDay: 620_000,
    weekendPremium: 20,
    depositPercent: 30,
    rating: 4.3,
    reviews: [
      {
        author: 'Obiageli C.',
        rating: 4,
        when: 'December 2025',
        text: 'Solid hall, good price. The forecourt saved us when it rained on arrival.',
      },
    ],
    amenities: [
      'Parking',
      'Backup power',
      'Air conditioning',
      'Wi-Fi',
      'Sound system',
      'Projector & screen',
      'Kitchen',
      'Security',
    ],
    inHouse: [{ name: 'In-house catering', price: 8_500 }],
    policies: {
      cancellation: 'Full refund up to 30 days before. 50% up to 14 days.',
      curfew: 'Hall cleared by 1:00am.',
      alcohol: 'Permitted.',
      outsideVendors: 'All welcome.',
    },
    faq: STANDARD_FAQ,
    initials: 'IL',
    hue: 96,
  },
]

/*
 * Live listings from venue owners on the platform, registered by the owner
 * store whenever it changes. Kept as a module-level list rather than read
 * through context so the pure helpers below (and the screens that call them)
 * see owner venues without every host screen subscribing to the owner store.
 */
let listedVenues: Venue[] = []

export function setListedVenues(venues: Venue[]): void {
  listedVenues = venues
}

/** The searchable directory: live owner listings first, then the seeded venues. */
export function allVenues(): Venue[] {
  if (listedVenues.length === 0) return VENUES
  return [...listedVenues.filter((venue) => !venue.hidden), ...VENUES]
}

export function venueStates(): string[] {
  return [...new Set(allVenues().map((v) => v.state))].sort()
}

export function venueSpaceTypes(): string[] {
  return [...new Set(allVenues().map((v) => v.spaceType))].sort()
}

export type VenueSort = 'price-asc' | 'price-desc' | 'rating' | 'capacity'

export type VenueFilters = {
  query: string
  state: string
  area: string
  spaceType: string
  /** Minimum seated capacity. 0 = no minimum. */
  minCapacity: number
  /** Per-day ceiling. 0 = no ceiling. */
  maxPrice: number
  /** Every selected amenity must be present. */
  amenities: string[]
  minRating: number
  sort: VenueSort
}

export const NO_FILTERS: VenueFilters = {
  query: '',
  state: '',
  area: '',
  spaceType: '',
  minCapacity: 0,
  maxPrice: 0,
  amenities: [],
  minRating: 0,
  sort: 'price-asc',
}

export function areasIn(state: string): string[] {
  const venues = allVenues()
  const scoped = state ? venues.filter((v) => v.state === state) : venues
  return [...new Set(scoped.map((v) => v.area))].sort()
}

export function filterVenues(venues: Venue[], filters: VenueFilters): Venue[] {
  const query = filters.query.trim().toLowerCase()

  const matched = venues.filter((venue) => {
    if (filters.state && venue.state !== filters.state) return false
    if (filters.area && venue.area !== filters.area) return false
    if (filters.spaceType && venue.spaceType !== filters.spaceType) return false
    if (filters.minCapacity && venue.capacity < filters.minCapacity) return false
    if (filters.maxPrice && venue.pricePerDay > filters.maxPrice) return false
    if (filters.minRating && venue.rating < filters.minRating) return false

    for (const amenity of filters.amenities) {
      if (!venue.amenities.includes(amenity)) return false
    }

    if (query) {
      const haystack = `${venue.name} ${venue.area} ${venue.state} ${venue.spaceType} ${venue.tagline}`
      if (!haystack.toLowerCase().includes(query)) return false
    }

    return true
  })

  return sortVenues(matched, filters.sort)
}

function sortVenues(venues: Venue[], sort: VenueSort): Venue[] {
  const sorted = [...venues]

  if (sort === 'price-desc') sorted.sort((a, b) => b.pricePerDay - a.pricePerDay)
  else if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating)
  else if (sort === 'capacity') sorted.sort((a, b) => b.capacity - a.capacity)
  else sorted.sort((a, b) => a.pricePerDay - b.pricePerDay)

  return sorted
}

export function findVenue(id: string): Venue | undefined {
  return listedVenues.find((venue) => venue.id === id) ?? VENUES.find((venue) => venue.id === id)
}

export function countFilters(filters: VenueFilters): number {
  let count = 0
  if (filters.query) count += 1
  if (filters.state) count += 1
  if (filters.area) count += 1
  if (filters.spaceType) count += 1
  if (filters.minCapacity) count += 1
  if (filters.maxPrice) count += 1
  if (filters.minRating) count += 1
  return count + filters.amenities.length
}

/* ── Pricing ─────────────────────────────────────────────── */

export type Quote = {
  base: number
  /** The venue's weekday offer, as a positive amount taken off the base. */
  discount: number
  weekendPremium: number
  addOns: number
  total: number
  deposit: number
  balance: number
}

/**
 * Per-guest add-ons (catering) are priced by head count; everything else is a
 * flat fee. The weekend premium applies to the base hire only, which is how
 * venues actually quote it.
 */
export function quoteFor(
  venue: Venue,
  options: { weekend: boolean; guests: number; addOns: string[] },
): Quote {
  const base = venue.pricePerDay
  const weekendPremium = options.weekend
    ? Math.round((base * venue.weekendPremium) / 100)
    : 0
  const discount =
    !options.weekend && venue.weekdayOffer
      ? Math.round((base * venue.weekdayOffer) / 100)
      : 0

  const addOns = venue.inHouse
    .filter((service) => options.addOns.includes(service.name))
    .reduce((sum, service) => {
      const perGuest = isPerGuest(service)
      return sum + (perGuest ? service.price * Math.max(1, options.guests) : service.price)
    }, 0)

  const total = base - discount + weekendPremium + addOns
  const deposit = Math.round((total * venue.depositPercent) / 100)

  return { base, discount, weekendPremium, addOns, total, deposit, balance: total - deposit }
}

/**
 * True when the service is quoted per head rather than as a flat fee. Owner
 * listings say so explicitly; the seeded venues predate the flag, so for them
 * anything under ₦100k is taken to be a per-head price.
 */
export function isPerGuest(service: { price: number; perGuest?: boolean }): boolean {
  return service.perGuest ?? service.price < 100_000
}
