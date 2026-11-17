import { AnimatePresence, motion } from 'framer-motion'

import { StatusTag } from '../owner/ListingPreview'
import { ArrowRightIcon, CheckIcon } from '../owner/OwnerIcons'
import calendarAddIcon from '../../assets/figma/calendar-add.svg'
import calendarIcon from '../../assets/figma/calendar-2.svg'
import inboxIcon from '../../assets/figma/inbox.svg'
import payoutIcon from '../../assets/figma/payout-account.svg'
import safeBoxIcon from '../../assets/figma/safe-box.svg'
import verifyIcon from '../../assets/figma/verify-id.svg'
import walletIcon from '../../assets/figma/wallet-3.svg'
import { ProviderBookingRow } from './ProviderBookingRow'
import { ProviderShell, ProviderThumb } from './ProviderShell'
import { href, servicesPath } from './providerPaths'
import { daysUntil } from '../../lib/events'
import { formatNaira, formatNairaShort } from '../../lib/money'
import { earningsSummary, unreadCount } from '../../lib/owner'
import { PROVIDER_SECTIONS, categoryLabel, fromPrice, isPackageComplete, listingProgress, sectionGaps } from '../../lib/provider'
import { riseIn, softSpring } from '../../motion/variants'
import { navigate } from '../../router/hashRouter'
import { useProvider } from '../../state/Provider'
import { useProfile } from '../../state/Profile'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Where a provider lands every day. Like the owner home it answers "what
 * needs me now?" first — before going live that is finishing the profile —
 * and only then shows the numbers.
 */
