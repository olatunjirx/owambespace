import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { AppShell } from '../host/AppShell'
import { PackageCard } from '../provider/PackageCard'
import { PrimaryButton } from '../../components/Buttons'
import { addDays, formatEventDate, todayISO } from '../../lib/events'
import type { EventRecord } from '../../lib/events'
import { formatNaira } from '../../lib/money'
import { quotePackage, vendorCancellation, vendorDeposit } from '../../lib/vendors'
import type { ServicePackage, Vendor } from '../../lib/vendors'
import { riseIn, softSpring } from '../../motion/variants'
import { navigate } from '../../router/hashRouter'
import { useEvents } from '../../state/Events'
import '../venues/checkout.css'
import '../host/host.css'
import '../provider/provider.css'

type Stage = 'form' | 'done'

/**
 * Booking a provider's package — the venue checkout, for a service.
 *
 * Paying the deposit is the booking: there is no request to accept. That is
 * also the moment chat with the provider opens, never before. No money moves
 * in this build, and the screen says so.
 */
export function HireCheckoutScreen({ event, vendor, pkg }: { event: EventRecord; vendor: Vendor; pkg: ServicePackage }) {
  const { addHire } = useEvents()
  const [date, setDate] = useState(event.date)
  const [guests, setGuests] = useState(String(event.guestEstimate || pkg.minGuests || 100))
  const [stage, setStage] = useState<Stage>('form')
  const [error, setError] = useState('')

  const guestCount = Number(guests.replace(/\D/g, '')) || 0
  const depositPercent = vendorDeposit(vendor)
  const quote = quotePackage(pkg, guestCount, depositPercent)
  const unavailable = Boolean(date && vendor.unavailable?.includes(date))
  const balanceDue = date ? addDays(date, -14) : ''
  const belowMinimum = pkg.priceUnit === 'per guest' && guestCount > 0 && guestCount < pkg.minGuests

  function confirm(): void {
    if (!date) return setError('Pick the date you need them.')
    if (!guestCount) return setError('How many guests are coming?')
    if (vendor.hidden) return setError(`${vendor.name} is not taking new bookings right now.`)
    if (unavailable) return setError(`${vendor.name} is fully booked on that date. Try another day.`)

    addHire(event.id, {
      vendorId: vendor.id,
      vendorName: vendor.name,
      category: vendor.category,
      packageId: pkg.id,
      packageName: pkg.name,
      status: 'confirmed',
      date,
      guests: guestCount,
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
        pageKey="hire-done"
        title={`${vendor.name} is booked`}
        subtitle={`${pkg.name} for ${formatEventDate(date)}.`}
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
          <h2 className="checkout__done-title">{formatNaira(quote.deposit)} deposit taken</h2>
          <p className="checkout__done-body">
            The balance of {formatNaira(quote.balance)} is due by {formatEventDate(balanceDue)}. We’ve added{' '}
            {formatNaira(quote.total)} to this event’s budget. Chat with {vendor.name} is now open on the booking.
          </p>
          <p className="checkout__sim">No payment was actually taken — this build has no payment provider connected.</p>
          <div className="checkout__done-actions">
            <button type="button" className="ghost-button" onClick={() => navigate(`/host/e/${event.id}/vendors`)}>
              See the booking
            </button>
            <button type="button" className="ghost-button" onClick={() => navigate(`/host/e/${event.id}`)}>
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
      pageKey="hire-checkout"
      title={`Book ${vendor.name}`}
      subtitle={
        <>
          {pkg.name} for <strong>{event.name}</strong>
        </>
      }
      actions={
        <a className="ghost-button" href={`#/vendors/${vendor.id}`}>
          Back to packages
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

          {unavailable && <p className="checkout__note checkout__note--warn">{vendor.name} is fully booked on that date.</p>}
          {belowMinimum && (
            <p className="checkout__note">
              This package is priced for at least {pkg.minGuests.toLocaleString('en-NG')} guests, so that’s what you’ll pay
              for.
            </p>
          )}

          <h2 className="checkout__subhead">Your package</h2>
          <PackageCard pkg={pkg} selected />

          <h2 className="checkout__subhead">Cancellation</h2>
          <p className="checkout__policy">{vendorCancellation(vendor)}</p>
        </div>

        <aside className="card checkout__summary">
          <h2 className="card__title">Summary</h2>
          <dl className="checkout__lines">
            <div>
              <dt>
                {pkg.name}
                {pkg.priceUnit === 'per guest' && ` (${formatNaira(pkg.price)} × ${Math.max(guestCount, pkg.minGuests)})`}
              </dt>
              <dd>{formatNaira(quote.total)}</dd>
            </div>
            <div className="checkout__lines-total">
              <dt>Total</dt>
              <dd>{formatNaira(quote.total)}</dd>
            </div>
          </dl>
          <div className="checkout__schedule">
            <div>
              <span>Deposit now ({depositPercent}%)</span>
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
            <PrimaryButton type="button" onClick={confirm}>
              Pay {formatNaira(quote.deposit)} deposit
            </PrimaryButton>
          </div>
          <p className="checkout__sim">Chat with {vendor.name} opens after this payment. Simulated — no payment provider is connected.</p>
        </aside>
      </motion.div>
    </AppShell>
  )
}
