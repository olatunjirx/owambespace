import { useEffect, useRef, useState } from 'react'

import { Drawer } from '../../components/Drawer'
import { Modal } from '../../components/Modal'
import { BookingChat } from './BookingChat'
import { bookingCue } from './BookingRow'
import { href, setupPath } from './ownerPaths'
import { addDays, formatEventDate, isWeekend } from '../../lib/events'
import { formatNaira } from '../../lib/money'
import {
  CANCEL_LIMITS,
  EMERGENCY_REASON,
  OWNER_CANCEL_REASONS,
  PLATFORM_FEE_PERCENT,
  amountPaid,
  chatAccess,
  isGuideComplete,
  ownerCancellationsThisYear,
  ownerPenalty,
  payoutFor,
  phoneReleaseDate,
  phoneVisible,
  unreadCount,
} from '../../lib/owner'
import type { OwnerBooking } from '../../lib/owner'
import { isPastOrToday, useOwner } from '../../state/Owner'
import '../venues/checkout.css'

const QUICK_REPLIES = [
  'Yes, that works for us.',
  'The gate and parking details are in your Event Day Guide.',
  'Let me confirm and come back to you today.',
]

type BookingDrawerProps = {
  booking: OwnerBooking | undefined
  onClose: () => void
}

/**
 * One booking, start to finish: what the host booked, what it is worth, and
 * the conversation. Every booking here is already paid, so there is nothing to
 * accept. Cancelling is the one exit, and it costs the owner at least what
 * going around the platform would save.
 */
