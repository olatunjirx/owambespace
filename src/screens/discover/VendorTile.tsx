import { motion } from 'framer-motion'

import { HeartIcon } from '../venues/VenueCard'
import { formatNairaShort } from '../../lib/money'
import { findCategory } from '../../lib/vendors'
import type { Vendor } from '../../lib/vendors'
import { softSpring, spring } from '../../motion/variants'
import { useProfile } from '../../state/Profile'

/**
 * One service provider in a grid. The whole card links to the detail page;
 * saving goes to the host's own shortlist (spec §4.1 — saved vendors live on
 * the profile, not on any one event).
 */
export function VendorTile({ vendor, why }: { vendor: Vendor; why?: string }) {
  const { profile, toggleSavedVendor } = useProfile()
  const saved = profile.savedVendors.includes(vendor.id)

  return (
    <motion.li className="vendor" layout transition={softSpring}>
      <a className="vendor__link" href={`#/vendors/${vendor.id}`}>
        <span
          className="vendor__thumb"
          style={{
            background: `linear-gradient(145deg, hsl(${vendor.hue} 72% 52%), hsl(${vendor.hue + 24} 68% 32%))`,
          }}
          aria-hidden="true"
        >
          {vendor.initials}
        </span>

        <span className="vendor__body">
          <span className="vendor__kind">{findCategory(vendor.category)?.label}</span>
          <span className="vendor__name">{vendor.name}</span>
          <span className="vendor__meta">
            {vendor.area}, {vendor.state} · ★ {vendor.rating.toFixed(1)} ({vendor.reviews})
          </span>
          {why && <span className="vendor__why">{why}</span>}

          <span className="vendor__price">
            From {formatNairaShort(vendor.priceFrom)}{' '}
            <span className="vendor__unit">{vendor.priceUnit}</span>
          </span>
        </span>
      </a>

      <motion.button
        type="button"
        className={`vendor__save${saved ? ' vendor__save--on' : ''}`}
        onClick={() => toggleSavedVendor(vendor.id)}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${vendor.name} from saved` : `Save ${vendor.name}`}
        whileTap={{ scale: 0.9 }}
        transition={spring}
      >
        <HeartIcon filled={saved} />
      </motion.button>
    </motion.li>
  )
}
