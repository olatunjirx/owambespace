import { makeId } from './events'
import type { EventRecord, EventType } from './events'

/**
 * The day-of run sheet — spec §10.8.
 *
 * A run sheet is the single page the MC, the caterer, the photographer and the
 * venue manager all work from: what happens, when, and whose job it is. Hosts
 * usually write it the night before, from memory, and forget the call times.
 *
 * Generated from the event type, the head count and one number the host
 * actually knows — the time on the invitation. Everything else is arithmetic:
 * set-up runs backwards from that time so vendors get real call times, and the
 * programme runs forwards from it.
 *
 * Like the budget splits, these are planning conventions rather than model
 * output. Every minute here traces to the table below, so a host can argue
 * with a specific number instead of with a black box.
 */

/** Who owns a segment. Matches vendor category slugs where one exists. */
export type SegmentOwner =
  | 'venue'
  | 'decor'
  | 'catering'
  | 'music'
  | 'photo'
  | 'mc'
  | 'security'
  | 'beauty'
  | 'host'

export const OWNER_LABELS: Record<SegmentOwner, string> = {
  venue: 'Venue',
  decor: 'Decor',
  catering: 'Catering',
  music: 'Music',
  photo: 'Photo & video',
  mc: 'MC',
  security: 'Security',
  beauty: 'Beauty',
  host: 'You',
}

export type RunSheetSegment = {
  id: string
  label: string
  owner: SegmentOwner
  /** How long the segment runs. */
  minutes: number
  note: string
  /**
   * The segment the host's stated time refers to — normally doors opening.
   * Everything before it is set-up, and gets a call time by subtraction.
   */
  anchor?: boolean
  /** Grows with head count: 400 people take longer to feed than 80. */
  scales?: boolean
  /** Added by the host rather than generated. */
  custom?: boolean
}

type Template = Omit<RunSheetSegment, 'id'>

/* ── Templates ───────────────────────────────────────────── */

/**
 * Set-up is shared by everything with a hall — only the length differs, and
 * that comes from the event type's own table below.
 */
const WEDDING: Template[] = [
  {
    label: 'Venue access and hall set-up',
    owner: 'venue',
    minutes: 120,
    note: 'Chairs, tables, cooling. Confirm the access time in your contract.',
  },
  {
    label: 'Decor install',
    owner: 'decor',
    minutes: 90,
    note: 'Backdrop, centrepieces, aisle. Runs alongside the hall set-up.',
  },
  {
    label: 'Catering load-in and warming',
    owner: 'catering',
    minutes: 60,
    note: 'Food arrives hot or gets finished on site.',
  },
  {
    label: 'Sound check',
    owner: 'music',
    minutes: 45,
    note: 'Mics for the MC and the officiant, not just the band.',
  },
  {
    label: 'Photographer detail shots',
    owner: 'photo',
    minutes: 30,
    note: 'The room, the cake and the decor before anyone touches them.',
  },
  {
    label: 'Doors open, guests seated',
    owner: 'venue',
    minutes: 45,
    note: 'The time printed on the invitation.',
    anchor: true,
    scales: true,
  },
  {
    label: "Couple's entrance",
    owner: 'mc',
    minutes: 15,
    note: 'Brief the MC on names, titles and pronunciation.',
  },
  {
    label: 'Opening prayer and welcome',
    owner: 'mc',
    minutes: 10,
    note: 'Agree who prays before the day, not on the mic.',
  },
  {
    label: 'Traditional rites',
    owner: 'host',
    minutes: 30,
    note: 'Kola, prayers, family presentations — trim to your own programme.',
  },
  {
    label: 'Meal service',
    owner: 'catering',
    minutes: 60,
    note: 'Table by table beats a queue at any size.',
    scales: true,
  },
  {
    label: 'Speeches and toasts',
    owner: 'mc',
    minutes: 30,
    note: 'Three speakers, five minutes each. Tell them the limit in advance.',
  },
  {
    label: 'Cake cutting and first dance',
    owner: 'photo',
    minutes: 20,
    note: 'Warn the photographer — it is the shot people ask for.',
  },
  {
    label: 'Dancing and spraying',
    owner: 'music',
    minutes: 90,
    note: 'Have someone trusted collecting and counting.',
    scales: true,
  },
  {
    label: 'Vote of thanks and send-off',
    owner: 'mc',
    minutes: 15,
    note: 'Souvenirs go out here, at the door, not earlier.',
  },
  {
    label: 'Strike and venue handover',
    owner: 'venue',
    minutes: 60,
    note: 'Overrunning here is what costs the caution fee.',
  },
]

