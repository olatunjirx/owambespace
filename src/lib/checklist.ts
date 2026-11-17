import { makeId } from './events'
import type { ChecklistItem, EventType } from './events'

/**
 * The checklist a host gets the moment an event is created.
 *
 * Generated from the event type rather than stored as one fixed list: a burial
 * is planned in weeks and a wedding in months, and telling a grieving family
 * to "book your cake tasting 20 weeks out" is worse than no checklist at all.
 *
 * `weeksBefore` is how far ahead the task should be done. Items whose lead
 * time has already passed still appear — they are late, not irrelevant.
 */

type Template = Omit<ChecklistItem, 'id' | 'done' | 'custom'>

/** Every event needs these, whatever it is. */
const CORE: Template[] = [
  {
    label: 'Lock the date',
    note: 'Nothing else can be confirmed until this is fixed.',
    weeksBefore: 20,
    satisfiedBy: 'date',
  },
  {
    label: 'Set your budget',
    note: 'A ceiling now saves an argument later.',
    weeksBefore: 20,
    satisfiedBy: 'budget',
  },
  {
    label: 'Shortlist venues',
    note: 'Save three or four you would be happy with.',
    weeksBefore: 18,
    satisfiedBy: 'venue',
  },
  {
    label: 'Book the venue',
    note: 'Deposit secures the date; good halls go early.',
    weeksBefore: 16,
    satisfiedBy: 'venue',
  },
  {
    label: 'Draw up the guest list',
    note: 'The head count decides the hall, the food and the budget.',
    weeksBefore: 14,
  },
  {
    label: 'Book catering',
    note: 'Confirm the menu and any dietary needs.',
    weeksBefore: 12,
  },
  {
    label: 'Book photography and video',
    note: 'The one thing you cannot redo afterwards.',
    weeksBefore: 12,
  },
  {
    label: 'Send invitations',
    note: 'Early enough that people can plan travel.',
    weeksBefore: 8,
  },
  {
    label: 'Chase outstanding RSVPs',
    note: 'Caterers need a firm number, not an estimate.',
    weeksBefore: 3,
  },
  {
    label: 'Confirm final head count with the caterer',
    note: 'Most contracts lock the number a week out.',
    weeksBefore: 1,
  },
  {
    label: 'Share the run of show',
    note: 'The venue, MC and photographer all work off it.',
    weeksBefore: 1,
  },
  {
    label: 'Settle outstanding balances',
    note: 'Nobody wants to be moving money on the day.',
    weeksBefore: 1,
  },
]

/** Layered on top of the core list, per event type. */
const BY_TYPE: Record<EventType, Template[]> = {
  Wedding: [
    {
      label: 'Book decor and florals',
      note: 'Share your colours and a reference photo.',
      weeksBefore: 12,
    },
    {
      label: 'Arrange asoebi',
      note: 'Fabric takes weeks to source and sew.',
      weeksBefore: 12,
    },
    {
      label: 'Book MC, DJ or live band',
      note: 'Good ones are booked a season ahead.',
      weeksBefore: 10,
    },
    {
      label: 'Book makeup and styling',
      note: 'Include a trial before the day.',
      weeksBefore: 8,
    },
    {
      label: 'Plan the seating chart',
      note: 'Group families; keep the two who argue apart.',
      weeksBefore: 2,
    },
  ],
  Birthday: [
    {
      label: 'Decide the theme',
      note: 'It drives decor, cake and dress code.',
      weeksBefore: 10,
    },
    {
      label: 'Order the cake',
      note: 'Confirm flavour, size and delivery time.',
      weeksBefore: 6,
    },
    {
      label: 'Book entertainment',
      note: 'DJ, MC, or a live act.',
      weeksBefore: 6,
    },
  ],
  'Naming ceremony': [
    {
      label: 'Confirm the officiant',
      note: 'Agree the order of the rites in advance.',
      weeksBefore: 4,
    },
    {
      label: 'Arrange traditional items',
      note: 'Honey, salt, kola and the rest of the tray.',
      weeksBefore: 2,
    },
    {
      label: 'Order the cake and small chops',
      note: 'Numbers are usually smaller than a wedding.',
      weeksBefore: 2,
    },
  ],
  Burial: [
    {
      label: 'Agree the programme with the family',
      note: 'Service, interment and reception order.',
      weeksBefore: 3,
    },
    {
      label: 'Confirm the officiant and venue',
      note: 'Church or compound, then the reception hall.',
      weeksBefore: 3,
    },
    {
      label: 'Print the order of service',
      note: 'Allow a few days at the printer.',
      weeksBefore: 1,
    },
    {
      label: 'Arrange transport for family',
      note: 'Buses for guests travelling in.',
      weeksBefore: 1,
    },
  ],
  'Corporate event': [
    {
      label: 'Confirm AV and technical needs',
      note: 'Projector, microphones, stage, recording.',
      weeksBefore: 8,
    },
    {
      label: 'Lock the agenda and speakers',
      note: 'Speakers need lead time to prepare.',
      weeksBefore: 6,
    },
    {
      label: 'Arrange branding and signage',
      note: 'Banners and backdrops take a week to print.',
      weeksBefore: 4,
    },
    {
      label: 'Collect dietary requirements',
      note: 'Send them to catering as one list.',
      weeksBefore: 2,
    },
  ],
  'Concert or show': [
    {
      label: 'Confirm the line-up',
      note: 'Get set times in writing.',
      weeksBefore: 10,
    },
    {
      label: 'Book sound and lighting',
      note: 'Specify the rig against the venue size.',
      weeksBefore: 8,
    },
    {
      label: 'Arrange security and crowd control',
      note: 'Required by most venues above 500 guests.',
      weeksBefore: 6,
    },
    {
      label: 'Plan the sound check',
      note: 'Book the extra venue hours you will need.',
      weeksBefore: 1,
    },
  ],
  'Something else': [],
}

/**
 * Builds the starting checklist. Items are ordered by lead time, longest
 * first, so the list reads as a plan rather than a pile.
 *
 * `supplied` marks what the creation form already collected. Telling a host
 * that "set your budget" is overdue seconds after they typed a budget is the
 * fastest way to make them stop trusting the list.
 */
export function buildChecklist(
  type: EventType,
  supplied: { date?: boolean; budget?: boolean } = {},
): ChecklistItem[] {
  return [...CORE, ...BY_TYPE[type]]
    .sort((a, b) => b.weeksBefore - a.weeksBefore)
    .map((template) => ({
      ...template,
      id: makeId(),
      done:
        (template.satisfiedBy === 'date' && Boolean(supplied.date)) ||
        (template.satisfiedBy === 'budget' && Boolean(supplied.budget)),
      custom: false,
    }))
}

/** How the lead time reads next to a task, given the event's date. */
export function dueLabel(weeksBefore: number, daysToEvent: number | null): string {
  if (daysToEvent === null) {
    return weeksBefore >= 2 ? `${weeksBefore} weeks ahead` : 'Final week'
  }

  const daysUntilDue = daysToEvent - weeksBefore * 7

  if (daysUntilDue < 0) return 'Overdue'
  if (daysUntilDue === 0) return 'Due today'
  if (daysUntilDue < 7) return `Due in ${daysUntilDue} days`

  const weeks = Math.round(daysUntilDue / 7)
  return weeks === 1 ? 'Due in a week' : `Due in ${weeks} weeks`
}

export function isOverdue(weeksBefore: number, daysToEvent: number | null): boolean {
  if (daysToEvent === null) return false
  return daysToEvent - weeksBefore * 7 < 0
}
