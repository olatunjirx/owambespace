import { AnimatePresence, motion } from 'framer-motion'

import { BookingRow } from './BookingRow'
import { StatusTag, VenueThumb } from './ListingPreview'
import { ArrowRightIcon, CheckIcon, ShieldIcon, WalletIcon } from './OwnerIcons'
import { OwnerShell } from './OwnerShell'
import { href, setupPath, venuePath } from './ownerPaths'
import { daysUntil } from '../../lib/events'
import { formatNaira, formatNairaShort } from '../../lib/money'
import { SETUP_STEPS, earningsSummary, listingProgress, stepGaps, unreadCount } from '../../lib/owner'
import { riseIn, softSpring } from '../../motion/variants'
import { navigate } from '../../router/hashRouter'
import { useOwner } from '../../state/Owner'
import { useProfile } from '../../state/Profile'

const CALENDAR_REMINDER_DAYS = 14

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Where an owner lands every day.
 *
 * It answers one question first — what needs me now? — and only then shows
 * the numbers. Before anything is live, that answer is "finish your listing",
 * so the setup card takes the top of the page and the empty stat tiles wait.
 */
export function OwnerHome() {
  const { profile } = useProfile()
  const { state, bookings, clearSamples, dismissNotice } = useOwner()
  const firstName = profile.displayName.trim().split(' ')[0]

  const unfinished = state.venues.filter((venue) => venue.status === 'draft')
  const inReview = state.venues.filter((venue) => venue.status === 'review')
  const hasLive = state.venues.some((venue) => venue.status === 'live' || venue.status === 'paused')

  const withUnread = bookings.filter((booking) => unreadCount(booking) > 0)
  const unread = withUnread.reduce((sum, booking) => sum + unreadCount(booking), 0)
  const upcoming = bookings.filter(
    (booking) => booking.status === 'confirmed' && (daysUntil(booking.date) ?? -1) >= 0,
  )
  const needsCompleting = bookings.filter(
    (booking) => booking.status === 'confirmed' && (daysUntil(booking.date) ?? 0) < 0,
  )
  const money = earningsSummary(bookings, state.payouts)
  const hasSamples = bookings.some((booking) => booking.source === 'sample')

  const payoutReady = Boolean(state.payoutAccount) && state.verification.status === 'verified'

  // Every open date can be booked without asking, so a stale calendar costs.
  const calendarStale =
    hasLive &&
    (!state.calendarCheckedISO ||
      Date.now() - new Date(state.calendarCheckedISO).getTime() > CALENDAR_REMINDER_DAYS * 86_400_000)

  const subtitle = !hasLive
    ? state.venues.length === 0
      ? 'Add your venue to start taking bookings.'
      : inReview.length > 0 && unfinished.length === 0
        ? 'Your listing is being checked. We’ll let you know the moment it’s live.'
        : 'Finish your listing to start taking bookings.'
    : unread > 0
      ? `You have ${unread} new message${unread === 1 ? '' : 's'} from hosts.`
      : upcoming.length > 0
        ? `Nothing needs you right now. Next up: ${upcoming[0].eventName}.`
        : 'You’re all caught up.'

  return (
    <OwnerShell
      section="home"
      pageKey="owner-home"
      title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
      subtitle={subtitle}
      actions={
        hasLive ? (
          <a className="button-primary" href="#/owner/calendar">
            Manage availability
          </a>
        ) : undefined
      }
    >
      <AnimatePresence initial={false}>
        {state.notices.slice(0, 2).map((notice) => (
          <motion.div
            key={notice.id}
            className="notice"
            layout
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: -24 }}
            transition={softSpring}
          >
            <span className="notice__icon" aria-hidden="true">
              <CheckIcon size={14} />
            </span>
            <p className="notice__text">{notice.text}</p>
            {notice.href && (
              <a
                className="notice__link"
                href={href(notice.href)}
                onClick={() => dismissNotice(notice.id)}
              >
                View
              </a>
            )}
            <button
              type="button"
              className="notice__close"
              aria-label="Dismiss"
              onClick={() => dismissNotice(notice.id)}
            >
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {state.venues.length === 0 && (
        <motion.section className="setup-card" variants={riseIn}>
          <div className="setup-card__text">
            <h2 className="setup-card__title">List your first venue</h2>
            <p className="setup-card__body">
              Nine short steps, about fifteen minutes. Nothing goes live until you submit.
            </p>
          </div>
          <a className="button-primary" href="#/owner/venues/new">
            Add a venue
          </a>
        </motion.section>
      )}

      {unfinished.map((venue) => {
        const progress = listingProgress(venue)
        const percent = Math.round((progress.done / progress.total) * 100)
        return (
          <motion.section key={venue.id} className="setup-card" variants={riseIn}>
            <div className="setup-card__top">
              <VenueThumb venue={venue} size={52} />
              <div className="setup-card__text">
                <p className="setup-card__eyebrow">Finish your listing</p>
                <h2 className="setup-card__title">{venue.name || 'Your venue'}</h2>
                <p className="setup-card__body">
                  {progress.done} of {progress.total} sections done.{' '}
                  {progress.done === progress.total
                    ? 'Everything is in — review and submit it.'
                    : `Next: ${SETUP_STEPS.find((step) => step.id === progress.nextStep)?.label.toLowerCase()}.`}
                </p>
              </div>
              <button
                type="button"
                className="button-primary"
                onClick={() => navigate(setupPath(venue.id, progress.nextStep))}
              >
                {progress.done === 0 ? 'Start setup' : progress.done === progress.total ? 'Review & submit' : 'Continue setup'}
              </button>
            </div>

            <div className="meter" aria-hidden="true">
              <motion.div
                className="meter__fill"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: percent / 100 }}
                transition={{ ...softSpring, delay: 0.2 }}
              />
            </div>

            <ol className="setup-card__steps">
              {SETUP_STEPS.filter((step) => step.id !== 'review').map((step) => {
                const done = stepGaps(venue, step.id).length === 0
                return (
                  <li key={step.id}>
                    <a
                      className={`setup-card__step${done ? ' setup-card__step--done' : ''}${step.id === progress.nextStep ? ' setup-card__step--next' : ''}`}
                      href={href(setupPath(venue.id, step.id))}
                    >
                      <span className="setup-card__mark" aria-hidden="true">
                        {done && <CheckIcon size={10} />}
                      </span>
                      {step.label}
                    </a>
                  </li>
                )
              })}
            </ol>
          </motion.section>
        )
      })}

      {inReview.map((venue) => (
        <motion.section key={venue.id} className="setup-card setup-card--review" variants={riseIn}>
          <div className="setup-card__top">
            <VenueThumb venue={venue} size={52} />
            <div className="setup-card__text">
              <p className="setup-card__eyebrow">In review</p>
              <h2 className="setup-card__title">{venue.name}</h2>
              <p className="setup-card__body">
                We’re checking photos and details — usually within 24 hours. Meanwhile, set up how
                you get paid so your first booking pays out without delay.
              </p>
            </div>
            <motion.span
              className="review__spinner"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              aria-label="Review in progress"
            />
          </div>
        </motion.section>
      ))}

      {calendarStale && (
        <motion.div className="sample-banner" variants={riseIn}>
          <p>
            <strong>Is your calendar up to date?</strong> Hosts can book any open date straight away,
            so close the ones you don’t want.
          </p>
          <a className="ghost-button ghost-button--small" href="#/owner/calendar">
            Review calendar
          </a>
        </motion.div>
      )}

      {hasSamples && (
        <motion.div className="sample-banner" variants={riseIn}>
          <p>
            <strong>Sample bookings.</strong> We’ve added a few so you can see how confirmed
            dates, messages and payouts work.
          </p>
          <button type="button" className="ghost-button ghost-button--small" onClick={clearSamples}>
            Clear samples
          </button>
        </motion.div>
      )}

      {(hasLive || bookings.length > 0) && (
        <motion.div className="stat-grid stat-grid--four" variants={riseIn}>
          <a className="stat" href="#/owner/bookings/upcoming">
            <span className="stat__label">New messages</span>
            <span className="stat__value">{unread}</span>
            <span className="stat__meta">{unread ? 'From hosts who have booked' : 'All read'}</span>
          </a>
          <a className="stat" href="#/owner/bookings/upcoming">
            <span className="stat__label">Upcoming</span>
            <span className="stat__value">{upcoming.length}</span>
            <span className="stat__meta">
              {upcoming[0] ? `Next in ${daysUntil(upcoming[0].date)} days` : 'No events booked yet'}
            </span>
          </a>
          <a className="stat" href="#/owner/earnings">
            <span className="stat__label">Earned this month</span>
            <span className="stat__value">{formatNairaShort(money.thisMonth)}</span>
            <span className="stat__meta">After fees</span>
          </a>
          <a className="stat" href="#/owner/earnings">
            <span className="stat__label">In escrow</span>
            <span className="stat__value">{formatNairaShort(money.escrow)}</span>
            <span className="stat__meta">Paid for upcoming events</span>
          </a>
        </motion.div>
      )}

      {(hasLive || bookings.length > 0) && (
        <motion.div className="split" variants={riseIn}>
          <section className="card">
            <div className="card__header">
              <div>
                <h2 className="card__title">Needs you</h2>
                <p className="card__hint">New messages and events to mark complete.</p>
              </div>
              <a className="ghost-button ghost-button--small" href="#/owner/bookings">
                All bookings
              </a>
            </div>
            {withUnread.length === 0 && needsCompleting.length === 0 ? (
              <p className="quiet-empty">
                Nothing needs you right now. Hosts book open dates directly, so keep your calendar
                current.
              </p>
            ) : (
              <ul className="booking-list">
                {withUnread.slice(0, 3).map((booking) => (
                  <BookingRow key={booking.id} booking={booking} compact />
                ))}
                {needsCompleting.slice(0, 2).map((booking) => (
                  <BookingRow key={booking.id} booking={booking} compact />
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <div className="card__header">
              <div>
                <h2 className="card__title">Coming up</h2>
                <p className="card__hint">Confirmed events at your venues.</p>
              </div>
              <a className="ghost-button ghost-button--small" href="#/owner/calendar">
                Calendar
              </a>
            </div>
            {upcoming.length === 0 ? (
              <p className="quiet-empty">Confirmed bookings will appear here with a countdown.</p>
            ) : (
              <ul className="booking-list">
                {upcoming.slice(0, 4).map((booking) => (
                  <BookingRow key={booking.id} booking={booking} compact />
                ))}
              </ul>
            )}
          </section>
        </motion.div>
      )}

      {!payoutReady && state.venues.length > 0 && (
        <motion.section className="card ready-card" variants={riseIn}>
          <div className="card__header">
            <div>
              <h2 className="card__title">Get ready to be paid</h2>
              <p className="card__hint">
                Two things before your first payout. Do them now and money lands the day after each event.
              </p>
            </div>
          </div>
          <ul className="ready-list">
            <li className={state.payoutAccount ? 'ready-list__done' : ''}>
              <span className="ready-list__icon" aria-hidden="true">
                {state.payoutAccount ? <CheckIcon size={14} /> : <WalletIcon size={14} />}
              </span>
              <span className="ready-list__text">
                <strong>Add a payout account</strong>
                <span>The Nigerian bank account your earnings go to.</span>
              </span>
              {!state.payoutAccount && (
                <a className="ghost-button ghost-button--small" href="#/owner/earnings/payout">
                  Add account
                </a>
              )}
            </li>
            <li className={state.verification.status === 'verified' ? 'ready-list__done' : ''}>
              <span className="ready-list__icon" aria-hidden="true">
                {state.verification.status === 'verified' ? <CheckIcon size={14} /> : <ShieldIcon size={14} />}
              </span>
              <span className="ready-list__text">
                <strong>Verify your identity</strong>
                <span>
                  {state.verification.status === 'pending'
                    ? 'Checking your ID now…'
                    : 'A government ID. Keeps hosts’ money and yours safe.'}
                </span>
              </span>
              {state.verification.status === 'none' && (
                <a className="ghost-button ghost-button--small" href="#/owner/earnings/verify">
                  Verify
                </a>
              )}
            </li>
          </ul>
        </motion.section>
      )}

      {hasLive && (
        <motion.section className="card" variants={riseIn}>
          <div className="card__header">
            <div>
              <h2 className="card__title">Your venues</h2>
            </div>
            <a className="ghost-button ghost-button--small" href="#/owner/venues">
              Manage
            </a>
          </div>
          <ul className="venue-strip">
            {state.venues.map((venue) => {
              const venueBookings = bookings.filter((booking) => booking.venueId === venue.id)
              const earned = venueBookings
                .filter((booking) => booking.status === 'completed' || booking.status === 'confirmed')
                .reduce((sum, booking) => sum + booking.total, 0)
              return (
                <li key={venue.id}>
                  <a className="venue-strip__item" href={href(venuePath(venue.id))}>
                    <VenueThumb venue={venue} />
                    <span className="venue-strip__text">
                      <span className="venue-strip__name">{venue.name || 'Untitled venue'}</span>
                      <span className="venue-strip__meta">
                        {venueBookings.filter((booking) => booking.status === 'confirmed').length} upcoming ·{' '}
                        {formatNaira(earned)} booked
                      </span>
                    </span>
                    <StatusTag status={venue.status} />
                    <ArrowRightIcon size={14} />
                  </a>
                </li>
              )
            })}
          </ul>
        </motion.section>
      )}
    </OwnerShell>
  )
}
