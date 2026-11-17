import type { ReactNode } from 'react'

import { formatNaira } from '../../lib/money'
import type { ServicePackage } from '../../lib/vendors'
import './provider.css'

/**
 * One package as hosts see it — on the provider's own review step and on the
 * public vendor page, so both sides always describe it the same way.
 */
export function PackageCard({
  pkg,
  selected = false,
  action,
}: {
  pkg: ServicePackage
  selected?: boolean
  action?: ReactNode
}) {
  const facts = [
    pkg.priceUnit === 'per guest' && pkg.minGuests ? `Minimum ${pkg.minGuests.toLocaleString('en-NG')} guests` : '',
    pkg.hours ? `${pkg.hours} hours on the day` : '',
  ].filter(Boolean)

  return (
    <article className={`pkg-card${selected ? ' pkg-card--on' : ''}`}>
      <div>
        <h3 className="pkg-card__name">{pkg.name}</h3>
        {pkg.summary && <p className="pkg-card__summary">{pkg.summary}</p>}
      </div>
      <p className="pkg-card__price">
        {formatNaira(pkg.price)}
        <span> {pkg.priceUnit}</span>
      </p>
      <ul className="pkg-card__includes">
        {pkg.includes.map((entry) => (
          <li key={entry}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {entry}
          </li>
        ))}
      </ul>
      {facts.length > 0 && <p className="pkg-card__meta">{facts.join(' · ')}</p>}
      {action && <div className="pkg-card__cta">{action}</div>}
    </article>
  )
}
