import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

import { Modal } from '../../components/Modal'
import { ListingPreview, StatusTag, VenueThumb } from './ListingPreview'
import { Switch } from './OwnerFields'
import { ArrowRightIcon, CheckIcon, LinkIcon, MessageIcon, SparkIcon } from './OwnerIcons'
import { OwnerShell } from './OwnerShell'
import { href, promotePath, setupPath, venuePath } from './ownerPaths'
import { addDays, daysUntil, formatEventDate, todayISO } from '../../lib/events'
import { formatNaira } from '../../lib/money'
import { FEATURE_PLANS, listingStrength } from '../../lib/owner'
import type { OwnerVenue } from '../../lib/owner'
import { riseIn, softSpring } from '../../motion/variants'
import { navigate } from '../../router/hashRouter'
import { useOwner } from '../../state/Owner'

const OFFER_STEPS = [5, 10, 15, 20, 25]

/**
 * Getting more of the right bookings.
 *
 * In order of cost: fix the listing (free, biggest effect), share it (free),
 * discount the quiet days (costs margin on weekdays only), and pay for
 * placement. The page is laid out in that order on purpose.
 *
 * Every tool works on one venue at a time. The chosen venue lives in the URL
 * (/owner/promote/<id>) so the venue page can link straight to its tools.
 */
export function PromoteScreen({ venueId }: { venueId?: string }) {
  const { state } = useOwner()
  const promotable = state.venues.filter((venue) => venue.status === 'live' || venue.status === 'paused')
  const waiting = state.venues.length - promotable.length
  const venue = promotable.find((entry) => entry.id === venueId) ?? promotable[0]

  if (!venue) {
    const draft = state.venues[0]
    return (
      <OwnerShell section="promote" pageKey="owner-promote" title="Promote" subtitle="Tools to fill more dates.">
        <motion.div className="empty" variants={riseIn}>
          <p className="empty__title">Promotion unlocks when your venue is live</p>
          <p className="empty__body">
            Once your listing is approved you can share it, run weekday offers and feature it at the top of search.
          </p>
          {draft && (
            <div className="empty__action">
              <a className="button-primary" href={href(draft.status === 'draft' ? setupPath(draft.id, 'review') : venuePath(draft.id))}>
                {draft.status === 'draft' ? 'Finish your listing' : 'See your listing'}
              </a>
            </div>
          )}
        </motion.div>
      </OwnerShell>
    )
  }

  const live = promotable.filter((entry) => entry.status === 'live')

  return (
    <OwnerShell
      section="promote"
      pageKey="owner-promote"
      title="Promote"
      subtitle="Fill more dates — starting with the free things that make the biggest difference."
    >
      {promotable.length > 1 && (
        <VenuePicker venues={promotable} current={venue.id} waiting={waiting} />
      )}

      <motion.div className="promote__tools" key={venue.id} initial="hidden" animate="visible" variants={TOOLS}>
        {promotable.length > 1 && (
          <motion.h2 className="promote__heading" variants={riseIn}>
            Promoting <span>{venue.name}</span>
          </motion.h2>
        )}
        {venue.status === 'paused' && <PausedNotice venue={venue} />}
        <StrengthCard venue={venue} />
        <ShareCard venue={venue} />
        <OfferCard venue={venue} />
        <FeatureCard venue={venue} />
      </motion.div>

      {live.length > 1 && <ShareAllCard venues={live} />}
    </OwnerShell>
  )
}

const TOOLS = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }

function shareLink(venue: OwnerVenue): string {
  return `${window.location.origin}${window.location.pathname}#/venues/${venue.id}`
}

/** Copies text and flips the button label for a moment, so the press is confirmed. */
function useCopy<T extends string>() {
  const [copied, setCopied] = useState<T | null>(null)
  async function copy(text: string, which: T): Promise<void> {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
      window.setTimeout(() => setCopied((current) => (current === which ? null : current)), 1800)
    } catch {
      // Clipboard can be blocked (insecure context, permissions); the text is
      // selectable on screen, so nothing is lost.
    }
  }
  return { copied, copy }
}

/* ── Which venue ─────────────────────────────────────────── */

