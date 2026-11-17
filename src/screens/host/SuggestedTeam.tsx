import { motion } from 'framer-motion'

import type { EventRecord } from '../../lib/events'
import { formatNaira, formatNairaShort } from '../../lib/money'
import { suggestTeam } from '../../lib/team'
import { findCategory } from '../../lib/vendors'
import { riseIn } from '../../motion/variants'
import { useProfile } from '../../state/Profile'
import './suggested-team.css'

/**
 * A vendor team that fits the event and the money left — spec §10.5.
 *
 * One provider per role the event needs, each with the reason it was chosen.
 * Saving adds to the host's shortlist rather than booking anything: hiring a
 * vendor needs quotes and messaging, which do not exist yet.
 */
export function SuggestedTeam({ event }: { event: EventRecord }) {
  const { profile, toggleSavedVendor } = useProfile()
  const plan = suggestTeam(event)

  if (event.budget <= 0 || plan.suggestions.length === 0) return null

  const overspend = plan.estimated > plan.available

  return (
    <motion.section className="card team" variants={riseIn}>
      <div className="card__header">
        <div>
          <h2 className="card__title">A team that fits</h2>
          <p className="card__hint">
            {formatNaira(plan.available)} left after the venue.{' '}
            {overspend
              ? `This line-up comes to ${formatNaira(plan.estimated)} — over by ${formatNaira(plan.estimated - plan.available)}.`
              : `This line-up comes to ${formatNaira(plan.estimated)}.`}
          </p>
        </div>
        <a className="ghost-button ghost-button--small" href="#/explore">
          Browse all
        </a>
      </div>

      <ul className="team__list">
        {plan.suggestions.map((suggestion) => {
          const saved = profile.savedVendors.includes(suggestion.vendor.id)
          return (
            <li className="team__row" key={suggestion.role}>
              <span
                className="team__thumb"
                style={{
                  background: `linear-gradient(145deg, hsl(${suggestion.vendor.hue} 72% 52%), hsl(${suggestion.vendor.hue + 24} 68% 32%))`,
                }}
                aria-hidden="true"
              >
                {suggestion.vendor.initials}
              </span>

              <span className="team__main">
                <span className="team__role">
                  {findCategory(suggestion.role)?.label ?? suggestion.role}
                </span>
                <a className="team__name" href={`#/vendors/${suggestion.vendor.id}`}>
                  {suggestion.vendor.name}
                </a>
                {suggestion.reasons.length > 0 && (
                  <span className="team__why">{suggestion.reasons.join(' · ')}</span>
                )}
              </span>

              <span className="team__cost">
                {formatNairaShort(suggestion.estimate)}
                {suggestion.vendor.priceUnit === 'per guest' && (
                  <span className="team__unit">
                    {formatNairaShort(suggestion.vendor.priceFrom)} × {event.guestEstimate}
                  </span>
                )}
              </span>

              <button
                type="button"
                className={`ghost-button ghost-button--small${saved ? ' ghost-button--saved' : ''}`}
                onClick={() => toggleSavedVendor(suggestion.vendor.id)}
                aria-pressed={saved}
              >
                {saved ? 'Saved' : 'Save'}
              </button>
            </li>
          )
        })}
      </ul>

      {plan.unfilled.length > 0 && (
        <p className="team__gap">
          No provider listed yet for{' '}
          {plan.unfilled.map((role) => findCategory(role)?.label ?? role).join(', ')}.
        </p>
      )}

      <p className="team__source">
        Chosen by score — local providers, then affordability, then rating.
        Nothing is booked; saving adds to your shortlist.
      </p>
    </motion.section>
  )
}
