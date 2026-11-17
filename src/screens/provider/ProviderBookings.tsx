import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'

import { Drawer } from '../../components/Drawer'
import { Modal } from '../../components/Modal'
import { BookingChat } from '../owner/BookingChat'
import { bookingCue } from '../owner/BookingRow'
import { tabFor } from '../owner/BookingsScreen'
import type { BookingTab } from '../owner/BookingsScreen'
import { ProviderBookingTable } from './ProviderBookingRow'
import { ProviderShell } from './ProviderShell'
import { EmptyState } from './ProviderHome'
import { bookingPath } from './providerPaths'
import calendarIcon from '../../assets/figma/calendar-2.svg'
import { addDays, daysUntil, formatEventDate } from '../../lib/events'
import { formatNaira } from '../../lib/money'
import {
  CANCEL_LIMITS,
  PLATFORM_FEE_PERCENT,
  amountPaid,
  chatAccess,
  ownerCancellationsThisYear,
  ownerPenalty,
  payoutFor,
  unreadCount,
} from '../../lib/owner'
import { PROVIDER_CANCEL_REASONS, PROVIDER_EMERGENCY } from '../../lib/provider'
import type { ProviderBooking } from '../../lib/provider'
import { riseIn, softSpring } from '../../motion/variants'
import { navigate } from '../../router/hashRouter'
import { useProvider } from '../../state/Provider'
import { isPastOrToday } from '../../state/Owner'
import '../venues/checkout.css'

const TABS: { id: BookingTab; label: string; empty: string }[] = [
  { id: 'upcoming', label: 'Upcoming', empty: 'When a host books one of your packages, it shows up here.' },
  { id: 'past', label: 'Past', empty: 'Jobs you’ve finished will collect here.' },
  { id: 'cancelled', label: 'Cancelled', empty: 'No cancelled bookings.' },
]

const QUICK_REPLIES = [
  'Thank you for booking! Looking forward to it.',
  'Our team will arrive 2 hours before the start.',
  'Let me confirm and come back to you today.',
]

/**
 * Every paid booking, by what it needs — the owner's bookings page with the
 * package in place of the venue. The open booking lives in the URL so a
 * notification can link straight to it and Back closes it.
 */
export function ProviderBookings({ tab: routeTab, bookingId }: { tab?: BookingTab; bookingId?: string }) {
  const { bookings } = useProvider()
  const [query, setQuery] = useState('')

  const open = bookingId ? bookings.find((booking) => booking.id === bookingId) : undefined
  const unread = bookings.reduce((sum, booking) => sum + unreadCount(booking), 0)
  const tab: BookingTab = routeTab ?? (open ? tabFor(open) : 'upcoming')

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const groups: Record<BookingTab, ProviderBooking[]> = { upcoming: [], past: [], cancelled: [] }
    for (const booking of bookings) {
      const haystack = `${booking.eventName} ${booking.hostName} ${booking.packageName}`.toLowerCase()
      if (needle && !haystack.includes(needle)) continue
      groups[tabFor(booking)].push(booking)
    }
    groups.past.reverse()
    groups.cancelled.sort((a, b) => b.createdISO.localeCompare(a.createdISO))
    return groups
  }, [bookings, query])

  const list = grouped[tab]
  const entry = TABS.find((item) => item.id === tab)

  return (
    <ProviderShell
      section="bookings"
      pageKey="provider-bookings"
      title="Bookings"
      subtitle={unread > 0 ? `${unread} new message${unread === 1 ? '' : 's'} from hosts.` : 'Every paid booking for your packages.'}
      actions={
        <a className="button-primary" href="#/provider/calendar">
          Manage availability
        </a>
      }
    >
      <motion.div className="owner-tabs-row" variants={riseIn}>
        <div className="owner-tabs" role="tablist" aria-label="Booking status">
          {TABS.map((item) => {
            const current = item.id === tab
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={current}
                className={`owner-tab${current ? ' owner-tab--current' : ''}`}
                onClick={() => navigate(`/provider/bookings/${item.id}`, true)}
              >
                {current && <motion.span layoutId="provider-tab-pill" className="owner-tab__pill" transition={softSpring} />}
                <span className="owner-tab__label">{item.label}</span>
                <span className="owner-tab__count">{grouped[item.id].length}</span>
              </button>
            )
          })}
        </div>
        <div className="owner-filters">
          <input
            className="filters__input"
            type="search"
            placeholder="Search event or host"
            aria-label="Search bookings"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </motion.div>

      <motion.section className={list.length ? 'card card--flush' : 'psection'} variants={riseIn} key={tab}>
        {list.length === 0 ? (
          <EmptyState
            icon={calendarIcon}
            title={query ? 'Nothing matches' : `No ${entry?.label.toLowerCase()} bookings`}
            body={query ? 'Try a different search.' : (entry?.empty ?? '')}
          />
        ) : (
          <ProviderBookingTable bookings={list} onOpen={(id) => navigate(bookingPath(id))} />
        )}
      </motion.section>

      <ProviderBookingDrawer booking={open} onClose={() => navigate(`/provider/bookings/${tab}`)} />
    </ProviderShell>
  )
}

