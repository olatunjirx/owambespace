/**
 * The three entry doors and the fixed screen sequence behind each one.
 *
 * The total comes from the door, which is chosen on screen 1 — never from how
 * far the user has got. That is what keeps "Step 2 of 4" from quietly becoming
 * "Step 2 of 3" when a later branch turns out to be shorter.
 */
export type Door = 'host' | 'venue' | 'service'
export type StepId = 'type' | 'venue' | 'work' | 'account' | 'verify'
export type AccountRole = 'host' | 'venue_owner' | 'planner' | 'vendor'
export type OperatingMode = 'solo' | 'company'

export const DOOR_STEPS: Record<Door, StepId[]> = {
  host: ['type', 'account', 'verify'],
  venue: ['type', 'venue', 'account', 'verify'],
  service: ['type', 'work', 'account', 'verify'],
}

export const DOOR_OPTIONS = [
  {
    id: 'host' as Door,
    title: 'I am planning an event',
    description: 'Find venues, invite guests, track budget',
  },
  {
    id: 'venue' as Door,
    title: 'I own a venue',
    description: 'Event center, hall, hotel space, garden or rooftop',
  },
  {
    id: 'service' as Door,
    title: 'I offer a service',
    description: 'Planning, catering, decor, photography, music, security and more',
  },
]

/**
 * Event planning is its own thing, not one category among many — picking it
 * makes you a planner, everything else makes you a vendor. It is presented
 * above the vendor grid for that reason.
 */
export const PLANNING_SERVICE = 'Event planning'

export const VENDOR_CATEGORIES = [
  'Catering & drinks',
  'Decor & rentals',
  'Photo & video',
  'Music & entertainment',
  'Beauty & styling',
  'Staffing & security',
  'Something else',
]

export const SPACE_TYPES = [
  'Event center',
  'Hall',
  'Hotel space',
  'Field (open space)',
  'Garden',
  'Roof top',
]

/** Which dashboard the finished account lands on. */
export function roleForDraft(door: Door, service: string): AccountRole {
  if (door === 'host') return 'host'
  if (door === 'venue') return 'venue_owner'
  return service === PLANNING_SERVICE ? 'planner' : 'vendor'
}

export const ROLE_LABELS: Record<AccountRole, string> = {
  host: 'Event host',
  venue_owner: 'Venue owner',
  planner: 'Event planner',
  vendor: 'Vendor',
}

/** The chip shown on later screens, echoing the door they came through. */
export const DOOR_CHIP_LABELS: Record<Door, string> = {
  host: 'Planning an event',
  venue: 'I own a venue',
  service: 'I offer a service',
}

export const HERO_HEADLINES: Record<Door, string[]> = {
  host: ['Book the hall.', 'Hold the money.', 'Throw the party.'],
  venue: ['Fill your calendar.', 'Get paid on time,', 'every time.'],
  service: ['Get booked.', 'Get paid.', 'No chasing.'],
}

export function stepIndex(door: Door, step: StepId): number {
  return DOOR_STEPS[door].indexOf(step)
}

export function stepTotal(door: Door): number {
  return DOOR_STEPS[door].length
}
