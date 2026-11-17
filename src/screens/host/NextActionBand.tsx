import { motion } from 'framer-motion'

import { eventPath } from './EventShell'
import { isOverdue } from '../../lib/checklist'
import {
  activeBookings,
  budgetTotals,
  checklistProgress,
  countdownLabel,
  daysUntil,
  eventStage,
  formatEventDate,
  guestTotals,
  missingPieces,
} from '../../lib/events'
import type { ChecklistItem, EventRecord } from '../../lib/events'
import { formatNairaShort } from '../../lib/money'
import { findVenue } from '../../lib/venues'
import { riseIn, softSpring } from '../../motion/variants'
import './next-action.css'

type NextActionBandProps = {
  events: EventRecord[]
}

/**
 * The answer to "what do I do next", which is the question a returning host
 * opens this page with.
 *
 * One event, never a carousel — the nearest thing that needs attention, with
 * where it stands and a single specific action. It is not rendered at all when
 * there are no events: an empty banner is decoration pushing content down.
 */
export function NextActionBand({ events }: NextActionBandProps) {
  const focus = pickFocus(events)
  if (!focus) return null

  const stage = eventStage(focus)
  const days = daysUntil(focus.date)
  const guests = guestTotals(focus.guests)
  const budget = budgetTotals(focus)
  const checklist = checklistProgress(focus)
  const bookings = activeBookings(focus)
  const missing = missingPieces(focus)

  const confirmed = bookings.find((booking) => booking.status === 'confirmed')

  const venueChip = confirmed
    ? `Booked · ${findVenue(confirmed.venueId)?.name ?? 'Venue'}`
    : focus.saved.length > 0
        ? `${focus.saved.length} shortlisted`
        : 'No venue yet'

  const next = nextStep(focus, days)

  return (
    <motion.section className="band" variants={riseIn} aria-label="Next action">
      <div className="band__head">
        <div>
          <p className="band__eyebrow">
            {stage === 'planning' ? 'Still being planned' : 'Coming up next'}
          </p>
          <h2 className="band__name">{focus.name}</h2>
          <p className="band__when">
            {focus.type} · {formatEventDate(focus.date)}
          </p>
        </div>

        <span className="band__countdown">{countdownLabel(focus.date)}</span>
      </div>

      {stage === 'planning' && missing.length > 0 && (
        <p className="band__missing">Still needs {missing.join(' and ')}.</p>
      )}

      <div className="band__chips">
        <span className="band__chip">
          <span className="band__chip-label">Venue</span>
          <span className="band__chip-value">{venueChip}</span>
        </span>
        <span className="band__chip">
          <span className="band__chip-label">Budget</span>
          <span className="band__chip-value">
            {formatNairaShort(budget.spent)} of {formatNairaShort(budget.budget)} planned
          </span>
        </span>
        <span className="band__chip">
          <span className="band__chip-label">Guests</span>
          <span className="band__chip-value">
            {guests.invited === 0
              ? `${focus.guestEstimate} expected`
              : `${guests.headCount} of ${guests.invited} confirmed`}
          </span>
        </span>
      </div>

      <div className="band__footer">
        <div className="band__progress">
          <span className="band__progress-label">
            {checklist.done} of {checklist.total} steps done
          </span>
          <div className="band__meter">
            <motion.div
              className="band__meter-fill"
              initial={{ scaleX: 0 }}
              animate={{
                scaleX: checklist.total ? checklist.done / checklist.total : 0,
              }}
              transition={softSpring}
            />
          </div>
        </div>

        <div className="band__actions">
          {next && (
            <a className="band__cta" href={next.href}>
              {next.label}
            </a>
          )}
          <a className="band__open" href={eventPath(focus.id)}>
            Open event
          </a>
        </div>
      </div>
    </motion.section>
  )
}

/**
 * The event most deserving of the slot: the soonest one still in the future,
 * falling back to whatever is still being planned. Past events never surface —
 * there is no next action on something that already happened.
 */
function pickFocus(events: EventRecord[]): EventRecord | null {
  const live = events.filter((event) => eventStage(event) !== 'past')
  if (live.length === 0) return null

  return [...live].sort((a, b) => {
    const left = daysUntil(a.date)
    const right = daysUntil(b.date)
    if (left === null && right === null) return a.createdISO.localeCompare(b.createdISO)
    if (left === null) return 1
    if (right === null) return -1
    return left - right
  })[0]
}

type Step = { label: string; href: string }

/**
 * One action, phrased as the verb the host would use.
 *
 * Taken from the checklist so there is a single source of truth, then pointed
 * at the tab where the work actually happens — sending someone to a checklist
 * to read "book the venue" is one hop more than they need.
 */
function nextStep(event: EventRecord, days: number | null): Step | null {
  const outstanding = event.checklist.filter((item) => !item.done)
  if (outstanding.length === 0) return null

  // Overdue first, then whatever has the least slack left.
  const sorted = [...outstanding].sort((a, b) => {
    const lateA = isOverdue(a.weeksBefore, days) ? 0 : 1
    const lateB = isOverdue(b.weeksBefore, days) ? 0 : 1
    if (lateA !== lateB) return lateA - lateB
    return b.weeksBefore - a.weeksBefore
  })

  return { label: sorted[0].label, href: destinationFor(sorted[0], event.id) }
}

/** Routes a checklist step to the screen that completes it. */
function destinationFor(item: ChecklistItem, eventId: string): string {
  const label = item.label.toLowerCase()

  if (/venue|hall|space/.test(label)) return '#/venues'
  if (/guest|invit|rsvp|head count|seating/.test(label)) {
    return eventPath(eventId, 'guests')
  }
  if (/budget|balance|deposit|cost|pay/.test(label)) {
    return eventPath(eventId, 'budget')
  }

  return eventPath(eventId, 'checklist')
}
