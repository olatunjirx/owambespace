import { motion } from 'framer-motion'

import { Switch } from '../owner/OwnerFields'
import { PackageCard } from './PackageCard'
import { EmptyState } from './ProviderHome'
import { ProviderShell } from './ProviderShell'
import { ProviderPreview } from './ServicesScreen'
import { href, servicesPath } from './providerPaths'
import calendarIcon from '../../assets/figma/calendar-2.svg'
import walletIcon from '../../assets/figma/wallet-3.svg'
import safeBoxIcon from '../../assets/figma/safe-box.svg'
import calendarAddIcon from '../../assets/figma/calendar-add.svg'
import { formatNairaShort } from '../../lib/money'
import { CANCELLATION_POLICIES } from '../../lib/owner'
import { PROVIDER_SECTIONS, categoryLabel, fromPrice, isPackageComplete, listingProgress } from '../../lib/provider'
import { riseIn } from '../../motion/variants'
import { navigate } from '../../router/hashRouter'
import { useProvider } from '../../state/Provider'

/**
 * "My services" — the provider's listing at a glance, inside the app like the
 * owner's My venues page: the card hosts see, the numbers that matter, every
 * package, and a way into each setup section. Editing opens the setup steps,
 * which also stay inside the app.
 */
export function ServicesOverview() {
  const { listing, bookings, setPaused } = useProvider()
  const progress = listingProgress(listing)
  const packages = listing.packages.filter(isPackageComplete)
  const from = fromPrice(listing)
  const isLive = listing.status === 'live' || listing.status === 'paused'
  const upcoming = bookings.filter((booking) => booking.status === 'confirmed').length
  const empty = !listing.name && packages.length === 0

  const statusLine =
    listing.status === 'draft'
      ? `${progress.done} of ${progress.total} sections done. Nothing is visible to hosts until you submit.`
      : listing.status === 'review'
        ? 'We’re checking your profile — usually within 24 hours.'
        : listing.status === 'live'
          ? 'Live. Hosts can find you and book any open date.'
          : 'Paused. Hidden from search; paid bookings are unaffected.'

  return (
    <ProviderShell
      section="services"
      pageKey="services-overview"
      title="My services"
      subtitle="Your profile and the packages hosts can book."
      actions={
        <button
          type="button"
          className="pbtn-primary"
          onClick={() => navigate(servicesPath(listing.status === 'draft' ? progress.next : 'profile'))}
        >
          {listing.status === 'draft' ? (progress.done === 0 ? 'Set up your profile' : 'Continue setup') : 'Edit listing'}
        </button>
      }
    >
      {empty ? (
        <motion.section className="psection" variants={riseIn}>
          <EmptyState
            icon={calendarIcon}
            title="No listing yet"
            body="Add your business and your packages so hosts across Nigeria can find and book you."
            action={{ label: 'Set up your profile', href: href(servicesPath('profile')) }}
          />
        </motion.section>
      ) : (
        <>
          <motion.div className="pservices" variants={riseIn}>
            <div className="pservices__card">
              <ProviderPreview listing={listing} />
            </div>
            <div className="pservices__main">
              <section className={`psection${listing.status === 'draft' ? ' psection--accent' : ''}`}>
                <div className="psection__head">
                  <div>
                    <h2 className="psection__title">{listing.name || 'Your business'}</h2>
                    <p className="psection__hint">
                      {[categoryLabel(listing.category), [listing.area, listing.state].filter(Boolean).join(', ')]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <span className="pcount">{listing.status === 'draft' ? 'Draft' : listing.status === 'review' ? 'In review' : listing.status === 'live' ? 'Live' : 'Paused'}</span>
                </div>
                <p className="psection__hint">{statusLine}</p>
                {isLive && (
                  <Switch
                    label="Taking new bookings"
                    description="Turn off to hide your profile from search for a while."
                    checked={listing.status === 'live'}
                    onChange={(on) => setPaused(!on)}
                  />
                )}
              </section>

              <div className="pstat-grid pstat-grid--two">
                <Tile icon={calendarAddIcon} label="Packages" value={String(packages.length)} meta="Bookable at fixed prices" />
                <Tile
                  icon={walletIcon}
                  label="From"
                  value={from.price ? formatNairaShort(from.price) : '₦—'}
                  meta={from.unit === 'per guest' ? 'Per guest' : 'Per event'}
                />
                <Tile icon={safeBoxIcon} label="Deposit" value={`${listing.depositPercent}%`} meta="Paid when a host books" />
                <Tile icon={calendarIcon} label="Upcoming" value={String(upcoming)} meta="Paid jobs" />
              </div>
            </div>
          </motion.div>

          <motion.section className="psection" variants={riseIn}>
            <div className="psection__head">
              <div>
                <h2 className="psection__title">
                  Packages <span className="pcount">{packages.length}</span>
                </h2>
                <p className="psection__hint">What hosts can book. Prices are fixed; chat opens once they’ve paid.</p>
              </div>
              <a className="pbutton" href={href(servicesPath('packages'))}>
                Edit packages
              </a>
            </div>
            {packages.length === 0 ? (
              <EmptyState
                icon={calendarAddIcon}
                title="No packages yet"
                body="Hosts can only book you once you have at least one package with a price."
                action={{ label: 'Add a package', href: href(servicesPath('packages')) }}
              />
            ) : (
              <div className="pkg-grid">
                {packages.map((pkg) => (
                  <PackageCard key={pkg.id} pkg={pkg} />
                ))}
              </div>
            )}
          </motion.section>

          <motion.section className="psection" variants={riseIn}>
            <div className="psection__head">
              <div>
                <h2 className="psection__title">Listing sections</h2>
                <p className="psection__hint">Jump straight to the part you want to change.</p>
              </div>
            </div>
            <ul className="pready">
              {PROVIDER_SECTIONS.map((section) => (
                <li key={section.id}>
                  <span className="pready__text">
                    <strong>{section.label}</strong>
                    <span>
                      {section.id === 'policies' && listing.cancellation
                        ? `${listing.depositPercent}% deposit · ${CANCELLATION_POLICIES[listing.cancellation].label} cancellation · ${listing.perDay} job${listing.perDay === 1 ? '' : 's'} a day`
                        : section.hint}
                    </span>
                  </span>
                  <a className="pbutton" href={href(servicesPath(section.id))}>
                    Edit
                  </a>
                </li>
              ))}
            </ul>
          </motion.section>
        </>
      )}
    </ProviderShell>
  )
}

function Tile({ icon, label, value, meta }: { icon: string; label: string; value: string; meta: string }) {
  return (
    <div className="pstat">
      <span className="pstat__head">
        <span className="pstat__icon" aria-hidden="true">
          <img src={icon} alt="" />
        </span>
        <span className="pstat__label">{label}</span>
      </span>
      <span>
        <span className="pstat__value" style={{ display: 'block' }}>
          {value}
        </span>
        <span className="pstat__meta">{meta}</span>
      </span>
    </div>
  )
}
