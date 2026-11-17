import { motion } from 'framer-motion'

import { VendorTile } from './VendorTile'
import { AppShell } from '../host/AppShell'
import { findCategory, vendorsIn } from '../../lib/vendors'
import { riseIn } from '../../motion/variants'
import './explore.css'
import '../host/host.css'

/**
 * One service category, for the host who arrived through the browse grid.
 * Venues are not rendered here — that category routes to the full venue
 * browser, which has the filtering this page does not need to duplicate.
 */
export function CategoryScreen({ slug }: { slug: string }) {
  const category = findCategory(slug)
  const vendors = category ? vendorsIn(slug) : []

  if (!category) return null

  return (
    <AppShell
      section="explore"
      pageKey={`category-${slug}`}
      title={category.label}
      subtitle={`${category.blurb}. ${vendors.length} provider${vendors.length === 1 ? '' : 's'} listed.`}
      actions={
        <a className="ghost-button" href="#/explore">
          All categories
        </a>
      }
    >
      {vendors.length === 0 ? (
        <motion.div className="empty" variants={riseIn}>
          <p className="empty__title">No providers here yet</p>
          <p className="empty__body">
            This category opens as providers finish onboarding. Check back, or
            browse another category.
          </p>
          <div className="empty__action">
            <a className="button-neutral" href="#/explore">
              Back to Explore
            </a>
          </div>
        </motion.div>
      ) : (
        <motion.ul className="vendor-grid" variants={riseIn}>
          {vendors.map((vendor) => (
            <VendorTile key={vendor.id} vendor={vendor} />
          ))}
        </motion.ul>
      )}
    </AppShell>
  )
}
