import { useState } from 'react'
import { motion } from 'framer-motion'

import { EventShell } from './EventShell'
import { FlyerCover } from './FlyerCover'
import { SuggestedTeam } from './SuggestedTeam'
import { dueLabel, isOverdue } from '../../lib/checklist'
import {
  activeBookings,
  budgetTotals,
  checklistProgress,
  daysUntil,
  guestTotals,
  todayISO,
} from '../../lib/events'
import type { EventRecord } from '../../lib/events'
import { formatNaira, formatNairaShort } from '../../lib/money'
import { findVenue } from '../../lib/venues'
import { riseIn, softSpring } from '../../motion/variants'
import { useEvents } from '../../state/Events'
import './overview.css'
import './host.css'

type OverviewScreenProps = {
  event: EventRecord
}

/**
 * Where one event stands, in a screen.
 *
 * Each tile links to the section that changes it, so this stays a summary and
 * never grows its own editing controls — except the date, which has nowhere
 * else sensible to live.
 */
export function OverviewScreen({ event }: OverviewScreenProps) {
  const { updateEvent } = useEvents()
  const [editingDate, setEditingDate] = useState(false)

  const guests = guestTotals(event.guests)
  const budget = budgetTotals(event)
  const checklist = checklistProgress(event)
  const bookings = activeBookings(event)
  const days = daysUntil(event.date)

  const confirmed = bookings.find((booking) => booking.status === 'confirmed')
  const venueLabel = confirmed
    ? 'Booked'
    : event.saved.length > 0
        ? `${event.saved.length} saved`
        : 'None yet'

  // The next few things to do, taken straight from the checklist rather than
  // invented separately — one list, one source of truth.
  const upNext = [...event.checklist]
    .filter((item) => !item.done)
    .sort((a, b) => b.weeksBefore - a.weeksBefore)
    .slice(0, 4)

  return (
    <EventShell
      event={event}
      tab="overview"
      title="Overview"
      subtitle={`${checklist.done} of ${checklist.total} checklist steps done.`}
      actions={
        <>
          {editingDate ? (
            <input
              className="filters__input overview__date-input"
              type="date"
              min={todayISO()}
              value={event.date}
              autoFocus
              aria-label="Event date"
              onChange={(changed) => updateEvent(event.id, { date: changed.target.value })}
              onBlur={() => setEditingDate(false)}
              onKeyDown={(changed) => {
                if (changed.key === 'Enter' || changed.key === 'Escape') {
                  setEditingDate(false)
                }
              }}
            />
          ) : (
            <button
              type="button"
              className="ghost-button"
              onClick={() => setEditingDate(true)}
            >
              {event.date ? 'Change date' : 'Set date'}
            </button>
          )}
          <a className="ghost-button" href={`#/host/e/${event.id}/runsheet`}>
            Run sheet
          </a>
        </>
      }
    >
      <FlyerCover event={event} />

      <motion.div className="stat-grid stat-grid--four" variants={riseIn}>
        <a className="stat" href={`#/host/e/${event.id}/checklist`}>
          <span className="stat__label">Checklist</span>
          <span className="stat__value">
            {checklist.done}
            <span className="overview__of">/{checklist.total}</span>
          </span>
          <span className="stat__meta">
            {checklist.total - checklist.done} still to do
          </span>
          <div className="meter">
            <motion.div
              className="meter__fill"
              initial={{ scaleX: 0 }}
              animate={{
                scaleX: checklist.total ? checklist.done / checklist.total : 0,
              }}
              transition={softSpring}
            />
          </div>
        </a>

        <a className="stat" href={`#/host/e/${event.id}/venues`}>
          <span className="stat__label">Venue</span>
          <span className="stat__value overview__value--text">{venueLabel}</span>
          <span className="stat__meta">
            {confirmed
              ? findVenue(confirmed.venueId)?.name
              : 'Browse and save the ones you like'}
          </span>
        </a>

        <a className="stat" href={`#/host/e/${event.id}/guests`}>
          <span className="stat__label">Guests</span>
          <span className="stat__value">{guests.headCount}</span>
          <span className="stat__meta">
            {guests.invited === 0
              ? `${event.guestEstimate} expected`
              : `${guests.coming} coming · ${guests.awaiting} awaiting`}
          </span>
        </a>

        <a className="stat" href={`#/host/e/${event.id}/budget`}>
          <span className="stat__label">Budget left</span>
          <span className="stat__value">{formatNairaShort(budget.remaining)}</span>
          <span className="stat__meta">
            {formatNairaShort(budget.spent)} planned of {formatNairaShort(budget.budget)}
          </span>
          <div className="meter">
            <motion.div
              className="meter__fill"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: budget.ratio }}
              transition={softSpring}
              style={{
                background:
                  budget.remaining < 0 ? 'var(--danger)' : 'var(--primary-base)',
              }}
            />
          </div>
        </a>
      </motion.div>

      {budget.over > 0 && (
        <motion.p className="overview__warning" variants={riseIn} role="status">
          Your expenses come to {formatNaira(budget.over)} more than the
          budget for this event.
        </motion.p>
      )}

      <SuggestedTeam event={event} />

      <motion.div className="split" variants={riseIn}>
        <section className="card">
          <div className="card__header">
            <div>
              <h2 className="card__title">Up next</h2>
              <p className="card__hint">The longest lead times first.</p>
            </div>
            <a
              className="ghost-button ghost-button--small"
              href={`#/host/e/${event.id}/checklist`}
            >
              Full checklist
            </a>
          </div>

          {upNext.length === 0 ? (
            <p className="overview__blank">
              Everything on the checklist is done. Enjoy the run-up.
            </p>
          ) : (
            <ul className="overview__next">
              {upNext.map((item, index) => {
                const late = isOverdue(item.weeksBefore, days)
                return (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                  >
                    <span className="overview__next-text">
                      <span className="overview__next-label">{item.label}</span>
                      <span className="overview__next-note">{item.note}</span>
                    </span>
                    <span className={`tag ${late ? 'tag--danger' : 'tag--accent'}`}>
                      {dueLabel(item.weeksBefore, days)}
                    </span>
                  </motion.li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card__header">
            <div>
              <h2 className="card__title">Venues</h2>
              <p className="card__hint">
                {bookings.length > 0 ? 'Booked and requested' : 'Saved for later'}
              </p>
            </div>
            <a className="ghost-button ghost-button--small" href="#/venues">
              Browse
            </a>
          </div>

          {bookings.length === 0 && event.saved.length === 0 ? (
            <p className="overview__blank">
              Nothing yet. Venues you save or book show up here.
            </p>
          ) : (
            <ul className="overview__list">
              {bookings.map((booking) => {
                const venue = findVenue(booking.venueId)
                if (!venue) return null
                return (
                  <li key={booking.id}>
                    <span className="overview__row-main">
                      <span className="overview__row-title">{venue.name}</span>
                      <span className="overview__row-meta">
                        {formatNaira(booking.total)} · {booking.guests} guests
                      </span>
                    </span>
                    <span className="tag tag--good">Booked</span>
                  </li>
                )
              })}

              {event.saved.map((venueId) => {
                const venue = findVenue(venueId)
                if (!venue) return null
                return (
                  <li key={venueId}>
                    <span className="overview__row-main">
                      <span className="overview__row-title">{venue.name}</span>
                      <span className="overview__row-meta">
                        {venue.area} · {formatNairaShort(venue.pricePerDay)} a day
                      </span>
                    </span>
                    <span className="tag tag--accent">Saved</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </motion.div>
    </EventShell>
  )
}