const BIRTHDAY: Template[] = [
  {
    label: 'Venue access and set-up',
    owner: 'venue',
    minutes: 90,
    note: 'Chairs, tables and power before anything decorative.',
  },
  {
    label: 'Decor and balloon install',
    owner: 'decor',
    minutes: 60,
    note: 'Balloons last badly in the sun — install late, not early.',
  },
  {
    label: 'Catering load-in',
    owner: 'catering',
    minutes: 45,
    note: 'Small chops out first, mains held warm.',
  },
  {
    label: 'DJ set-up and sound check',
    owner: 'music',
    minutes: 45,
    note: 'Confirm the playlist and the do-not-play list.',
  },
  {
    label: 'Doors open, guests arrive',
    owner: 'venue',
    minutes: 45,
    note: 'The time on the invitation.',
    anchor: true,
    scales: true,
  },
  {
    label: 'Welcome and small chops',
    owner: 'mc',
    minutes: 30,
    note: 'Keep drinks moving while people settle.',
  },
  {
    label: 'Celebrant grand entrance',
    owner: 'mc',
    minutes: 15,
    note: 'Cue the DJ and the photographer together.',
  },
  {
    label: 'Meal service',
    owner: 'catering',
    minutes: 45,
    note: 'Serve before the speeches, never during.',
    scales: true,
  },
  {
    label: 'Toast and tributes',
    owner: 'mc',
    minutes: 25,
    note: 'Pick the speakers in advance or it runs long.',
  },
  {
    label: 'Cake cutting',
    owner: 'photo',
    minutes: 15,
    note: 'Cake knife, lighter and a clear table.',
  },
  {
    label: 'Dancing and games',
    owner: 'music',
    minutes: 90,
    note: 'Where the night actually happens.',
    scales: true,
  },
  {
    label: 'Close and clear-up',
    owner: 'venue',
    minutes: 45,
    note: 'Check your hire items back out before you leave.',
  },
]

const NAMING: Template[] = [
  {
    label: 'Set-up and decor',
    owner: 'decor',
    minutes: 60,
    note: 'Usually a compound or a small hall.',
  },
  {
    label: 'Catering load-in',
    owner: 'catering',
    minutes: 45,
    note: 'Numbers are smaller — plan for extras turning up anyway.',
  },
  {
    label: 'Lay out the traditional tray',
    owner: 'host',
    minutes: 20,
    note: 'Honey, salt, kola, water, oil, sugar cane, bitter kola.',
  },
  {
    label: 'Guests arrive',
    owner: 'venue',
    minutes: 30,
    note: 'The time on the invitation.',
    anchor: true,
    scales: true,
  },
  {
    label: 'Opening prayer',
    owner: 'host',
    minutes: 10,
    note: 'Confirm with the officiant the day before.',
  },
  {
    label: 'The naming rites',
    owner: 'host',
    minutes: 30,
    note: 'Elders taste each item and pronounce the names.',
  },
  {
    label: 'Family photographs',
    owner: 'photo',
    minutes: 20,
    note: 'Do this while everyone is still gathered.',
  },
  {
    label: 'Meal and refreshments',
    owner: 'catering',
    minutes: 60,
    note: 'Small chops, jollof, drinks.',
    scales: true,
  },
  {
    label: 'Thanks and departure',
    owner: 'host',
    minutes: 20,
    note: 'Souvenirs at the door.',
  },
  {
    label: 'Clear-up',
    owner: 'venue',
    minutes: 30,
    note: 'Hired chairs and canopies counted back out.',
  },
]

const BURIAL: Template[] = [
  {
    label: 'Reception venue set-up',
    owner: 'venue',
    minutes: 90,
    note: 'Canopies, chairs and shade before the family returns.',
  },
  {
    label: 'Catering load-in',
    owner: 'catering',
    minutes: 60,
    note: 'Cater for more than you invited — burials draw a crowd.',
  },
  {
    label: 'Ushers and security briefing',
    owner: 'security',
    minutes: 20,
    note: 'Who sits where, and who handles the gate.',
  },
  {
    label: 'Service of songs or church service',
    owner: 'host',
    minutes: 90,
    note: 'The time printed on the order of service.',
    anchor: true,
  },
  {
    label: 'Interment',
    owner: 'host',
    minutes: 60,
    note: 'Confirm the graveside arrangements and transport.',
  },
  {
    label: 'Guests move to the reception',
    owner: 'security',
    minutes: 45,
    note: 'The convoy is where things run late — brief the drivers.',
    scales: true,
  },
  {
    label: 'Refreshments served',
    owner: 'catering',
    minutes: 90,
    note: 'Serve the elderly and travellers first.',
    scales: true,
  },
  {
    label: 'Tributes and appreciation',
    owner: 'mc',
    minutes: 45,
    note: 'The family speaks last.',
  },
  {
    label: 'Close and clear-up',
    owner: 'venue',
    minutes: 60,
    note: 'Leave someone responsible behind for the hire items.',
  },
]

