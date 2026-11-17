import { activeBookings, formatEventDate } from './events'
import type { EventRecord, EventType } from './events'
import { defaultStartTime, formatTime, parseTime } from './runSheet'
import { findVenue } from './venues'

/**
 * Event flyers: ready-made templates per event type, free or premium.
 *
 * Every template is drawn as SVG from the same fields, so the preview on
 * screen and the exported PNG/PDF are one drawing — what the host approves is
 * exactly what their guests receive.
 */

// Placeholder price — the real figure is a business decision.
export const PREMIUM_FLYER_PRICE = 5_000

export type FlyerSize = 'post' | 'story' | 'print'

export const FLYER_SIZES: Record<
  FlyerSize,
  { label: string; note: string; width: number; height: number }
> = {
  post: { label: 'Square post', note: 'Instagram & WhatsApp', width: 1080, height: 1080 },
  story: { label: 'Story', note: 'Status & stories', width: 1080, height: 1920 },
  // A5 at 300 dpi.
  print: { label: 'A5 print', note: 'Print-ready, 300 dpi', width: 1748, height: 2480 },
}

export type FlyerFields = {
  eyebrow: string
  title: string
  names: string
  date: string
  time: string
  venue: string
  dressCode: string
  rsvp: string
  /** A downscaled JPEG data URL, so it survives storage and export. */
  photo?: string
}

export type FlyerDesign = {
  templateId: string
  fields: FlyerFields
  /** Premium-only override of the template's accent colour. */
  accent?: string
  /** Premium templates paid for on this event. */
  unlocked: string[]
  /** Shown as the event's cover on the overview. */
  cover: boolean
}

export type FlyerLook =
  | 'royal'
  | 'clean'
  | 'ankara'
  | 'memory'
  | 'gold'
  | 'stars'
  | 'neon'
  | 'floral'
  | 'boardroom'

export type FlyerTemplate = {
  id: string
  name: string
  tier: 'free' | 'premium'
  types: EventType[]
  look: FlyerLook
  /** Default accent; premium hosts can swap it. */
  accent: string
}

const CELEBRATIONS: EventType[] = ['Wedding', 'Birthday', 'Naming ceremony', 'Something else']

export const FLYER_TEMPLATES: FlyerTemplate[] = [
  { id: 'royal', name: 'Royal purple', tier: 'free', types: CELEBRATIONS, look: 'royal', accent: '#f3c969' },
  {
    id: 'clean',
    name: 'Clean card',
    tier: 'free',
    types: ['Wedding', 'Birthday', 'Naming ceremony', 'Burial', 'Corporate event', 'Concert or show', 'Something else'],
    look: 'clean',
    accent: '#6935f0',
  },
  {
    id: 'ankara',
    name: 'Ankara band',
    tier: 'free',
    types: ['Wedding', 'Birthday', 'Naming ceremony', 'Concert or show', 'Something else'],
    look: 'ankara',
    accent: '#d9480f',
  },
  { id: 'memory', name: 'In loving memory', tier: 'free', types: ['Burial'], look: 'memory', accent: '#c2ae7f' },
  {
    id: 'gold',
    name: 'Gold leaf',
    tier: 'premium',
    types: ['Wedding', 'Birthday', 'Naming ceremony', 'Something else'],
    look: 'gold',
    accent: '#d9b25a',
  },
  { id: 'stars', name: 'Little one', tier: 'premium', types: ['Naming ceremony'], look: 'stars', accent: '#f08bab' },
  {
    id: 'neon',
    name: 'Neon night',
    tier: 'premium',
    types: ['Birthday', 'Concert or show', 'Something else'],
    look: 'neon',
    accent: '#ff4fd8',
  },
  { id: 'floral', name: 'Celebration of life', tier: 'premium', types: ['Burial'], look: 'floral', accent: '#7a8b6f' },
  { id: 'boardroom', name: 'Boardroom', tier: 'premium', types: ['Corporate event'], look: 'boardroom', accent: '#38bdf8' },
]

/** Premium hosts choose from these, beside the template's own accent. */
export const ACCENT_SWATCHES = ['#f3c969', '#e5484d', '#1baf7a', '#2a78d6', '#ff4fd8', '#ffffff']

export function templatesFor(type: EventType): FlyerTemplate[] {
  return FLYER_TEMPLATES.filter((template) => template.types.includes(type))
}

export function findTemplate(id: string): FlyerTemplate | undefined {
  return FLYER_TEMPLATES.find((template) => template.id === id)
}

/** Premium templates stay watermarked until paid for. */
export function isLocked(template: FlyerTemplate, design: FlyerDesign | undefined): boolean {
  return template.tier === 'premium' && !design?.unlocked.includes(template.id)
}

const EYEBROWS: Record<EventType, string> = {
  Wedding: 'Together with their families',
  Birthday: 'You are invited to celebrate',
  'Naming ceremony': 'Join us to welcome',
  Burial: 'Celebrating the life of',
  'Corporate event': 'You are invited to',
  'Concert or show': 'Live',
  'Something else': 'You are invited',
}

export const NAME_HINTS: Record<EventType, string> = {
  Wedding: 'Ada & Tunde',
  Birthday: 'Mama Bisi at 60',
  'Naming ceremony': 'Baby Tife Adeyemi',
  Burial: 'Chief Emmanuel Okafor, 1941 – 2026',
  'Corporate event': 'Hosted by Lagos Tech Week',
  'Concert or show': 'Featuring Asa & band',
  'Something else': 'Hosted by the Adeyemi family',
}

/** Everything the event already knows, so a flyer starts filled in. */
export function defaultFields(event: EventRecord): FlyerFields {
  const start = event.runSheet?.startTime ?? defaultStartTime(event.type)
  const booked = activeBookings(event).find((booking) => booking.status === 'confirmed')
  const venue = booked ? findVenue(booked.venueId) : undefined

  return {
    eyebrow: EYEBROWS[event.type],
    title: event.name,
    names: '',
    date: event.date ? formatEventDate(event.date) : '',
    time: formatTime(parseTime(start)),
    venue: venue
      ? `${venue.name}, ${venue.area}`
      : [event.city, event.state].filter(Boolean).join(', '),
    dressCode: '',
    rsvp: '',
  }
}

/** Paid flyers export at twice the pixels; print is already 300 dpi. */
export function exportScale(size: FlyerSize, paid: boolean): number {
  return paid && size !== 'print' ? 2 : 1
}

export function newDesign(event: EventRecord, templateId: string): FlyerDesign {
  return { templateId, fields: defaultFields(event), unlocked: [], cover: true }
}
