import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { ChevronLeftIcon, ChevronRightIcon } from './OwnerIcons'
import { OwnerShell } from './OwnerShell'
import { bookingPath, calendarPath, href, setupPath } from './ownerPaths'
import { addDays, formatEventDate, isWeekend, todayISO } from '../../lib/events'
import { formatNairaShort } from '../../lib/money'
import type { OwnerBooking, OwnerVenue } from '../../lib/owner'
import { riseIn, softSpring } from '../../motion/variants'
import { navigate } from '../../router/hashRouter'
import { holdsDate, useOwner } from '../../state/Owner'
import { QuickPicks } from './OwnerFields'

const MONTH_LABEL = new Intl.DateTimeFormat('en-NG', { month: 'long', year: 'numeric' })
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const BLOCK_REASONS = ['Private event', 'Maintenance', 'Booked outside Owambe']

type DayState = 'past' | 'booked' | 'blocked' | 'open'

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Every date between two ISO dates, inclusive, capped at a year. */
function datesBetween(from: string, to: string): string[] {
  const [start, end] = from <= to ? [from, to] : [to, from]
  const dates: string[] = []
  let cursor = start
  while (cursor <= end && dates.length < 366) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return dates
}

type CalendarScreenProps = {
  venueId?: string
}

/**
 * Availability, by venue and by month.
 *
 * The calendar is the owner's half of every host's checkout: a blocked day
 * here is a day hosts cannot pay for. Each open day shows what it would earn,
 * since weekend and weekday rates differ and that is what decides whether a
 * date is worth holding back.
 */