function VenuePicker({ venues, current, waiting }: { venues: OwnerVenue[]; current: string; waiting: number }) {
  const listRef = useRef<HTMLDivElement>(null)

  // On phones the list scrolls sideways; keep the chosen venue in view.
  useEffect(() => {
    const list = listRef.current
    const chosen = list?.querySelector<HTMLElement>('[aria-checked="true"]')
    if (list && chosen) list.scrollTo({ left: chosen.offsetLeft - list.offsetLeft - 16, behavior: 'smooth' })
  }, [current])

  return (
    <motion.section className="vpicker" variants={riseIn} aria-label="Choose a venue to promote">
      <div className="vpicker__list" role="radiogroup" aria-label="Venue" ref={listRef}>
        {venues.map((venue) => {
          const on = venue.id === current
          const { score } = listingStrength(venue)
          const featuredDays = venue.featuredUntil ? daysUntil(venue.featuredUntil) ?? -1 : -1
          return (
            <button
              key={venue.id}
              type="button"
              role="radio"
              aria-checked={on}
              className={`vpicker__item${on ? ' vpicker__item--on' : ''}`}
              onClick={() => navigate(promotePath(venue.id), true)}
            >
              <VenueThumb venue={venue} size={40} />
              <span className="vpicker__text">
                <span className="vpicker__name">{venue.name}</span>
                <span className="vpicker__signals">
                  {venue.status === 'paused' ? <StatusTag status="paused" /> : <span>Strength {score}</span>}
                  {venue.weekdayOffer > 0 && <span className="vpicker__signal">{venue.weekdayOffer}% weekdays</span>}
                  {featuredDays >= 0 && <span className="vpicker__signal vpicker__signal--featured">Featured</span>}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      {waiting > 0 && (
        <p className="vpicker__note">
          {waiting} more listing{waiting === 1 ? '' : 's'} will show here once {waiting === 1 ? 'it’s' : 'they’re'} live.
        </p>
      )}
    </motion.section>
  )
}

function PausedNotice({ venue }: { venue: OwnerVenue }) {
  const { setVenueStatus } = useOwner()
  return (
    <motion.section className="card status-card status-card--review" variants={riseIn}>
      <div className="status-card__text">
        <h2 className="card__title">This listing is paused</h2>
        <p className="card__hint">
          Hosts can’t find or book {venue.name} right now, so sharing and featuring won’t bring bookings. Resume it first.
        </p>
      </div>
      <button type="button" className="button-primary" onClick={() => setVenueStatus(venue.id, 'live')}>
        Resume listing
      </button>
    </motion.section>
  )
}

/* ── Listing strength ────────────────────────────────────── */

function StrengthCard({ venue }: { venue: OwnerVenue }) {
  const { score, tips } = listingStrength(venue)
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const label = score >= 80 ? 'Strong' : score >= 50 ? 'Good start' : 'Needs work'

  return (
    <motion.section className="card lstrength" variants={riseIn}>
      <div className="lstrength__score">
        <svg width="112" height="112" viewBox="0 0 112 112" aria-hidden="true">
          <circle cx="56" cy="56" r={radius} fill="none" stroke="var(--bg-subtle)" strokeWidth="10" />
          <motion.circle
            cx="56"
            cy="56"
            r={radius}
            fill="none"
            stroke="var(--primary-base)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            transform="rotate(-90 56 56)"
          />
        </svg>
        <span className="lstrength__number">
          {score}
          <span>/100</span>
        </span>
      </div>

      <div className="lstrength__body">
        <p className="lstrength__eyebrow">Listing strength · {label}</p>
        <h2 className="lstrength__title">
          {tips.length === 0 ? 'Your listing is as strong as it gets.' : 'Fix these first — they cost nothing.'}
        </h2>
        {tips.length > 0 ? (
          <ul className="lstrength__tips">
            {tips.slice(0, 4).map((tip) => (
              <li key={tip.text}>
                <a href={href(setupPath(venue.id, tip.step))}>
                  <span className="lstrength__points">+{tip.points}</span>
                  <span className="lstrength__tip">{tip.text}</span>
                  <ArrowRightIcon size={14} />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card__hint">Keep your calendar current and avoid cancelling bookings to stay near the top.</p>
        )}
      </div>
    </motion.section>
  )
}

/* ── Share ───────────────────────────────────────────────── */

function ShareCard({ venue }: { venue: OwnerVenue }) {
  const { copied, copy } = useCopy<'link' | 'message'>()
  const link = shareLink(venue)
  const message = `${venue.name} is now on Owambe Space — ${venue.tagline} Check dates and book here: ${link}`
  const paused = venue.status === 'paused'

  return (
    <motion.section className={`card${paused ? ' card--muted' : ''}`} variants={riseIn}>
      <div className="card__header">
        <div>
          <h2 className="card__title">Share {venue.name}</h2>
          <p className="card__hint">
            This link opens {venue.name} only. Put it in your Instagram bio and WhatsApp status — bookings through it
            are protected the same way.
          </p>
        </div>
      </div>

      <div className="share">
        <div className="share__link">
          <LinkIcon size={14} />
          <input className="share__input" readOnly value={link} aria-label={`Link to ${venue.name}`} onFocus={(event) => event.target.select()} />
          <button type="button" className="ghost-button ghost-button--small" disabled={paused} onClick={() => void copy(link, 'link')}>
            {copied === 'link' ? 'Copied' : 'Copy link'}
          </button>
        </div>

        <div className="share__message">
          <p>{message}</p>
          <div className="share__actions">
            <button type="button" className="ghost-button ghost-button--small" disabled={paused} onClick={() => void copy(message, 'message')}>
              {copied === 'message' ? 'Copied' : 'Copy message'}
            </button>
            {!paused && (
              <a
                className="ghost-button ghost-button--small"
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageIcon size={14} /> Share on WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  )
}

/** One message for every live venue, for owners who run more than one space. */
function ShareAllCard({ venues }: { venues: OwnerVenue[] }) {
  const { copied, copy } = useCopy<'all'>()
  const message = [
    `Book any of our ${venues.length} venues on Owambe Space:`,
    ...venues.map((venue) => `• ${venue.name}${venue.area ? `, ${venue.area}` : ''} — ${shareLink(venue)}`),
  ].join('\n')

  return (
    <motion.section className="card" variants={riseIn}>
      <div className="card__header">
        <div>
          <h2 className="card__title">Share all your venues</h2>
          <p className="card__hint">One message with a link to each of your {venues.length} live venues, so hosts can compare.</p>
        </div>
      </div>
      <div className="share__message">
        <p className="share__multiline">{message}</p>
        <div className="share__actions">
          <button type="button" className="ghost-button ghost-button--small" onClick={() => void copy(message, 'all')}>
            {copied === 'all' ? 'Copied' : 'Copy message'}
          </button>
          <a
            className="ghost-button ghost-button--small"
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageIcon size={14} /> Share on WhatsApp
          </a>
        </div>
      </div>
    </motion.section>
  )
}

/* ── Weekday offer ───────────────────────────────────────── */

function OfferCard({ venue }: { venue: OwnerVenue }) {
  const { updateVenue } = useOwner()
  const on = venue.weekdayOffer > 0
  const discounted = Math.round(venue.pricePerDay * (1 - (venue.weekdayOffer || 10) / 100))

  return (
    <motion.section className="card offer" variants={riseIn}>
      <div className="offer__main">
        <Switch
          label="Weekday offer"
          checked={on}
          onChange={(next) => updateVenue(venue.id, { weekdayOffer: next ? 10 : 0 })}
          description={`Weekends sell themselves; Monday to Friday often sit empty. A discount on ${venue.name}’s weekday dates shows as a tag in search and comes off the price at checkout.`}
        />

        {on && (
          <motion.div
            className="offer__options"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={softSpring}
          >
            <span className="filters__label">Discount</span>
            <div className="offer__steps" role="radiogroup" aria-label="Weekday discount">
              {OFFER_STEPS.map((step) => (
                <button
                  key={step}
                  type="button"
                  role="radio"
                  aria-checked={venue.weekdayOffer === step}
                  className={`offer__step${venue.weekdayOffer === step ? ' offer__step--on' : ''}`}
                  onClick={() => updateVenue(venue.id, { weekdayOffer: step })}
                >
                  {step}%
                </button>
              ))}
            </div>
            <p className="card__hint">
              A weekday booking becomes {formatNaira(discounted)} instead of {formatNaira(venue.pricePerDay)}.
            </p>
          </motion.div>
        )}
      </div>
      <div className="offer__preview">
        <ListingPreview venue={venue} />
      </div>
    </motion.section>
  )
}

/* ── Featured ────────────────────────────────────────────── */

function FeatureCard({ venue }: { venue: OwnerVenue }) {
  const { updateVenue } = useOwner()
  const [plan, setPlan] = useState<(typeof FEATURE_PLANS)[number] | null>(null)
  const daysLeft = venue.featuredUntil ? daysUntil(venue.featuredUntil) ?? -1 : -1
  const active = daysLeft >= 0

  return (
    <motion.section className="card" variants={riseIn}>
      <div className="card__header">
        <div>
          <h2 className="card__title">
            <SparkIcon size={14} /> Feature this venue
          </h2>
          <p className="card__hint">
            {venue.name} sits in the promoted slots on Explore and carries a Featured tag in search. Each venue is
            featured separately.
          </p>
        </div>
        {active && <span className="tag tag--good">Featured · {daysLeft} days left</span>}
      </div>

      {active ? (
        <p className="feature__active">
          <CheckIcon size={14} /> Running until {formatEventDate(venue.featuredUntil ?? '')}. You can extend it
          from here when it ends.
        </p>
      ) : (
        <ul className="feature__plans">
          {FEATURE_PLANS.map((option, index) => (
            <li key={option.days}>
              <button
                type="button"
                className={`feature__plan${index === 1 ? ' feature__plan--best' : ''}`}
                disabled={venue.status === 'paused'}
                onClick={() => setPlan(option)}
              >
                {index === 1 && <span className="feature__badge">Most chosen</span>}
                <span className="feature__duration">{option.label}</span>
                <span className="feature__price">{formatNaira(option.price)}</span>
                <span className="feature__per">{formatNaira(Math.round(option.price / option.days))} a day</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(plan)}
        onClose={() => setPlan(null)}
        size="small"
        title={plan ? `Feature ${venue.name} for ${plan.label}?` : ''}
        footer={
          <>
            <button type="button" className="button-neutral" onClick={() => setPlan(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={() => {
                if (plan) updateVenue(venue.id, { featuredUntil: addDays(todayISO(), plan.days) })
                setPlan(null)
              }}
            >
              Pay {plan ? formatNaira(plan.price) : ''}
            </button>
          </>
        }
      >
        <p className="modal-copy">
          It starts today and ends on {plan ? formatEventDate(addDays(todayISO(), plan.days)) : ''}. It doesn’t renew
          automatically.
        </p>
        <p className="modal-sim">Simulated — no payment is taken in this build.</p>
      </Modal>
    </motion.section>
  )
}