const CORPORATE: Template[] = [
  {
    label: 'Venue access and room set',
    owner: 'venue',
    minutes: 90,
    note: 'Theatre, banquet or cabaret — confirm the layout in writing.',
  },
  {
    label: 'AV set-up and test',
    owner: 'music',
    minutes: 90,
    note: 'Projector, clicker, lapel mics, and the recording feed.',
  },
  {
    label: 'Branding and signage install',
    owner: 'decor',
    minutes: 45,
    note: 'Backdrop, pull-ups, directional signs from the car park.',
  },
  {
    label: 'Speaker rehearsal and slide check',
    owner: 'host',
    minutes: 45,
    note: 'Every deck opened on the actual machine, in the actual room.',
  },
  {
    label: 'Registration opens',
    owner: 'security',
    minutes: 45,
    note: 'The time on the invitation. Two desks past 150 guests.',
    anchor: true,
    scales: true,
  },
  {
    label: 'Welcome and housekeeping',
    owner: 'mc',
    minutes: 15,
    note: 'Exits, wifi, hashtag, and when lunch is.',
  },
  {
    label: 'Opening address',
    owner: 'host',
    minutes: 20,
    note: 'Brief the MC on the correct titles.',
  },
  {
    label: 'Sessions and panels',
    owner: 'mc',
    minutes: 120,
    note: 'A visible countdown clock keeps speakers honest.',
  },
  {
    label: 'Networking break',
    owner: 'catering',
    minutes: 30,
    note: 'Coffee and small chops away from the plenary doors.',
  },
  {
    label: 'Lunch',
    owner: 'catering',
    minutes: 60,
    note: 'Dietary requirements go to the caterer as one list.',
    scales: true,
  },
  {
    label: 'Closing remarks and photographs',
    owner: 'photo',
    minutes: 30,
    note: 'Group shot before people start leaving, not after.',
  },
  {
    label: 'Pack-down',
    owner: 'venue',
    minutes: 60,
    note: 'Collect the AV, the banners and the recording.',
  },
]

const CONCERT: Template[] = [
  {
    label: 'Load-in and stage build',
    owner: 'venue',
    minutes: 180,
    note: 'Stage, barriers, power distribution.',
  },
  {
    label: 'Sound and lighting rig',
    owner: 'music',
    minutes: 120,
    note: 'Rig sized against the room, not against the budget.',
  },
  {
    label: 'Line check and sound check',
    owner: 'music',
    minutes: 90,
    note: 'Headliner last, support acts before them.',
  },
  {
    label: 'Security briefing and sweep',
    owner: 'security',
    minutes: 45,
    note: 'Search points, exits, and the medical position.',
  },
  {
    label: 'Doors open',
    owner: 'security',
    minutes: 60,
    note: 'The time on the ticket. Queue management starts before this.',
    anchor: true,
    scales: true,
  },
  {
    label: 'Support acts',
    owner: 'music',
    minutes: 60,
    note: 'Set times in writing, enforced by the stage manager.',
  },
  {
    label: 'Changeover',
    owner: 'music',
    minutes: 20,
    note: 'The gap the crowd notices most — fill it with the DJ.',
  },
  {
    label: 'Headline set',
    owner: 'music',
    minutes: 90,
    note: 'Check the venue curfew before you promise an encore.',
  },
  {
    label: 'Crowd egress',
    owner: 'security',
    minutes: 45,
    note: 'Lights up, music on, doors wide.',
    scales: true,
  },
  {
    label: 'Load-out',
    owner: 'venue',
    minutes: 120,
    note: 'Budget for the overtime — it always runs past midnight.',
  },
]

