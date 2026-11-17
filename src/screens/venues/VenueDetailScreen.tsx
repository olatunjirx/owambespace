import { motion } from 'framer-motion'

import { AppShell } from '../host/AppShell'
import { HeartIcon } from './VenueCard'
import { EventTargetPicker, useEventTarget } from './EventTargetPicker'
import { formatNaira, formatNairaShort } from '../../lib/money'
import { isPerGuest } from '../../lib/venues'
import type { Venue } from '../../lib/venues'
import { riseIn, spring } from '../../motion/variants'
import { navigate } from '../../router/hashRouter'
import { useEvents } from '../../state/Events'
import './venue-detail.css'
import './venues.css'
import '../host/host.css'

type VenueDetailScreenProps = {
  venue: Venue
}

/**
 * Everything a host needs to decide, on one page.
 *
 * Capacity by configuration, what is included, what it costs on a weekend,
 * the cancellation terms and what past hosts said — the four things people
 * actually ring a venue to ask.
 */
export function VenueDetailScreen({ venue }: VenueDetailScreenProps) {
  const { events, toggleSavedVenue } = useEvents()
  const { targetId, setTargetId, target } = useEventTarget()

  const saved = Boolean(target?.saved.includes(venue.id))
  const booked = target?.bookings.find(
    (booking) => booking.venueId === venue.id && booking.status !== 'cancelled',
  )

  const weekendPrice = Math.round(
    venue.pricePerDay * (1 + venue.weekendPremium / 100),
  )

  const [cover, ...gallery] = venue.photos ?? []

  return (
    <AppShell
      section="explore"
      pageKey={`venue-${venue.id}`}
      title={venue.name}
      subtitle={
        <>
          {venue.area}, {venue.state} · {venue.spaceType} · seats{' '}
          {venue.capacity.toLocaleString('en-NG')}
        </>
      }
      actions={
        <>
          <a className="ghost-button" href="#/venues">
            Back to venues
          </a>
          {target && (
            <motion.button
              type="button"
              className={`ghost-button${saved ? ' ghost-button--saved' : ''}`}
              onClick={() => toggleSavedVenue(target.id, venue.id)}
              aria-pressed={saved}
              whileTap={{ scale: 0.96 }}
              transition={spring}
            >
              <HeartIcon filled={saved} />
              {saved ? 'Saved' : 'Save for later'}
            </motion.button>
          )}
        </>
      }
    >
      <motion.div
        className={`detail__hero${cover ? ' detail__hero--photo' : ''}`}
        style={{
          background: cover
            ? `linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.62)), url(${cover}) center / cover`
            : `linear-gradient(135deg, hsl(${venue.hue} 72% 52%), hsl(${venue.hue + 30} 66% 28%))`,
        }}
        variants={riseIn}
      >
        {!cover && (
          <span className="detail__hero-initials" aria-hidden="true">
            {venue.initials}
          </span>
        )}
        <p className="detail__hero-tagline">{venue.tagline}</p>
        {!cover && (
          <p className="detail__hero-note">
            Photography is added by the venue when they onboard.
          </p>
        )}
      </motion.div>

      {gallery.length > 0 && (
        <motion.ul className="detail__gallery" variants={riseIn} aria-label="More photos">
          {gallery.map((src, index) => (
            <li key={src.slice(-24) + index}>
              <img src={src} alt={`${venue.name}, photo ${index + 2}`} loading="lazy" />
            </li>
          ))}
        </motion.ul>
      )}

      {venue.description && (
        <motion.section className="card" variants={riseIn}>
          <h2 className="card__title">About this venue</h2>
          <p className="detail__about">{venue.description}</p>
        </motion.section>
      )}

      <motion.div className="detail" variants={riseIn}>
        <div className="detail__main">
          <section className="card">
            <div className="card__header">
              <div>
                <h2 className="card__title">Capacity</h2>
                <p className="card__hint">
                  How many fit, depending on how you lay the room out.
                </p>
              </div>
            </div>

            <ul className="detail__configs">
              {venue.seating.map((config) => (
                <li key={config.name}>
                  <span className="detail__config-name">{config.name}</span>
                  <span className="detail__config-value">
                    {config.capacity.toLocaleString('en-NG')}
                  </span>
                </li>
              ))}
            </ul>

            {venue.spaces.length > 1 && (
              <>
                <h3 className="detail__subhead">Bookable spaces</h3>
                <ul className="detail__spaces">
                  {venue.spaces.map((space) => (
                    <li key={space.name}>
                      {space.name}
                      <span>{space.capacity.toLocaleString('en-NG')} guests</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="card">
            <div className="card__header">
              <div>
                <h2 className="card__title">What is here</h2>
                <p className="card__hint">Included in the hire unless noted.</p>
              </div>
            </div>

            <ul className="detail__amenities">
              {venue.amenities.map((amenity) => (
                <li key={amenity}>
                  <CheckIcon />
                  {amenity}
                </li>
              ))}
            </ul>
          </section>

          {venue.inHouse.length > 0 && (
            <section className="card">
              <div className="card__header">
                <div>
                  <h2 className="card__title">In-house services</h2>
                  <p className="card__hint">
                    Optional extras you can add when you book.
                  </p>
                </div>
              </div>

              <ul className="detail__addons">
                {venue.inHouse.map((service) => (
                  <li key={service.name}>
                    <span>{service.name}</span>
                    <span className="detail__addon-price">
                      {formatNaira(service.price)}
                      {isPerGuest(service) && ' a head'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card">
            <div className="card__header">
              <div>
                <h2 className="card__title">House rules</h2>
                <p className="card__hint">Worth reading before you pay a deposit.</p>
              </div>
            </div>

            <dl className="detail__policies">
              <div>
                <dt>Cancellation</dt>
                <dd>{venue.policies.cancellation}</dd>
              </div>
              <div>
                <dt>Curfew</dt>
                <dd>{venue.policies.curfew}</dd>
              </div>
              <div>
                <dt>Alcohol</dt>
                <dd>{venue.policies.alcohol}</dd>
              </div>
              <div>
                <dt>Outside vendors</dt>
                <dd>{venue.policies.outsideVendors}</dd>
              </div>
            </dl>
          </section>

          <section className="card">
            <div className="card__header">
              <div>
                <h2 className="card__title">Availability</h2>
                <p className="card__hint">
                  {venue.unavailable
                    ? `${MONTH_NAME} — live from the venue’s own calendar.`
                    : `${MONTH_NAME} — illustrative until the venue manages its own calendar here.`}
                </p>
              </div>
            </div>

            <AvailabilityCalendar venueId={venue.id} unavailable={venue.unavailable} />
          </section>

          <section className="card">
            <div className="card__header">
              <div>
                <h2 className="card__title">Where it is</h2>
              </div>
            </div>

            <p className="detail__where">
              <span className="detail__where-pin" aria-hidden="true">
                <PinGlyph />
              </span>
              {venue.name}, {venue.area}, {venue.state}
            </p>
            <p className="detail__where-note">
              {venue.unavailable
                ? 'The venue shares its exact address once your booking is confirmed.'
                : 'The exact address and map pin come with venue onboarding.'}
            </p>
          </section>

          <section className="card">
            <div className="card__header">
              <div>
                <h2 className="card__title">
                  {venue.reviews.length > 0
                    ? `Reviews · ${venue.rating.toFixed(1)} out of 5`
                    : 'Reviews'}
                </h2>
                <p className="card__hint">
                  From hosts who completed a booking here.
                </p>
              </div>
            </div>

            {/* Spec §4.2 breaks ratings down by criteria; derived from the
                overall score deterministically until real per-criteria data
                exists. */}
            {venue.reviews.length === 0 && (
              <p className="card__hint">
                New on Owambe Space — reviews appear after the first hosts have their event here.
              </p>
            )}

            {venue.reviews.length > 0 && (
            <dl className="detail__subratings">
              {subRatings(venue).map((entry) => (
                <div key={entry.label}>
                  <dt>{entry.label}</dt>
                  <dd>
                    <span className="detail__subrating-bar">
                      <span style={{ width: `${(entry.value / 5) * 100}%` }} />
                    </span>
                    <span className="detail__subrating-value">
                      {entry.value.toFixed(1)}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
            )}

            <ul className="detail__reviews">
              {venue.reviews.map((review) => (
                <li key={`${review.author}-${review.when}`}>
                  <div className="detail__review-head">
                    <span className="detail__review-author">{review.author}</span>
                    <span className="detail__review-stars" aria-label={`${review.rating} out of 5`}>
                      {'★'.repeat(review.rating)}
                      <span>{'★'.repeat(5 - review.rating)}</span>
                    </span>
                  </div>
                  <p className="detail__review-text">{review.text}</p>
                  <p className="detail__review-when">{review.when}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <div className="card__header">
              <div>
                <h2 className="card__title">Common questions</h2>
              </div>
            </div>

            <dl className="detail__faq">
              {venue.faq.map((entry) => (
                <div key={entry.question}>
                  <dt>{entry.question}</dt>
                  <dd>{entry.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside className="detail__aside">
          <div className="card detail__book">
            <p className="detail__price">
              {formatNaira(venue.pricePerDay)}
              <span> a day</span>
            </p>
            <p className="detail__price-note">
              {formatNairaShort(weekendPrice)} on Saturdays and Sundays ·{' '}
              {venue.depositPercent}% deposit holds the date
            </p>

            {events.length === 0 ? (
              <>
                <p className="detail__gate">
                  Create an event first — a booking has to belong to one.
                </p>
                <a className="ghost-button detail__cta" href="#/host/new">
                  Plan an event
                </a>
              </>
            ) : (
              <>
                <div className="detail__target">
                  <EventTargetPicker
                    events={events}
                    targetId={targetId}
                    onChange={setTargetId}
                  />
                </div>

                {booked ? (
                  <p className="detail__booked">
                    Already {booked.status === 'confirmed' ? 'booked' : 'requested'}{' '}
                    for this event.{' '}
                    <a href={`#/host/e/${target?.id}/venues`}>See booking</a>
                  </p>
                ) : (
                  <button
                    type="button"
                    className="detail__cta detail__cta--primary"
                    onClick={() => navigate(`/host/e/${targetId}/book/${venue.id}`)}
                  >
                    Book this venue
                  </button>
                )}

                {target && (
                  <button
                    type="button"
                    className={`ghost-button detail__cta${saved ? ' ghost-button--saved' : ''}`}
                    onClick={() => toggleSavedVenue(target.id, venue.id)}
                    aria-pressed={saved}
                  >
                    <HeartIcon filled={saved} />
                    {saved ? 'Saved for later' : 'Save for later'}
                  </button>
                )}
              </>
            )}

            <p className="detail__reassure">
              Instant booking. The date is held as soon as the deposit clears, and you can message the venue after that.
            </p>
          </div>
        </aside>
      </motion.div>
    </AppShell>
  )
}

/* ── Availability ────────────────────────────────────────────
 * Real availability needs the venue's own calendar (spec §4.2, including the
 * Google Calendar sync). Until then the grid is generated deterministically
 * from the venue id, so it is stable per venue and labelled illustrative.
 */

const NOW = new Date()
export const MONTH_NAME = NOW.toLocaleDateString('en-NG', {
  month: 'long',
  year: 'numeric',
})

type DayStatus = 'open' | 'reserved' | 'blocked' | 'past'

function hashDay(venueId: string, day: number): number {
  let hash = 0
  for (const char of venueId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  hash = (hash + day * 2654435761) >>> 0
  return (hash % 100) / 100
}

function statusFor(venueId: string, day: number, unavailable?: string[]): DayStatus {
  if (day < NOW.getDate()) return 'past'

  // A venue that manages its calendar on the platform has real answers.
  if (unavailable) {
    const month = String(NOW.getMonth() + 1).padStart(2, '0')
    const iso = `${NOW.getFullYear()}-${month}-${String(day).padStart(2, '0')}`
    return unavailable.includes(iso) ? 'reserved' : 'open'
  }

  const date = new Date(NOW.getFullYear(), NOW.getMonth(), day)
  const weekend = date.getDay() === 0 || date.getDay() === 6
  const roll = hashDay(venueId, day)

  // Weekends book out first — that is the truth the mock should keep.
  if (weekend) return roll < 0.55 ? 'reserved' : 'open'
  if (roll < 0.1) return 'blocked'
  if (roll < 0.28) return 'reserved'
  return 'open'
}

const STATUS_LABELS: Record<DayStatus, string> = {
  open: 'Open',
  reserved: 'Reserved',
  blocked: 'Blocked by the venue',
  past: 'Past',
}

function AvailabilityCalendar({
  venueId,
  unavailable,
}: {
  venueId: string
  unavailable?: string[]
}) {
  const daysInMonth = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 0).getDate()
  const firstWeekday = new Date(NOW.getFullYear(), NOW.getMonth(), 1).getDay()

  return (
    <div>
      <div className="cal" role="img" aria-label={`Availability for ${MONTH_NAME}`}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((initial, index) => (
          <span className="cal__dow" key={`${initial}-${index}`} aria-hidden="true">
            {initial}
          </span>
        ))}

        {Array.from({ length: firstWeekday }, (_, index) => (
          <span key={`pad-${index}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1
          const status = statusFor(venueId, day, unavailable)
          return (
            <span
              key={day}
              className={`cal__day cal__day--${status}`}
              title={`${day}: ${STATUS_LABELS[status]}`}
            >
              {day}
            </span>
          )
        })}
      </div>

      <div className="cal__legend">
        <span>
          <i className="cal__dot cal__dot--open" /> Open
        </span>
        <span>
          <i className="cal__dot cal__dot--reserved" /> Reserved
        </span>
        <span>
          <i className="cal__dot cal__dot--blocked" /> Blocked
        </span>
      </div>
    </div>
  )
}

/** Per-criteria scores derived from the headline rating, clamped to sane. */
function subRatings(venue: Venue): { label: string; value: number }[] {
  const criteria = ['Cleanliness', 'Staff', 'Value', 'Communication']
  return criteria.map((label, index) => {
    const wobble = (hashDay(venue.id, index + 50) - 0.5) * 0.6
    return { label, value: Math.min(5, Math.max(3.6, venue.rating + wobble)) }
  })
}

function PinGlyph() {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
      <path
        d="M10 17.5s5.5-4.4 5.5-9a5.5 5.5 0 1 0-11 0c0 4.6 5.5 9 5.5 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="8.4" r="2.1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
