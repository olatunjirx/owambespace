import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'

import { Modal } from '../../components/Modal'
import { ChevronLeftIcon, ChevronRightIcon } from '../owner/OwnerIcons'
import { ProviderShell } from './ProviderShell'
import { bookingPath, href, servicesPath } from './providerPaths'
import { addDays, formatEventDate, isWeekend, todayISO } from '../../lib/events'
import { formatNairaShort } from '../../lib/money'
import { fromPrice } from '../../lib/provider'
import { riseIn } from '../../motion/variants'
import { useProvider } from '../../state/Provider'
import { holdsDate } from '../../state/Owner'

type DayState = 'open' | 'booked' | 'full' | 'blocked' | 'past'

const STATE_LABEL: Record<DayState, string> = {
  open: 'Open for bookings',
  booked: 'Booked · still taking more',
  full: 'Fully booked',
  blocked: 'Closed by you',
  past: 'Past date',
}

const REASON_PICKS = ['Private event', 'Holiday', 'Booked outside Owambe']

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTH_LABEL = new Intl.DateTimeFormat('en-NG', { month: 'long', year: 'numeric' })

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * The provider's availability, laid out as Figma's owner Calendar
 * (1129:34812): a month picker with a legend underneath and a day panel
 * beside it. A provider can cover several events on one date, so a day only
 * shuts once it holds as many jobs as they said they can take.
 */
export function ProviderCalendar() {
  const { listing, bookings, blockDates, unblockDate } = useProvider()
  const today = todayISO()
  const [cursor, setCursor] = useState(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() }))
  const [selected, setSelected] = useState(today)
  const [reason, setReason] = useState('')
  const [rangeOpen, setRangeOpen] = useState(false)

  const byDate = new Map<string, typeof bookings>()
  for (const booking of bookings) {
    if (!holdsDate(booking)) continue
    byDate.set(booking.date, [...(byDate.get(booking.date) ?? []), booking])
  }
  const blocked = new Map(listing.blocked.map((entry) => [entry.date, entry]))

  function stateOf(date: string): DayState {
    const held = (byDate.get(date) ?? []).length
    if (date < today) return 'past'
    if (held >= listing.perDay) return 'full'
    if (blocked.has(date)) return 'blocked'
    if (held > 0) return 'booked'
    return 'open'
  }

  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const lead = (new Date(cursor.year, cursor.month, 1).getDay() + 6) % 7
  const monthDates = Array.from({ length: daysInMonth }, (_, index) => iso(cursor.year, cursor.month, index + 1))
  const monthLabel = MONTH_LABEL.format(new Date(cursor.year, cursor.month, 1))
  const isCurrentMonth = cursor.year === new Date().getFullYear() && cursor.month === new Date().getMonth()

  function shiftMonth(delta: number): void {
    setCursor((current) => {
      const date = new Date(current.year, current.month + delta, 1)
      return { year: date.getFullYear(), month: date.getMonth() }
    })
  }

  const selectedState = stateOf(selected)
  const selectedJobs = byDate.get(selected) ?? []
  const selectedBlock = blocked.get(selected)
  const from = fromPrice(listing)
  const canClose = selectedState === 'open' || selectedState === 'booked'

  return (
    <ProviderShell
      section="calendar"
      pageKey="provider-calendar"
      title="Calendar"
      subtitle="Close dates you can’t work, and see every job at a glance. Hosts can only book days that are open here."
      actions={
        <button type="button" className="pbtn-primary" onClick={() => setRangeOpen(true)}>
          Close several dates
        </button>
      }
    >
      {listing.status === 'draft' && (
        <motion.p className="sample-banner" variants={riseIn}>
          <span>
            <strong>Your profile isn’t live yet.</strong> You can close dates now so they’re already blocked when it goes
            live.
          </span>
          <a className="pbutton" href={href(servicesPath('profile'))}>
            Finish profile
          </a>
        </motion.p>
      )}

      <motion.div className="pcal-layout" variants={riseIn}>
        <div>
          <section className="pcal">
            <header className="pcal__head">
              <button
                type="button"
                className="pcal__arrow"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
                disabled={isCurrentMonth}
              >
                <ChevronLeftIcon />
              </button>
              <h2 className="pcal__month" aria-live="polite">
                {monthLabel}
              </h2>
              <button type="button" className="pcal__arrow" aria-label="Next month" onClick={() => shiftMonth(1)}>
                <ChevronRightIcon />
              </button>
            </header>

            <div className="pcal__grid" role="grid" aria-label={`Availability, ${monthLabel}`}>
              {DOW.map((day) => (
                <span key={day} className="pcal__dow" role="columnheader">
                  {day}
                </span>
              ))}
              {Array.from({ length: lead }, (_, index) => (
                <span key={`lead-${index}`} aria-hidden="true" />
              ))}
              {monthDates.map((date) => {
                const status = stateOf(date)
                const isSelected = date === selected
                return (
                  <button
                    key={date}
                    type="button"
                    role="gridcell"
                    aria-selected={isSelected}
                    aria-label={`${formatEventDate(date)}: ${STATE_LABEL[status]}`}
                    className={`pcal__day pcal__day--${status}${isSelected ? ' pcal__day--selected' : ''}${date === today ? ' pcal__day--today' : ''}`}
                    onClick={() => {
                      setSelected(date)
                      setReason('')
                    }}
                  >
                    {Number(date.slice(8))}
                  </button>
                )
              })}
            </div>
          </section>

          <div className="pcal__legend">
            <span>
              <i className="pcal__key pcal__key--past" /> Past date
            </span>
            <span>
              <i className="pcal__key" /> Open
            </span>
            <span>
              <i className="pcal__key pcal__key--blocked" /> Closed by you
            </span>
            <span>
              <i className="pcal__key pcal__key--booked" /> Booked
            </span>
          </div>
        </div>

        <aside className="pday" aria-live="polite">
          <p className="pday__eyebrow">{isWeekend(selected) ? 'Weekend' : 'Weekday'}</p>
          <h2 className="pday__date">{formatEventDate(selected)}</h2>
          <span className={`pday__badge pday__badge--${selectedState}`}>{STATE_LABEL[selectedState]}</span>

          <div className="pday__body">
            {selectedJobs.map((booking) => (
              <a key={booking.id} className="pday__job" href={href(bookingPath(booking.id))}>
                <strong>{booking.eventName}</strong>
                <span>
                  {booking.hostName} · {booking.packageName}
                </span>
              </a>
            ))}

            {canClose && (
              <>
                <p className="pday__note">
                  {listing.perDay > 1
                    ? `You take up to ${listing.perDay} jobs a day — ${listing.perDay - selectedJobs.length} still open.`
                    : 'Hosts can book this date straight away.'}{' '}
                  {from.price > 0 && (
                    <>
                      Packages from <strong>{formatNairaShort(from.price)}</strong> {from.unit}.
                    </>
                  )}
                </p>
                <label className="field">
                  <span className="field__label">Reason (only you see this)</span>
                  <input
                    className="field__control"
                    value={reason}
                    placeholder="e.g. Family event"
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
                <div className="pday__picks">
                  {REASON_PICKS.map((pick) => (
                    <button key={pick} type="button" className="pday__pick" onClick={() => setReason(pick)}>
                      {pick}
                    </button>
                  ))}
                </div>
                <div className="pday__actions">
                  <button
                    type="button"
                    className="pbtn pbtn--block"
                    onClick={() => {
                      blockDates([selected], reason || 'Closed')
                      setReason('')
                    }}
                  >
                    Close this date
                  </button>
                  <button type="button" className="ptext-button" onClick={() => setRangeOpen(true)}>
                    Close several dates at once
                  </button>
                </div>
              </>
            )}

            {selectedState === 'blocked' && selectedBlock && (
              <>
                <p className="pday__note">Reason: {selectedBlock.reason || 'Closed'}</p>
                <div className="pday__actions">
                  <button type="button" className="pbtn pbtn--block" onClick={() => unblockDate(selected)}>
                    Reopen this date
                  </button>
                </div>
              </>
            )}

            {selectedState === 'full' && (
              <p className="pday__note">
                You’ve reached your limit of {listing.perDay} job{listing.perDay === 1 ? '' : 's'} on this date, so hosts
                can’t book it.
              </p>
            )}

            {selectedState === 'past' && selectedJobs.length === 0 && <p className="pday__note">This date has passed.</p>}
          </div>
        </aside>
      </motion.div>

      <RangeModal
        open={rangeOpen}
        onClose={() => setRangeOpen(false)}
        onSubmit={(dates, why) => {
          blockDates(
            dates.filter((date) => {
              const state = stateOf(date)
              return state === 'open' || state === 'booked'
            }),
            why,
          )
          setRangeOpen(false)
        }}
      />
    </ProviderShell>
  )
}

function RangeModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (dates: string[], reason: string) => void
}) {
  const today = todayISO()
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(addDays(today, 6))
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  function submit(event: FormEvent): void {
    event.preventDefault()
    if (!start || !end || end < start) {
      setError('Pick an end date on or after the start date.')
      return
    }
    const dates: string[] = []
    for (let date = start; date <= end && dates.length < 366; date = addDays(date, 1)) dates.push(date)
    onSubmit(dates, reason || 'Closed')
    setError('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Close several dates"
      subtitle="Days that already have jobs keep them."
      footer={
        <>
          <button type="button" className="button-neutral" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="provider-range-form" className="button-primary">
            Close dates
          </button>
        </>
      }
    >
      <form id="provider-range-form" className="modal-form" onSubmit={submit} noValidate>
        <label className="modal-field">
          <span className="filters__label">From</span>
          <input className="filters__input" type="date" min={today} value={start} onChange={(event) => setStart(event.target.value)} />
        </label>
        <label className="modal-field">
          <span className="filters__label">To</span>
          <input className="filters__input" type="date" min={start} value={end} onChange={(event) => setEnd(event.target.value)} />
        </label>
        <label className="modal-field">
          <span className="filters__label">Reason (only you see this)</span>
          <input className="filters__input" value={reason} placeholder="Holiday, renovation…" onChange={(event) => setReason(event.target.value)} />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
