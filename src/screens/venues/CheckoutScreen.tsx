import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { AppShell } from '../host/AppShell'
import { PrimaryButton } from '../../components/Buttons'
import { addDays, formatEventDate, isWeekend, todayISO } from '../../lib/events'
import type { EventRecord } from '../../lib/events'
import { formatNaira } from '../../lib/money'
import { isPerGuest, quoteFor } from '../../lib/venues'
import type { Venue } from '../../lib/venues'
import { riseIn, softSpring } from '../../motion/variants'
import { navigate } from '../../router/hashRouter'
import { useEvents } from '../../state/Events'
import './checkout.css'
import '../host/host.css'

type CheckoutScreenProps = {
  event: EventRecord
  venue: Venue
}

type Stage = 'form' | 'done'

/**
 * Checkout.
 *
 * No money actually moves here — there is no payment provider wired up — so
 * the screen is honest about that and stops at a confirmed booking with the
 * deposit schedule laid out. The quote arithmetic is real.
 */
export function CheckoutScreen({ event, venue }: CheckoutScreenProps) {
  const { addBooking } = useEvents()

  const [date, setDate] = useState(event.date)
  const [guests, setGuests] = useState(String(event.guestEstimate || venue.capacity))
  const [addOns, setAddOns] = useState<string[]>([])
  const [stage, setStage] = useState<Stage>('form')
  const [error, setError] = useState('')

  const guestCount = Number(guests.replace(/\D/g, '')) || 0
  const overCapacity = guestCount > venue.capacity
  const weekend = isWeekend(date)

  const quote = quoteFor(venue, { weekend, guests: guestCount, addOns })
  // Blocked by the owner, or already held by another booking.
  const unavailable = Boolean(date && venue.unavailable?.includes(date))
  const balanceDue = date ? addDays(date, -14) : ''

  function toggleAddOn(name: string): void {
    setAddOns((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    )
  }

  function handleConfirm(): void {
    if (!date) {
      setError('Pick the date you want to book.')
      return
    }
    if (!guestCount) {
      setError('How many guests are coming?')
      return
    }
    if (overCapacity) {
      setError(`This venue seats ${venue.capacity}. Reduce the number or pick a bigger space.`)
      return
    }
    if (venue.hidden) {
      setError(`${venue.name} is not taking new bookings right now.`)
      return
    }
    if (unavailable) {
      setError(`${venue.name} is not available on that date. Try another day.`)
      return
    }

    addBooking(event.id, {
      venueId: venue.id,
      status: 'confirmed',
      date,
      guests: guestCount,
      addOns,
      total: quote.total,
      deposit: quote.deposit,
      balanceDueISO: balanceDue,
      createdISO: new Date().toISOString(),
    })

    setError('')
    setStage('done')
  }

  if (stage === 'done') {
    return (
      <AppShell
        section="explore"
        pageKey="checkout-done"
        title="Your venue is booked"
        subtitle={`${venue.name} is held for ${formatEventDate(date)}.`}
      >
        <motion.div className="card checkout__done" variants={riseIn}>
          <motion.span
            className="checkout__check"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...softSpring, delay: 0.1 }}
          >
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
              <motion.path
                d="M5 13.4L10.6 19L21 7.5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.45, delay: 0.25, ease: 'easeOut' }}
              />
            </svg>
          </motion.span>

          <h2 className="checkout__done-title">
            {formatNaira(quote.deposit)} deposit taken
          </h2>
          <p className="checkout__done-body">
            The balance of {formatNaira(quote.balance)} is due by{' '}
            {formatEventDate(balanceDue)}. We have added the full{' '}
            {formatNaira(quote.total)} to this event&rsquo;s budget as a venue line. The address, Event Day
            Guide and chat with the venue are now on your booking.
          </p>

          <p className="checkout__sim">
            No payment was actually taken — this build has no payment provider
            connected.
          </p>

          <div className="checkout__done-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => navigate(`/host/e/${event.id}/venues`)}
            >
              See the booking
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => navigate(`/host/e/${event.id}`)}
            >
              Back to the event
            </button>
          </div>
        </motion.div>
      </AppShell>
    )
  }

  return (
    <AppShell
      section="explore"
      pageKey="checkout"
      title="Book this venue"
      subtitle={
        <>
          {venue.name} for <strong>{event.name}</strong>
        </>
      }
      actions={
        <a className="ghost-button" href={`#/venues/${venue.id}`}>
          Back to venue
        </a>
      }
    >
      <motion.div className="checkout" variants={riseIn}>
        <div className="card checkout__form">
          <div className="checkout__row">
            <label className="checkout__field">
              <span className="filters__label">Date</span>
              <input
                className="filters__input"
                type="date"
                min={todayISO()}
                value={date}
                onChange={(changed) => {
                  setDate(changed.target.value)
                  setError('')
                }}
              />
            </label>

            <label className="checkout__field">
              <span className="filters__label">Guests</span>
              <input
                className="filters__input"
                inputMode="numeric"
                value={guests}
                onChange={(changed) => {
                  setGuests(changed.target.value)
                  setError('')
                }}
              />
            </label>
          </div>

          {unavailable && (
            <p className="checkout__note checkout__note--warn">
              {venue.name} is already booked or closed on that date.
            </p>
          )}

          {!weekend && quote.discount > 0 && (
            <p className="checkout__note">
              Weekday offer: {venue.weekdayOffer}% off the venue hire on this date.
            </p>
          )}

          {weekend && (
            <p className="checkout__note">
              That is a weekend, so the {venue.weekendPremium}% weekend rate applies.
            </p>
          )}

          {overCapacity && (
            <p className="checkout__note checkout__note--warn">
              {venue.name} seats {venue.capacity.toLocaleString('en-NG')}. You have
              entered {guestCount.toLocaleString('en-NG')}.
            </p>
          )}

          {venue.inHouse.length > 0 && (
            <>
              <h2 className="checkout__subhead">Add in-house services</h2>
              <ul className="checkout__addons">
                {venue.inHouse.map((service) => {
                  const on = addOns.includes(service.name)
                  const perHead = isPerGuest(service)
                  return (
                    <li key={service.name}>
                      <label className="checkout__addon">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleAddOn(service.name)}
                        />
                        <span className="checkout__addon-name">{service.name}</span>
                        <span className="checkout__addon-price">
                          {formatNaira(perHead ? service.price * guestCount : service.price)}
                          {perHead && (
                            <span className="checkout__addon-unit">
                              {formatNaira(service.price)} × {guestCount}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          <h2 className="checkout__subhead">Cancellation</h2>
          <p className="checkout__policy">{venue.policies.cancellation}</p>
        </div>

        <aside className="card checkout__summary">
          <h2 className="card__title">Summary</h2>

          <dl className="checkout__lines">
            <div>
              <dt>Venue hire</dt>
              <dd>{formatNaira(quote.base)}</dd>
            </div>
            {quote.discount > 0 && (
              <div>
                <dt>Weekday offer ({venue.weekdayOffer}%)</dt>
                <dd>−{formatNaira(quote.discount)}</dd>
              </div>
            )}
            {quote.weekendPremium > 0 && (
              <div>
                <dt>Weekend rate ({venue.weekendPremium}%)</dt>
                <dd>{formatNaira(quote.weekendPremium)}</dd>
              </div>
            )}
            {quote.addOns > 0 && (
              <div>
                <dt>In-house services</dt>
                <dd>{formatNaira(quote.addOns)}</dd>
              </div>
            )}
            <div className="checkout__lines-total">
              <dt>Total</dt>
              <dd>{formatNaira(quote.total)}</dd>
            </div>
          </dl>

          <div className="checkout__schedule">
            <div>
              <span>Deposit now ({venue.depositPercent}%)</span>
              <strong>{formatNaira(quote.deposit)}</strong>
            </div>
            <div>
              <span>Balance {balanceDue ? `by ${formatEventDate(balanceDue)}` : 'later'}</span>
              <strong>{formatNaira(quote.balance)}</strong>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {error && (
              <motion.p
                className="form-error"
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="checkout__confirm">
            <PrimaryButton type="button" onClick={handleConfirm}>
              Pay {formatNaira(quote.deposit)} deposit
            </PrimaryButton>
          </div>

          <p className="checkout__sim">
            Simulated — no payment provider is connected in this build.
          </p>
        </aside>
      </motion.div>
    </AppShell>
  )
}