export function ProviderHome() {
  const { profile } = useProfile()
  const { state, listing, bookings, clearSamples, dismissNotice } = useProvider()
  const firstName = profile.displayName.trim().split(' ')[0]

  const isLive = listing.status === 'live' || listing.status === 'paused'
  const progress = listingProgress(listing)
  const percent = Math.round((progress.done / progress.total) * 100)

  const withUnread = bookings.filter((booking) => unreadCount(booking) > 0)
  const unread = withUnread.reduce((sum, booking) => sum + unreadCount(booking), 0)
  const upcoming = bookings.filter((booking) => booking.status === 'confirmed' && (daysUntil(booking.date) ?? -1) >= 0)
  const needsCompleting = bookings.filter((booking) => booking.status === 'confirmed' && (daysUntil(booking.date) ?? 0) < 0)
  const money = earningsSummary(bookings, state.payouts)
  const hasSamples = bookings.some((booking) => booking.source === 'sample')
  const payoutReady = Boolean(state.payoutAccount) && state.verification.status === 'verified'
  const from = fromPrice(listing)

  const subtitle = !isLive
    ? listing.status === 'review'
      ? 'Your profile is being checked. We’ll let you know the moment it’s live.'
      : 'Finish your profile to start taking bookings.'
    : unread > 0
      ? `You have ${unread} new message${unread === 1 ? '' : 's'} from hosts.`
      : upcoming.length > 0
        ? `Nothing needs you right now. Next up: ${upcoming[0].eventName}.`
        : 'You’re all caught up.'

  return (
    <ProviderShell
      section="home"
      pageKey="provider-home"
      title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
      subtitle={subtitle}
      actions={
        isLive ? (
          <a className="button-primary" href="#/provider/calendar">
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
              <a className="notice__link" href={href(notice.href)} onClick={() => dismissNotice(notice.id)}>
                View
              </a>
            )}
            <button type="button" className="notice__close" aria-label="Dismiss" onClick={() => dismissNotice(notice.id)}>
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {listing.status === 'draft' && (
        <motion.section className="setup-card" variants={riseIn}>
          <div className="setup-card__top">
            <ProviderThumb name={listing.name || profile.displayName} hue={listing.hue} size={52} />
            <div className="setup-card__text">
              <p className="setup-card__eyebrow">Finish your profile</p>
              <h2 className="setup-card__title">{listing.name || 'Your business'}</h2>
              <p className="setup-card__body">
                {progress.done} of {progress.total} sections done.{' '}
                {progress.done === progress.total
                  ? 'Everything is in — review and submit it.'
                  : `Next: ${PROVIDER_SECTIONS.find((section) => section.id === progress.next)?.label.toLowerCase()}.`}
              </p>
            </div>
            <button type="button" className="button-primary" onClick={() => navigate(servicesPath(progress.next))}>
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
            {PROVIDER_SECTIONS.map((section) => {
              const done = sectionGaps(listing, section.id).length === 0
              return (
                <li key={section.id}>
                  <a
                    className={`setup-card__step${done ? ' setup-card__step--done' : ''}${section.id === progress.next && !done ? ' setup-card__step--next' : ''}`}
                    href={href(servicesPath(section.id))}
                  >
                    <span className="setup-card__mark" aria-hidden="true">
                      {done && <CheckIcon size={10} />}
                    </span>
                    {section.label}
                  </a>
                </li>
              )
            })}
          </ol>
        </motion.section>
      )}

      {listing.status === 'review' && (
        <motion.section className="setup-card setup-card--review" variants={riseIn}>
          <div className="setup-card__top">
            <ProviderThumb name={listing.name} hue={listing.hue} size={52} />
            <div className="setup-card__text">
              <p className="setup-card__eyebrow">In review</p>
              <h2 className="setup-card__title">{listing.name}</h2>
              <p className="setup-card__body">
                We’re checking your profile and packages — usually within 24 hours. Meanwhile, set up how you get
                paid so your first booking pays out without delay.
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
      )}

      {hasSamples && (
        <motion.div className="sample-banner" variants={riseIn}>
          <p>
            <strong>Sample bookings.</strong> We’ve added a few so you can see how paid bookings, messages and
            payouts work.
          </p>
          <button type="button" className="ghost-button ghost-button--small" onClick={clearSamples}>
            Clear samples
          </button>
        </motion.div>
      )}

      <motion.div className="pstat-grid" variants={riseIn}>
        <StatTile href="#/provider/bookings/upcoming" icon={inboxIcon} label="New messages" value={String(unread)}
          meta={unread ? 'From hosts who have paid' : 'No new messages'} />
        <StatTile href="#/provider/bookings/upcoming" icon={calendarAddIcon} label="Upcoming" value={String(upcoming.length)}
          meta={upcoming[0] ? `Next in ${daysUntil(upcoming[0].date)} days` : 'No jobs scheduled'} />
        <StatTile href="#/provider/earnings" icon={walletIcon} label="Earned this month"
          value={formatNairaShort(money.thisMonth)} meta="After fees" />
        <StatTile href="#/provider/earnings" icon={safeBoxIcon} label="In escrow"
          value={formatNairaShort(money.escrow)} meta="Paid for upcoming jobs" />
      </motion.div>

      {(withUnread.length > 0 || needsCompleting.length > 0) && (
        <motion.section className="psection" variants={riseIn}>
          <div className="psection__head">
            <div>
              <h2 className="psection__title">
                Needs you <span className="pcount">{withUnread.length + needsCompleting.length}</span>
              </h2>
              <p className="psection__hint">New messages and jobs to mark complete.</p>
            </div>
            <a className="pbutton" href="#/provider/bookings">
              All bookings
            </a>
          </div>
          <ul className="booking-list">
            {withUnread.slice(0, 3).map((booking) => (
              <ProviderBookingRow key={booking.id} booking={booking} compact />
            ))}
            {needsCompleting.slice(0, 2).map((booking) => (
              <ProviderBookingRow key={booking.id} booking={booking} compact />
            ))}
          </ul>
        </motion.section>
      )}

      <motion.section className="psection" variants={riseIn}>
        <div className="psection__head">
          <div>
            <h2 className="psection__title">
              Coming up <span className="pcount">{upcoming.length}</span>
            </h2>
            <p className="psection__hint">Paid jobs on your calendar.</p>
          </div>
          <a className="pbutton" href="#/provider/calendar">
            Calendar
          </a>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={calendarIcon}
            title="No jobs booked yet"
            body={isLive ? 'Hosts book your packages on open dates. Paid jobs show up here.' : 'Your paid jobs show up here once your profile is live.'}
            action={isLive ? { label: 'Manage availability', href: '#/provider/calendar' } : { label: 'Finish your profile', href: href(servicesPath(progress.next)) }}
          />
        ) : (
          <ul className="booking-list">
            {upcoming.slice(0, 4).map((booking) => (
              <ProviderBookingRow key={booking.id} booking={booking} compact />
            ))}
          </ul>
        )}
      </motion.section>

      {!payoutReady && (
        <motion.section className="psection psection--accent" variants={riseIn}>
          <div className="psection__head">
            <div>
              <h2 className="psection__title">Get ready to be paid</h2>
              <p className="psection__hint">
                Two things before your first payout. Do them now and money lands the day after each job.
              </p>
            </div>
          </div>
          <ul className="pready">
            <li className={state.payoutAccount ? 'pready__done' : ''}>
              <span className="pready__icon" aria-hidden="true">
                {state.payoutAccount ? <CheckIcon size={14} /> : <img src={payoutIcon} alt="" />}
              </span>
              <span className="pready__text">
                <strong>Add a payout account</strong>
                <span>The Nigerian bank account your earnings go to.</span>
              </span>
              {!state.payoutAccount && (
                <a className="pbutton" href="#/provider/earnings/payout">
                  Add account
                </a>
              )}
            </li>
            <li className={state.verification.status === 'verified' ? 'pready__done' : ''}>
              <span className="pready__icon" aria-hidden="true">
                {state.verification.status === 'verified' ? <CheckIcon size={14} /> : <img src={verifyIcon} alt="" />}
              </span>
              <span className="pready__text">
                <strong>Verify your identity</strong>
                <span>
                  {state.verification.status === 'pending'
                    ? 'Checking your ID now…'
                    : 'A government ID. Keeps hosts’ money and yours safe.'}
                </span>
              </span>
              {state.verification.status === 'none' && (
                <a className="pbutton" href="#/provider/earnings/verify">
                  Verify
                </a>
              )}
            </li>
          </ul>
        </motion.section>
      )}

      <motion.section className="psection" variants={riseIn}>
        <div className="psection__head">
          <h2 className="psection__title">Your listing</h2>
          <a className="pbutton" href="#/provider/services">
            Manage
          </a>
        </div>
        {isLive ? (
          <ul className="venue-strip">
            <li>
              <a className="venue-strip__item" href="#/provider/services">
                <ProviderThumb name={listing.name} hue={listing.hue} />
                <span className="venue-strip__text">
                  <span className="venue-strip__name">{listing.name}</span>
                  <span className="venue-strip__meta">
                    {categoryLabel(listing.category)} · {listing.packages.filter(isPackageComplete).length} packages ·
                    from {formatNaira(from.price)} {from.unit}
                  </span>
                </span>
                <StatusTag status={listing.status} />
                <ArrowRightIcon size={14} />
              </a>
            </li>
          </ul>
        ) : (
          <EmptyState
            icon={calendarIcon}
            title={listing.status === 'review' ? 'Your profile is in review' : 'Not listed yet'}
            body="Add your packages so hosts across Nigeria can find and book you."
            action={{ label: listing.status === 'review' ? 'View profile' : 'Set up profile', href: '#/provider/services' }}
          />
        )}
      </motion.section>
    </ProviderShell>
  )
}

/** A stat tile as drawn in Figma (Home 1129:35883): icon tile, uppercase label, value, note. */
function StatTile({ href: to, icon, label, value, meta }: { href: string; icon: string; label: string; value: string; meta: string }) {
  return (
    <a className="pstat" href={to}>
      <span className="pstat__head">
        <span className="pstat__icon" aria-hidden="true">
          <img src={icon} alt="" />
        </span>
        <span className="pstat__label">{label}</span>
      </span>
      <span>
        <span className="pstat__value" style={{ display: 'block' }}>{value}</span>
        <span className="pstat__meta">{meta}</span>
      </span>
    </a>
  )
}

/** The centred empty state from Figma (Home 1129:35935). */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string
  title: string
  body: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="pempty">
      <span className="pempty__icon" aria-hidden="true">
        <img src={icon} alt="" />
      </span>
      <div>
        <p className="pempty__title">{title}</p>
        <p className="pempty__body">{body}</p>
      </div>
      {action && (
        <a className="pbutton" href={action.href}>
          {action.label}
        </a>
      )}
    </div>
  )
}
