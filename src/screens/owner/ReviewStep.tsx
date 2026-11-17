import { AnimatePresence, motion } from 'framer-motion'

import { ListingPreview } from './ListingPreview'
import { ArrowRightIcon, CheckIcon, EyeLineIcon } from './OwnerIcons'
import { calendarPath, href, setupPath } from './ownerPaths'
import { formatNaira } from '../../lib/money'
import {
  CANCELLATION_POLICIES,
  SETUP_STEPS,
  filledSeating,
  filledSpaces,
  headlineCapacity,
  stepGaps,
} from '../../lib/owner'
import type { OwnerVenue, SetupStep } from '../../lib/owner'
import { softSpring } from '../../motion/variants'

/** One line per step, so the owner can check the whole listing at a glance. */
function summaryFor(venue: OwnerVenue, step: SetupStep): string {
  switch (step) {
    case 'basics':
      return [venue.name, venue.spaceType].filter(Boolean).join(' · ') || 'Not started'
    case 'location':
      return [venue.area, venue.state].filter(Boolean).join(', ') || 'Not started'
    case 'spaces': {
      const spaces = filledSpaces(venue).length
      const layouts = filledSeating(venue).length
      if (!spaces && !layouts) return 'Not started'
      return `${spaces} space${spaces === 1 ? '' : 's'} · ${layouts} layout${layouts === 1 ? '' : 's'} · seats ${headlineCapacity(venue).toLocaleString('en-NG')}`
    }
    case 'amenities':
      return venue.amenities.length ? `${venue.amenities.length} included` : 'None ticked yet'
    case 'photos':
      return `${venue.photos.length} photo${venue.photos.length === 1 ? '' : 's'}`
    case 'pricing':
      return venue.pricePerDay
        ? `${formatNaira(venue.pricePerDay)} a day · ${venue.depositPercent}% deposit`
        : 'No day rate yet'
    case 'eventday':
      return venue.guide.arrival.trim() ? 'Guide added' : 'Not added yet'
    case 'policies':
      return venue.cancellation ? `${CANCELLATION_POLICIES[venue.cancellation].label} cancellation` : 'Not chosen'
    default:
      return ''
  }
}

type ReviewStepProps = {
  venue: OwnerVenue
  /** The in-review / live banners; off where the page already says so. */
  showState?: boolean
}

export function ReviewStep({ venue, showState = true }: ReviewStepProps) {
  const steps = SETUP_STEPS.filter((step) => step.id !== 'review')

  return (
    <div className="review">
      <AnimatePresence mode="wait" initial={false}>
        {showState && venue.status === 'review' && (
          <motion.div
            key="review"
            className="review__state review__state--wait"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={softSpring}
          >
            <motion.span
              className="review__spinner"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              aria-hidden="true"
            />
            <div>
              <p className="review__state-title">Submitted — we’re checking your listing</p>
              <p className="review__state-body">
                We look at every photo and detail before hosts see it, usually within 24 hours.
                You’ll get a notification the moment it’s live.
              </p>
              <p className="review__sim">This build simulates the review; it approves in a few seconds.</p>
            </div>
          </motion.div>
        )}

        {showState && venue.status === 'live' && (
          <motion.div
            key="live"
            className="review__state review__state--live"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={softSpring}
          >
            <span className="review__live-check" aria-hidden="true">
              <CheckIcon size={18} />
            </span>
            <div>
              <p className="review__state-title">{venue.name} is live</p>
              <p className="review__state-body">
                Hosts can find it in search and book open dates now. Changes you make from here show
                straight away.
              </p>
              <div className="review__state-actions">
                <a className="ghost-button ghost-button--small" href={href(`/venues/${venue.id}`)}>
                  <EyeLineIcon size={14} /> See it as hosts do
                </a>
                <a className="ghost-button ghost-button--small" href={href(calendarPath(venue.id))}>
                  Set your availability <ArrowRightIcon size={14} />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="review__grid">
        <ol className="review__list">
          {steps.map((step) => {
            const gaps = stepGaps(venue, step.id)
            const done = gaps.length === 0
            return (
              <li key={step.id} className={`review__item${done ? ' review__item--done' : ''}`}>
                <span className="review__mark" aria-hidden="true">
                  {done ? <CheckIcon size={12} /> : '!'}
                </span>
                <div className="review__text">
                  <span className="review__label">{step.label}</span>
                  <span className="review__summary">{summaryFor(venue, step.id)}</span>
                  {!done && (
                    <ul className="review__gaps">
                      {gaps.map((gap) => (
                        <li key={gap}>{gap}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <a className="review__edit" href={href(setupPath(venue.id, step.id))}>
                  {done ? 'Edit' : 'Fix'}
                  <span className="sr-only"> {step.label}</span>
                </a>
              </li>
            )
          })}
        </ol>

        <div className="review__preview">
          <p className="setup__aside-title">How hosts will see it</p>
          <ListingPreview venue={venue} />
        </div>
      </div>
    </div>
  )
}