export function BookingDrawer({ booking: current, onClose }: BookingDrawerProps) {
  const { state, bookings, cancelAsOwner, completeBooking, markMessagesRead, sendMessage } = useOwner()
  // Holds the last booking shown, so the panel keeps its content while it
  // slides out after the route has already dropped the id.
  const lastShown = useRef(current)
  if (current) lastShown.current = current
  const booking = current ?? lastShown.current
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState(OWNER_CANCEL_REASONS[0])

  const venue = booking ? state.venues.find((entry) => entry.id === booking.venueId) : undefined
  const openId = current?.id
  const unread = current ? unreadCount(current) : 0

  useEffect(() => {
    setConfirming(false)
    setReason(OWNER_CANCEL_REASONS[0])
  }, [booking?.id])

  // Opening the booking is what counts as reading it.
  useEffect(() => {
    if (openId && unread > 0) markMessagesRead(openId)
  }, [openId, unread, markMessagesRead])

  if (!booking) return null

  const money = payoutFor(booking.total)
  const balanceDue = addDays(booking.date, -14)
  const cue = bookingCue(booking)
  const canCancel = booking.status === 'confirmed' && !isPastOrToday(booking.date)
  const penalty = ownerPenalty(booking.total)
  const emergency = reason === EMERGENCY_REASON
  const nextStrike = ownerCancellationsThisYear(bookings) + 1

  const footer =
    booking.status === 'confirmed' && isPastOrToday(booking.date) ? (
      <button type="button" className="button-primary" onClick={() => completeBooking(booking.id)}>
        Mark event as completed
      </button>
    ) : canCancel ? (
      <button type="button" className="ghost-button ghost-button--danger" onClick={() => setConfirming(true)}>
        Cancel booking
      </button>
    ) : undefined

  return (
    <>
      <Drawer
        open={Boolean(current)}
        onClose={onClose}
        title={booking.eventName}
        subtitle={`${booking.hostName} · ${booking.eventType}`}
        footer={footer}
      >
        <div className="bdrawer">
          <div className={`bdrawer__status bdrawer__status--${cue.tone}`}>
            <span>{statusLine(booking)}</span>
            <span className="bdrawer__cue">{cue.text}</span>
          </div>

          {booking.source === 'sample' && (
            <p className="bdrawer__sample">
              This is a sample booking. Everything works, but no real host is waiting on it.
            </p>
          )}

          {booking.cancellation && (
            <p className="bdrawer__note">
              {booking.cancellation.penalty > 0
                ? `You cancelled: ${booking.cancellation.reason}. ${formatNaira(booking.cancellation.penalty)} comes out of your next payout, and the host was refunded in full.`
                : `Cancelled through support: ${booking.cancellation.reason}. No penalty applied, and the host was refunded in full.`}
            </p>
          )}

          <dl className="bdrawer__facts">
            <div>
              <dt>Date</dt>
              <dd>
                {formatEventDate(booking.date)}
                <span>{isWeekend(booking.date) ? 'Weekend rate' : 'Weekday'}</span>
              </dd>
            </div>
            <div>
              <dt>Venue</dt>
              <dd>{venue?.name ?? 'Venue removed'}</dd>
            </div>
            <div>
              <dt>Guests</dt>
              <dd>{booking.guests.toLocaleString('en-NG')}</dd>
            </div>
            {booking.addOns.length > 0 && (
              <div>
                <dt>Extras</dt>
                <dd>{booking.addOns.join(', ')}</dd>
              </div>
            )}
          </dl>

          <section className="bdrawer__money">
            <h3 className="section-title">Money</h3>
            <dl className="checkout__lines bdrawer__lines">
              <div>
                <dt>Booking total</dt>
                <dd>{formatNaira(booking.total)}</dd>
              </div>
              <div>
                <dt>Deposit (held in escrow)</dt>
                <dd>{formatNaira(booking.deposit)}</dd>
              </div>
              <div>
                <dt>{booking.balancePaid ? 'Balance (paid, held in escrow)' : `Balance, due by ${formatEventDate(balanceDue)}`}</dt>
                <dd>{formatNaira(booking.total - booking.deposit)}</dd>
              </div>
              <div>
                <dt>Owambe Space fee ({PLATFORM_FEE_PERCENT}%)</dt>
                <dd>−{formatNaira(money.fee)}</dd>
              </div>
              <div className="checkout__lines-total">
                <dt>You receive</dt>
                <dd>{formatNaira(money.net)}</dd>
              </div>
            </dl>
            <p className="bdrawer__hint">
              {booking.status === 'completed'
                ? 'Released to your earnings balance.'
                : booking.status === 'cancelled'
                  ? 'Nothing is paid out on a cancelled booking.'
                  : 'Paid to your account 24 hours after the event ends.'}
            </p>
          </section>

          {booking.status === 'confirmed' && venue && (
            <section className="bdrawer__eventday">
              <h3 className="section-title">Shared with the host</h3>
              {isGuideComplete(venue) ? (
                <p className="bdrawer__hint">
                  They can see your exact address and Event Day Guide.{' '}
                  {phoneVisible(booking.date, booking.balancePaid)
                    ? 'Your event-day number is now visible to them.'
                    : `Your event-day number appears from ${formatEventDate(phoneReleaseDate(booking.date))}, once the balance is paid.`}
                </p>
              ) : (
                <p className="bdrawer__hint">
                  Your Event Day Guide isn’t finished, so the host is missing arrival and parking details.{' '}
                  <a href={href(setupPath(venue.id, 'eventday'))}>Finish it</a>
                </p>
              )}
            </section>
          )}

          <BookingChat
            key={booking.id}
            viewer="owner"
            otherName={booking.hostName}
            messages={booking.messages}
            access={chatAccess(booking.status, booking.date)}
            quickReplies={QUICK_REPLIES}
            onSend={(text) => sendMessage(booking.id, text)}
          />
        </div>
      </Drawer>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Cancel this booking?"
        subtitle={`${booking.hostName} is relying on this date, so this should be a last resort.`}
        footer={
          <>
            <button type="button" className="button-neutral" onClick={() => setConfirming(false)}>
              Keep booking
            </button>
            {emergency ? (
              <a className="button-primary" href={href('/owner/help')}>
                Contact support
              </a>
            ) : (
              <button
                type="button"
                className="button-primary button-primary--danger"
                onClick={() => {
                  cancelAsOwner(booking.id, reason)
                  setConfirming(false)
                }}
              >
                Cancel and accept penalty
              </button>
            )}
          </>
        }
      >
        <fieldset className="decline">
          <legend className="filters__label">Why are you cancelling?</legend>
          {OWNER_CANCEL_REASONS.map((option) => (
            <label key={option} className="decline__option">
              <input
                type="radio"
                name="cancel-reason"
                checked={reason === option}
                onChange={() => setReason(option)}
              />
              {option}
            </label>
          ))}
        </fieldset>

        {emergency ? (
          <p className="modal-copy cancel-terms__note">
            Emergencies are handled by support. Once it’s confirmed, the host is refunded and no penalty applies to you.
          </p>
        ) : (
          <>
            <dl className="checkout__lines cancel-terms">
              <div>
                <dt>Refund to {booking.hostName.split(' ')[0]}</dt>
                <dd>{formatNaira(amountPaid(booking))}</dd>
              </div>
              <div className="checkout__lines-total">
                <dt>Penalty from your next payout</dt>
                <dd>{formatNaira(penalty)}</dd>
              </div>
            </dl>
            <p className="modal-copy cancel-terms__note">
              {formatEventDate(booking.date)} stays closed and can’t be reopened. {strikeCopy(nextStrike)}
            </p>
          </>
        )}
      </Modal>
    </>
  )
}

function strikeCopy(next: number): string {
  if (next < CANCEL_LIMITS.rankingDropAfter) {
    return 'A second cancellation in 12 months lowers your ranking, and a third suspends your listing.'
  }
  if (next < CANCEL_LIMITS.suspendAfter) {
    return 'This is your second cancellation in 12 months, so your ranking will drop. A third suspends your listing.'
  }
  return `This is cancellation number ${next} in 12 months, so your listing will be suspended.`
}

function statusLine(booking: OwnerBooking): string {
  switch (booking.status) {
    case 'confirmed':
      return 'Booked and paid'
    case 'completed':
      return 'Completed'
    default:
      return booking.cancellation ? 'Cancelled by you' : 'Cancelled by host'
  }
}
