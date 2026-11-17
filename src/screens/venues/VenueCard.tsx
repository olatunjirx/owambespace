import { motion } from 'framer-motion'

import { formatNaira, formatNairaShort } from '../../lib/money'
import type { Venue } from '../../lib/venues'
import { softSpring, spring } from '../../motion/variants'

type VenueCardProps = {
  venue: Venue
  saved: boolean
  /** False when there is no event to save against yet. */
  canSave: boolean
  /** The target event's budget, for the "over half your budget" flag. */
  budget: number
  onSave: () => void
}

/**
 * One listing in the directory.
 *
 * The whole card is a link to the detail page; save is the only other action,
 * because deciding on a venue from a grid tile is not something anyone should
 * be encouraged to do.
 */
export function VenueCard({ venue, saved, canSave, budget, onSave }: VenueCardProps) {
  // Half the budget is the rule of thumb planners use for the space alone.
  const heavy = budget > 0 && venue.pricePerDay > budget * 0.5

  return (
    <motion.li
      className="venue"
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={softSpring}
    >
      <a className="venue__link" href={`#/venues/${venue.id}`}>
        <div
          className="venue__thumb"
          style={{
            background: venue.photos?.[0]
              ? `url(${venue.photos[0]}) center / cover`
              : `linear-gradient(145deg, hsl(${venue.hue} 72% 52%), hsl(${venue.hue + 24} 68% 32%))`,
          }}
          aria-hidden="true"
        >
          {!venue.photos?.[0] && <span>{venue.initials}</span>}
        </div>

        <div className="venue__body">
          <div className="venue__head">
            <h2 className="venue__name">{venue.name}</h2>
            {venue.reviews.length > 0 ? (
              <span className="venue__rating">
                <StarIcon />
                {venue.rating.toFixed(1)}
                <span className="venue__reviews">({venue.reviews.length})</span>
              </span>
            ) : (
              <span className="tag tag--accent">New</span>
            )}
          </div>

          <p className="venue__meta">
            {venue.area}, {venue.state} · {venue.spaceType}
          </p>
          <p className="venue__tagline">{venue.tagline}</p>

          <div className="venue__facts">
            <span className="tag">Seats {venue.capacity.toLocaleString('en-NG')}</span>
            <span className={`tag ${heavy ? 'tag--warn' : 'tag--accent'}`}>
              {formatNairaShort(venue.pricePerDay)} / day
            </span>
            {venue.weekdayOffer ? (
              <span className="tag tag--warn">{venue.weekdayOffer}% off weekdays</span>
            ) : null}
            {venue.featured && <span className="tag tag--accent">Featured</span>}
          </div>

          {heavy && (
            <p className="venue__warning">
              {formatNaira(venue.pricePerDay)} is over half your budget.
            </p>
          )}
        </div>
      </a>

      <div className="venue__actions">
        <motion.button
          type="button"
          className={`venue__save${saved ? ' venue__save--on' : ''}`}
          onClick={onSave}
          disabled={!canSave}
          aria-pressed={saved}
          title={canSave ? undefined : 'Create an event first to save venues'}
          whileTap={canSave ? { scale: 0.94 } : undefined}
          transition={spring}
        >
          <HeartIcon filled={saved} />
          {saved ? 'Saved' : 'Save for later'}
        </motion.button>

        <a className="ghost-button ghost-button--small" href={`#/venues/${venue.id}`}>
          View details
        </a>
      </div>
    </motion.li>
  )
}

function StarIcon() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path
        d="M6 1.2 7.4 4.3l3.4.4-2.5 2.3.7 3.3L6 8.7 3 10.3l.7-3.3L1.2 4.7l3.4-.4L6 1.2Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M8 13.5S2 10 2 6.2A3.2 3.2 0 0 1 8 4.6a3.2 3.2 0 0 1 6 1.6C14 10 8 13.5 8 13.5Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}