/**
 * One booking start to finish: what the host booked, what it's worth, and
 * the conversation. It is already paid, so there is nothing to accept;
 * cancelling is the one exit, and it costs at least what going around the
 * platform would save.
 */
function ProviderBookingDrawer({ booking: current, onClose }: { booking: ProviderBooking | undefined; onClose: () => void }) {
  const { listing, bookings, cancelAsProvider, completeBooking, markMessagesRead, sendMessage } = useProvider()
  const lastShown = useRef(current)
  if (current) lastShown.current = current
  const booking = current ?? lastShown.current
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState(PROVIDER_CANCEL_REASONS[0])

  const openId = current?.id
  const unread = current ? unreadCount(current) : 0

  useEffect(() => {
    setConfirming(false)
    setReason(PROVIDER_CANCEL_REASONS[0])
  }, [booking?.id])

  useEffect(() => {
    if (openId && unread > 0) markMessagesRead(openId)
  }, [openId, unread, markMessagesRead])

  if (!booking) return null

  const money = payoutFor(booking.total)
  const cue = bookingCue(booking)
  const canCancel = booking.status === 'confirmed' && !isPastOrToday(booking.date)
  const emergency = reason === PROVIDER_EMERGENCY
  const nextStrike = ownerCancellationsThisYear(bookings) + 1
  const pkg = listing.packages.find((entry) => entry.id === booking.packageId)

  const footer =
    booking.status === 'confirmed' && isPastOrToday(booking.date) ? (
      <button type="button" className="button-primary" onClick={() => completeBooking(booking.id)}>
        Mark job as completed
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
            <span>
              {booking.status === 'confirmed'
                ? 'Booked and paid'
                : booking.status === 'completed'
                  ? 'Completed'
                  : booking.cancellation
                    ? 'Cancelled by you'
                    : 'Cancelled by host'}
            </span>
            <span className="bdrawer__cue">{cue.text}</span>
          </div>

          {booking.source === 'sample' && (
            <p className="bdrawer__sample">This is a sample booking. Everything works, but no real host is waiting on it.</p>
          )}

          {booking.cancellation && (
            <p className="bdrawer__note">
              {booking.cancellation.penalty > 0
                ? `You cancelled: ${booking.cancellation.reason}. ${formatNaira(booking.cancellation.penalty)} comes out of your next payout, and the host was refunded in full.`
                : `Cancelled through support: ${booking.cancellation.reason}. No penalty applied.`}
            </p>
          )}

          <dl className="bdrawer__facts">
            <div>
              <dt>Date</dt>
              <dd>
                {formatEventDate(booking.date)}
                <span>{(daysUntil(booking.date) ?? 0) >= 0 ? `In ${daysUntil(booking.date)} days` : 'Past'}</span>
              </dd>
            </div>
            <div>
              <dt>Package</dt>
              <dd>
                {booking.packageName}
                {pkg && pkg.includes.length > 0 && <span>{pkg.includes.join(', ')}</span>}
              </dd>
            </div>
            <div>
              <dt>Guests</dt>
              <dd>{booking.guests.toLocaleString('en-NG')}</dd>
            </div>
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
                <dt>
                  {booking.balancePaid
                    ? 'Balance (paid, held in escrow)'
                    : `Balance, due by ${formatEventDate(addDays(booking.date, -14))}`}
                </dt>
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
        subtitle={`${booking.hostName} has paid and is relying on you, so this should be a last resort.`}
        footer={
          <>
            <button type="button" className="button-neutral" onClick={() => setConfirming(false)}>
              Keep booking
            </button>
            {emergency ? (
              <a className="button-primary" href="#/provider/help">
                Contact support
              </a>
            ) : (
              <button
                type="button"
                className="button-primary button-primary--danger"
                onClick={() => {
                  cancelAsProvider(booking.id, reason)
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
          {PROVIDER_CANCEL_REASONS.map((option) => (
            <label key={option} className="decline__option">
              <input type="radio" name="cancel-reason" checked={reason === option} onChange={() => setReason(option)} />
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
                <dd>{formatNaira(ownerPenalty(booking.total))}</dd>
              </div>
            </dl>
            <p className="modal-copy cancel-terms__note">
              {nextStrike < CANCEL_LIMITS.rankingDropAfter
                ? 'A second cancellation in 12 months lowers your ranking, and a third suspends your profile.'
                : nextStrike < CANCEL_LIMITS.suspendAfter
                  ? 'This is your second cancellation in 12 months, so your ranking will drop. A third suspends your profile.'
                  : `This is cancellation number ${nextStrike} in 12 months, so your profile will be suspended.`}
            </p>
          </>
        )}
      </Modal>
    </>
  )
}