const GENERIC: Template[] = [
  {
    label: 'Venue access and set-up',
    owner: 'venue',
    minutes: 90,
    note: 'Confirm your access time in the contract.',
  },
  {
    label: 'Decor and catering load-in',
    owner: 'decor',
    minutes: 60,
    note: 'Decor first, food last so nothing sits out.',
  },
  {
    label: 'Sound check',
    owner: 'music',
    minutes: 30,
    note: 'Test the mic someone will actually speak into.',
  },
  {
    label: 'Doors open, guests arrive',
    owner: 'venue',
    minutes: 45,
    note: 'The time on the invitation.',
    anchor: true,
    scales: true,
  },
  {
    label: 'Welcome',
    owner: 'mc',
    minutes: 15,
    note: 'Short. People are still finding seats.',
  },
  {
    label: 'Main programme',
    owner: 'host',
    minutes: 90,
    note: 'Break this into your own segments below.',
  },
  {
    label: 'Meal service',
    owner: 'catering',
    minutes: 60,
    note: 'Table by table beats a queue.',
    scales: true,
  },
  {
    label: 'Closing and thanks',
    owner: 'mc',
    minutes: 15,
    note: 'Souvenirs at the door.',
  },
  {
    label: 'Clear-up and handover',
    owner: 'venue',
    minutes: 45,
    note: 'Hire items counted back out.',
  },
]

const TEMPLATES: Record<EventType, Template[]> = {
  Wedding: WEDDING,
  Birthday: BIRTHDAY,
  'Naming ceremony': NAMING,
  Burial: BURIAL,
  'Corporate event': CORPORATE,
  'Concert or show': CONCERT,
  'Something else': GENERIC,
}

/** When these events usually tell guests to arrive, as HH:mm. */
const DEFAULT_START: Record<EventType, string> = {
  Wedding: '14:00',
  Birthday: '16:00',
  'Naming ceremony': '11:00',
  Burial: '10:00',
  'Corporate event': '09:00',
  'Concert or show': '18:00',
  'Something else': '15:00',
}

export function defaultStartTime(type: EventType): string {
  return DEFAULT_START[type] ?? '15:00'
}

/* ── Stored shape ────────────────────────────────────────── */

export type RunSheet = {
  /** HH:mm the anchor segment begins — the time on the invitation. */
  startTime: string
  segments: RunSheetSegment[]
}

/**
 * Stretches a segment for the head count.
 *
 * A hundred guests is the baseline every duration above is written against.
 * Beyond that, service and movement grow roughly with the room: a fifth more
 * time per extra hundred, capped so a 1,000-seat hall does not claim it needs
 * a nine-hour dinner.
 */
function scaleMinutes(minutes: number, guests: number): number {
  if (guests <= 100) return minutes
  const growth = Math.min(1, ((guests - 100) / 100) * 0.2)
  // Rounded to five so the sheet reads like a plan, not a stopwatch.
  return Math.round((minutes * (1 + growth)) / 5) * 5
}

/** How many heads the sheet should be timed for. */
export function headCountFor(event: EventRecord): number {
  const confirmed = event.guests.filter((guest) => guest.status === 'coming')
  const heads = confirmed.reduce((sum, guest) => sum + 1 + guest.plusOnes, 0)
  // Before RSVPs land, the estimate given at creation is the best number there is.
  return heads > 0 ? heads : event.guestEstimate || 100
}

export function buildRunSheet(event: EventRecord): RunSheet {
  const guests = headCountFor(event)
  const template = TEMPLATES[event.type] ?? GENERIC

  return {
    startTime: defaultStartTime(event.type),
    segments: template.map((segment) => ({
      ...segment,
      id: makeId(),
      minutes: segment.scales ? scaleMinutes(segment.minutes, guests) : segment.minutes,
    })),
  }
}

/* ── Time arithmetic ─────────────────────────────────────── */

export function parseTime(value: string): number {
  const match = value.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return 0
  return Number(match[1]) * 60 + Number(match[2])
}

/**
 * Formats minutes-from-midnight, wrapping across days.
 *
 * Set-up before an early morning start can land the previous evening, and a
 * concert load-out lands the next morning. Both are real; both need saying.
 */
export function formatTime(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440
  const hour = Math.floor(wrapped / 60)
  const minute = wrapped % 60
  const suffix = hour < 12 ? 'am' : 'pm'
  const display = hour % 12 === 0 ? 12 : hour % 12
  return `${display}:${String(minute).padStart(2, '0')}${suffix}`
}

