import { motion } from 'framer-motion'

import { AppShell } from '../host/AppShell'
import { HeartIcon } from '../venues/VenueCard'
import { EventTargetPicker, useEventTarget } from '../venues/EventTargetPicker'
import { PackageCard } from '../provider/PackageCard'
import { formatNaira } from '../../lib/money'
import { findCategory, packagesFor, vendorCancellation, vendorDeposit } from '../../lib/vendors'
import type { Vendor } from '../../lib/vendors'
import { riseIn, spring } from '../../motion/variants'
import { navigate } from '../../router/hashRouter'
import { useEvents } from '../../state/Events'
import { useProfile } from '../../state/Profile'
import './explore.css'
import '../host/host.css'
import '../provider/provider.css'

/**
 * A service provider's page.
 *
 * Providers book the same way venues do: pick a package, pay the deposit,
 * done. There is no "request a quote" — chat only opens once the host has
 * paid, so everything a host needs to decide is on this page.
 */
export function VendorDetailScreen({ vendor }: { vendor: Vendor }) {
  const { profile, toggleSavedVendor } = useProfile()
  const { events } = useEvents()
  const { targetId, setTargetId, target } = useEventTarget()
  const saved = profile.savedVendors.includes(vendor.id)
  const category = findCategory(vendor.category)
  const packages = packagesFor(vendor)
  const booked = target?.hires.find((hire) => hire.vendorId === vendor.id && hire.status === 'confirmed')

  return (
    <AppShell
      section="explore"
      pageKey={`vendor-${vendor.id}`}
      title={vendor.name}
      subtitle={
        <>
          {category?.label} · {vendor.area}, {vendor.state} ·{' '}
          {vendor.reviews > 0 ? `★ ${vendor.rating.toFixed(1)} from ${vendor.reviews} reviews` : 'New on Owambe Space'}
        </>
      }
      actions={
        <>
          <a className="ghost-button" href={`#/explore/${vendor.category}`}>
            More {category?.label.toLowerCase()}
          </a>
          <motion.button
            type="button"
            className={`ghost-button${saved ? ' ghost-button--saved' : ''}`}
            onClick={() => toggleSavedVendor(vendor.id)}
            aria-pressed={saved}
            whileTap={{ scale: 0.96 }}
            transition={spring}
          >
            <HeartIcon filled={saved} />
            {saved ? 'Saved' : 'Save for later'}
          </motion.button>
        </>
      }
    >
      <motion.div
        className="vendor-hero"
        style={{
          background: `linear-gradient(135deg, hsl(${vendor.hue} 72% 52%), hsl(${vendor.hue + 30} 66% 28%))`,
        }}
        variants={riseIn}
      >
        <span className="vendor-hero__initials" aria-hidden="true">
          {vendor.initials}
        </span>
        <p className="vendor-hero__tagline">{vendor.tagline}</p>
      </motion.div>

      <motion.section className="psection" variants={riseIn}>
        <div className="psection__head">
          <div>
            <h2 className="psection__title">
              Packages <span className="pcount">{packages.length}</span>
            </h2>
            <p className="psection__hint">
              Fixed prices. A {vendorDeposit(vendor)}% deposit books the date, and you can message {vendor.name} once
              it’s paid.
            </p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="pempty">
            <p className="pempty__title">Create an event first</p>
            <p className="pempty__body">A booking has to belong to one of your events.</p>
            <a className="pbutton" href="#/host/new">
              Plan an event
            </a>
          </div>
        ) : (
          <>
            <EventTargetPicker events={events} targetId={targetId} onChange={setTargetId} />
            {booked && (
              <p className="detail__booked">
                Already booked for this event ({booked.packageName}).{' '}
                <a href={`#/host/e/${targetId}/vendors`}>See booking</a>
              </p>
            )}
            <div className="pkg-grid">
              {packages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  action={
                    <button
                      type="button"
                      className="detail__cta detail__cta--primary"
                      disabled={Boolean(booked) || vendor.hidden}
                      onClick={() => navigate(`/host/e/${targetId}/hire/${vendor.id}/${pkg.id}`)}
                    >
                      Book {pkg.name}
                    </button>
                  }
                />
              ))}
            </div>
          </>
        )}
      </motion.section>

      <motion.div className="split" variants={riseIn}>
        <section className="card">
          <div className="card__header">
            <div>
              <h2 className="card__title">What they offer</h2>
              <p className="card__hint">Every service under this listing.</p>
            </div>
          </div>
          <ul className="vendor-services">
            {vendor.services.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="card__header">
            <div>
              <h2 className="card__title">Booking terms</h2>
              <p className="card__hint">Shown before you pay, so there’s nothing to argue about later.</p>
            </div>
          </div>
          <p className="vendor-price">
            {formatNaira(vendor.priceFrom)}
            <span> {vendor.priceUnit}, from</span>
          </p>
          <p className="vendor-price-note">{vendorCancellation(vendor)}</p>
        </section>
      </motion.div>
    </AppShell>
  )
}