export function CalendarScreen({ venueId }: CalendarScreenProps) {
  const { state, bookings, blockDates, unblockDate, markCalendarChecked } = useOwner()

  useEffect(() => markCalendarChecked(), [markCalendarChecked])

  const venue: OwnerVenue | undefined =
    state.venues.find((entry) => entry.id === venueId) ??
    state.venues.find((entry) => entry.status === 'live') ??
    state.venues[0]

  const today = todayISO()
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selected, setSelected] = useState<string>(today)
  const [reason, setReason] = useState('')
  const [rangeOpen, setRangeOpen] = useState(false)
  const [rangeFrom, setRangeFrom] = useState(today)
  const [rangeTo, setRangeTo] = useState(addDays(today, 2))

  const venueBookings = useMemo(
    () => bookings.filter((booking) => booking.venueId === venue?.id),
    [bookings, venue?.id],
  )

  const byDate = useMemo(() => {
    const map = new Map<string, OwnerBooking[]>()
    for (const booking of venueBookings) {
      if (booking.status === 'cancelled') continue
      map.set(booking.date, [...(map.get(booking.date) ?? []), booking])
    }
    return map
  }, [venueBookings])

  if (!venue) {
    return (
      <OwnerShell section="calendar" pageKey="owner-calendar" title="Calendar">
        <motion.div className="empty" variants={riseIn}>
          <p className="empty__title">No venue yet</p>
          <p className="empty__body">Add a venue and its calendar appears here.</p>
          <div className="empty__action">
            <a className="button-primary" href="#/owner/venues/new">
              Add a venue
            </a>
          </div>
        </motion.div>
      </OwnerShell>
    )
  }

  const blocked = new Map(venue.blocked.map((entry) => [entry.date, entry.reason]))

  function stateOf(date: string): DayState {
    const day = byDate.get(date) ?? []
    if (day.some(holdsDate)) return 'booked'
    if (date < today) return 'past'
    if (blocked.has(date)) return 'blocked'
    return 'open'
  }

  function priceOn(date: string): number {
    if (!venue) return 0
    const base = venue.pricePerDay
    if (isWeekend(date)) return Math.round(base * (1 + venue.weekendPremium / 100))
    return Math.round(base * (1 - venue.weekdayOffer / 100))
  }

  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  // Monday-first: JS getDay() is Sunday = 0.
  const lead = (new Date(cursor.year, cursor.month, 1).getDay() + 6) % 7
  const monthDates = Array.from({ length: daysInMonth }, (_, index) => iso(cursor.year, cursor.month, index + 1))
  const monthLabel = MONTH_LABEL.format(new Date(cursor.year, cursor.month, 1))

  const counts = monthDates.reduce(
    (total, date) => {
      const status = stateOf(date)
      if (status === 'booked') total.booked += 1
      if (status === 'open' && isWeekend(date)) total.openWeekends += 1
      if (status === 'blocked') total.blocked += 1
      return total
    },
    { booked: 0, openWeekends: 0, blocked: 0 },
  )

  function shiftMonth(delta: number): void {
    setCursor((current) => {
      const date = new Date(current.year, current.month + delta, 1)
      return { year: date.getFullYear(), month: date.getMonth() }
    })
  }

  const isCurrentMonth =
    cursor.year === new Date().getFullYear() && cursor.month === new Date().getMonth()

  const selectedState = stateOf(selected)
  const selectedBookings = byDate.get(selected) ?? []

  return (
    <OwnerShell
      section="calendar"
      pageKey="owner-calendar"
      title="Calendar"
      subtitle="Close dates you can’t host, and see every booking at a glance. Hosts can only book days that are open here."
      actions={
        state.venues.length > 1 ? (
          <select
            className="filters__input cal-venue"
            aria-label="Venue"
            value={venue.id}
            onChange={(event) => navigate(calendarPath(event.target.value), true)}
          >
            {state.venues.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name || 'Untitled venue'}
              </option>
            ))}
          </select>
        ) : undefined
      }
    >
      {venue.status === 'draft' && (
        <motion.p className="sample-banner" variants={riseIn}>
          <span>
            <strong>{venue.name || 'This venue'} isn’t live yet.</strong> You can close dates now so
            they’re already blocked when it goes live.
          </span>
          <a className="ghost-button ghost-button--small" href={href(setupPath(venue.id, 'review'))}>
            Finish listing
          </a>
        </motion.p>
      )}

      <motion.div className="cal-layout" variants={riseIn}>
        <section className="card ocal">
          <header className="ocal__head">
            <div className="ocal__nav">
              <button
                type="button"
                className="ocal__arrow"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
                disabled={isCurrentMonth}
              >
                <ChevronLeftIcon />
              </button>
              <h2 className="ocal__month" aria-live="polite">
                {monthLabel}
              </h2>
              <button type="button" className="ocal__arrow" aria-label="Next month" onClick={() => shiftMonth(1)}>
                <ChevronRightIcon />
              </button>
            </div>
            <p className="ocal__summary">
              {counts.booked} booked · {counts.openWeekends} open weekend day{counts.openWeekends === 1 ? '' : 's'} ·{' '}
              {counts.blocked} blocked
            </p>
          </header>

          <div className="ocal__grid" role="grid" aria-label={`${venue.name} availability, ${monthLabel}`}>
            {DOW.map((day) => (
              <span key={day} className="ocal__dow" role="columnheader">
                {day}
              </span>
            ))}
            {Array.from({ length: lead }, (_, index) => (
              <span key={`lead-${index}`} aria-hidden="true" />
            ))}
            {monthDates.map((date) => {
              const status = stateOf(date)
              const day = byDate.get(date) ?? []
              const booked = day.find(holdsDate)
              const isSelected = date === selected
              return (
                <button
                  key={date}
                  type="button"
                  role="gridcell"
                  aria-selected={isSelected}
                  aria-label={`${formatEventDate(date)}: ${STATE_LABEL[status]}`}
                  className={`ocal__day ocal__day--${status}${isSelected ? ' ocal__day--selected' : ''}${date === today ? ' ocal__day--today' : ''}`}
                  onClick={() => setSelected(date)}
                >
                  <span className="ocal__num">{Number(date.slice(8))}</span>
                  <span className="ocal__label">
                    {status === 'booked' && booked
                      ? booked.eventName
                      : status === 'blocked'
                        ? 'Closed'
                        : status === 'open' && venue.pricePerDay
                          ? formatNairaShort(priceOn(date))
                          : ''}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="ocal__legend">
            <span><i className="ocal__key ocal__key--open" /> Open</span>
            <span><i className="ocal__key ocal__key--booked" /> Booked</span>
            <span><i className="ocal__key ocal__key--blocked" /> Closed by you</span>
          </div>
        </section>

        <aside className="card day-panel" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={selected}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <p className="day-panel__eyebrow">{isWeekend(selected) ? 'Weekend' : 'Weekday'}</p>
              <h2 className="day-panel__date">{formatEventDate(selected)}</h2>
              <p className={`day-panel__state day-panel__state--${selectedState}`}>{STATE_LABEL[selectedState]}</p>

              {selectedBookings
                .filter((booking) => booking.status !== 'cancelled')
                .map((booking) => (
                  <a key={booking.id} className="day-panel__booking" href={href(bookingPath(booking.id))}>
                    <span className="day-panel__booking-name">{booking.eventName}</span>
                    <span className="day-panel__booking-meta">
                      {booking.hostName} · {booking.guests.toLocaleString('en-NG')} guests ·{' '}
                      {booking.status}
                    </span>
                  </a>
                ))}

              {selectedState === 'open' && (
                <div className="day-panel__action">
                  {venue.pricePerDay > 0 && (
                    <p className="day-panel__price">
                      Earns <strong>{formatNairaShort(priceOn(selected))}</strong> at your{' '}
                      {isWeekend(selected) ? 'weekend' : 'weekday'} rate
                    </p>
                  )}
                  <label className="filters__label" htmlFor="block-reason">
                    Reason (only you see this)
                  </label>
                  <input
                    id="block-reason"
                    className="filters__input"
                    value={reason}
                    placeholder="Private event"
                    onChange={(event) => setReason(event.target.value)}
                  />
                  <QuickPicks label="Common reasons" options={BLOCK_REASONS} onPick={setReason} />
                  <button
                    type="button"
                    className="button-neutral day-panel__button"
                    onClick={() => {
                      blockDates(venue.id, [selected], reason || 'Closed')
                      setReason('')
                    }}
                  >
                    Close this date
                  </button>
                </div>
              )}

              {selectedState === 'blocked' && (
                <div className="day-panel__action">
                  <p className="day-panel__note">Reason: {blocked.get(selected) || 'Closed'}</p>
                  {venue.blocked.some((entry) => entry.date === selected && entry.locked) ? (
                    <p className="day-panel__note">This date can’t be reopened after a cancellation.</p>
                  ) : (
                    <button
                      type="button"
                      className="button-neutral day-panel__button"
                      onClick={() => unblockDate(venue.id, selected)}
                    >
                      Reopen this date
                    </button>
                  )}
                </div>
              )}

              {selectedState === 'past' && selectedBookings.length === 0 && (
                <p className="day-panel__note">This date has passed.</p>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="day-panel__range">
            <button
              type="button"
              className="day-panel__range-toggle"
              aria-expanded={rangeOpen}
              onClick={() => setRangeOpen((current) => !current)}
            >
              {rangeOpen ? '− ' : '+ '}Close several dates at once
            </button>
            <AnimatePresence initial={false}>
              {rangeOpen && (
                <motion.form
                  className="day-panel__range-form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={softSpring}
                  onSubmit={(event) => {
                    event.preventDefault()
                    const dates = datesBetween(rangeFrom, rangeTo).filter(
                      (date) => date >= today && stateOf(date) !== 'booked',
                    )
                    blockDates(venue.id, dates, reason || 'Closed')
                    setRangeOpen(false)
                  }}
                >
                  <label>
                    <span className="filters__label">From</span>
                    <input
                      className="filters__input"
                      type="date"
                      min={today}
                      value={rangeFrom}
                      onChange={(event) => setRangeFrom(event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="filters__label">To</span>
                    <input
                      className="filters__input"
                      type="date"
                      min={rangeFrom}
                      value={rangeTo}
                      onChange={(event) => setRangeTo(event.target.value)}
                    />
                  </label>
                  <button type="submit" className="button-neutral">
                    Close {datesBetween(rangeFrom, rangeTo).length} days
                  </button>
                  <p className="day-panel__note">Days that are already booked are left as they are.</p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </aside>
      </motion.div>
    </OwnerShell>
  )
}

const STATE_LABEL: Record<DayState, string> = {
  past: 'Past',
  booked: 'Booked',
  blocked: 'Closed — hosts can’t book it',
  open: 'Open for bookings',
}