/** 'the night before' / 'next morning', or '' when it lands on the day. */
export function dayShift(minutes: number): string {
  if (minutes < 0) return 'day before'
  if (minutes >= 1440) return 'next day'
  return ''
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

export type TimedSegment = RunSheetSegment & {
  /** Minutes from midnight on the event day; may be negative or over 1440. */
  startsAt: number
  endsAt: number
  /** True for everything before the anchor — these are call times, not programme. */
  setup: boolean
}

export type TimedRunSheet = {
  segments: TimedSegment[]
  /** When the first vendor has to be on site. */
  callTime: number
  /** When the last segment ends. */
  endsAt: number
  /** Anchor to close, ignoring set-up and strike. */
  guestFacingMinutes: number
}

/**
 * Lays the sheet out on a clock.
 *
 * Set-up runs backwards from the anchor so each vendor gets the time they must
 * actually arrive; the programme runs forwards from it. Segments before the
 * anchor overlap in practice — decor and catering are both in the hall — but
 * stacking them sequentially gives the earliest honest call time, which is the
 * number that stops a set-up running into the guests.
 */
export function layOut(sheet: RunSheet): TimedRunSheet {
  const anchorIndex = Math.max(
    0,
    sheet.segments.findIndex((segment) => segment.anchor),
  )
  const anchorStart = parseTime(sheet.startTime)

  const segments: TimedSegment[] = new Array(sheet.segments.length)

  // Backwards from the anchor.
  let cursor = anchorStart
  for (let index = anchorIndex - 1; index >= 0; index -= 1) {
    const segment = sheet.segments[index]
    cursor -= segment.minutes
    segments[index] = {
      ...segment,
      startsAt: cursor,
      endsAt: cursor + segment.minutes,
      setup: true,
    }
  }

  // Forwards from the anchor.
  cursor = anchorStart
  for (let index = anchorIndex; index < sheet.segments.length; index += 1) {
    const segment = sheet.segments[index]
    segments[index] = {
      ...segment,
      startsAt: cursor,
      endsAt: cursor + segment.minutes,
      setup: false,
    }
    cursor += segment.minutes
  }

  return {
    segments,
    callTime: segments.length > 0 ? segments[0].startsAt : anchorStart,
    endsAt: cursor,
    guestFacingMinutes: cursor - anchorStart,
  }
}

/** Call times per vendor, which is what actually gets sent to each of them. */
export function callSheet(timed: TimedRunSheet): { owner: SegmentOwner; at: number }[] {
  const earliest = new Map<SegmentOwner, number>()

  for (const segment of timed.segments) {
    const known = earliest.get(segment.owner)
    if (known === undefined || segment.startsAt < known) {
      earliest.set(segment.owner, segment.startsAt)
    }
  }

  return [...earliest.entries()]
    .map(([owner, at]) => ({ owner, at }))
    .sort((a, b) => a.at - b.at)
}

/** Things worth saying about the shape of the day, above the table. */
export function runSheetFlags(event: EventRecord, timed: TimedRunSheet): string[] {
  const flags: string[] = []
  const guests = headCountFor(event)

  if (timed.callTime < 0) {
    flags.push(
      `Set-up starts the night before at ${formatTime(timed.callTime)}. Check the venue lets you in that early, or move the start time later.`,
    )
  }

  if (timed.endsAt >= 1440) {
    flags.push(
      `The day runs past midnight, finishing ${formatTime(timed.endsAt)} the next morning. Most halls charge overtime past their curfew.`,
    )
  }

  if (timed.guestFacingMinutes > 480) {
    flags.push(
      `${formatDuration(timed.guestFacingMinutes)} from doors to close is long for guests. Trimming dancing or the programme is easier than adding hours to the hall.`,
    )
  }

  const meal = timed.segments.find(
    (segment) => segment.owner === 'catering' && !segment.setup,
  )
  if (meal && guests > 250 && meal.minutes < 75) {
    flags.push(
      `Serving ${guests} guests in ${formatDuration(meal.minutes)} needs several service points. Confirm the caterer's staff count.`,
    )
  }

  return flags
}

/** Plain text, for the version that gets sent to an MC over WhatsApp. */
export function toPlainText(event: EventRecord, sheet: RunSheet): string {
  const timed = layOut(sheet)

  const lines = [
    `${event.name || 'Event'} — run sheet`,
    event.date ? event.date : 'Date not set',
    `Guests timed for: ${headCountFor(event)}`,
    '',
  ]

  for (const segment of timed.segments) {
    const shift = dayShift(segment.startsAt)
    const when = `${formatTime(segment.startsAt)}${shift ? ` (${shift})` : ''}`
    lines.push(
      `${when.padEnd(18)} ${OWNER_LABELS[segment.owner].padEnd(14)} ${segment.label} (${formatDuration(segment.minutes)})`,
    )
  }

  lines.push('', 'Call times')
  for (const call of callSheet(timed)) {
    lines.push(`${formatTime(call.at).padEnd(10)} ${OWNER_LABELS[call.owner]}`)
  }

  return lines.join('\n')
}
