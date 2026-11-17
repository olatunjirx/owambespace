import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

import { VendorTile } from './VendorTile'
import { AppShell } from '../host/AppShell'
import { SearchIcon } from '../../components/AppIcons'
import { MicButton } from '../../components/MicButton'
import { useDictation } from '../../lib/dictation'
import {
  describeIntent,
  explain,
  parseIntent,
  rankVendors,
  rankVenues,
  searchAll,
  searchByIntent,
} from '../../lib/discover'
import { formatNairaShort } from '../../lib/money'
import { VENDOR_CATEGORIES, promotedVendors } from '../../lib/vendors'
import { allVenues } from '../../lib/venues'
import { riseIn, softSpring } from '../../motion/variants'
import './explore.css'
import '../host/host.css'

type SearchMode = 'classic' | 'describe'

/**
 * The discovery hub — spec §5.1's three doors in one place.
 *
 * Before any search, the page sells: promoted providers first, then the
 * category grid for people who do not yet know what they want. The search box
 * carries both modes — classic keywords, or a described sentence that gets
 * parsed into structure. Venues are one category among many here; the full
 * venue browser stays at /venues for the heavy filtering.
 */
export function ExploreScreen() {
  const [mode, setMode] = useState<SearchMode>('classic')
  const [query, setQuery] = useState('')

  // Speech extends the field rather than replacing it, so a half-typed query
  // survives someone finishing the sentence out loud.
  const dictation = useDictation((heard) => {
    setQuery((current) => (current.trim() ? `${current.trim()} ${heard}` : heard))
    // A described sentence is what people say out loud; classic keywords are
    // what they type. Speaking switches the mode to match.
    setMode('describe')
  })

  const trimmed = query.trim()
  const intent = useMemo(
    () => (mode === 'describe' && trimmed ? parseIntent(trimmed) : null),
    [mode, trimmed],
  )

  const results = useMemo(() => {
    if (!trimmed) return null
    return intent ? searchByIntent(intent) : searchAll(trimmed)
  }, [trimmed, intent])

  const understood = intent ? describeIntent(intent) : []

  // Ranked only in describe mode — with no stated intent there is no basis
  // for saying one result fits better than another.
  const rankedVenues = intent && results ? rankVenues(results.venues, intent) : null
  const rankedVendors = intent && results ? rankVendors(results.vendors, intent) : null
  const promoted = promotedVendors()
  // Two highest-rated venues join the rail so the paid slots are not all
  // services — the hall is still the anchor purchase.
  // Venues that paid to be featured take those slots first.
  const venues = allVenues()
  const promotedVenues = [...venues]
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || b.rating - a.rating)
    .slice(0, 2)

  const total = results ? results.venues.length + results.vendors.length : 0

  return (
    <AppShell
      section="explore"
      pageKey="explore"
      title="Explore"
      subtitle="Venues and every service your event needs — caterers, decor, photographers, security and more."
    >
      <motion.section className="card seek" variants={riseIn} aria-label="Search">
        <div className="seek__modes" role="tablist" aria-label="Search mode">
          {(
            [
              { id: 'classic', label: 'Search' },
              { id: 'describe', label: 'Describe it' },
            ] as { id: SearchMode; label: string }[]
          ).map((option) => {
            const current = mode === option.id
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={current}
                className={`seek__mode${current ? ' seek__mode--on' : ''}`}
                onClick={() => setMode(option.id)}
              >
                {current && (
                  <motion.span
                    layoutId="seek-mode-pill"
                    className="seek__mode-pill"
                    transition={softSpring}
                  />
                )}
                <span className="seek__mode-label">{option.label}</span>
              </button>
            )
          })}
        </div>

        <label className="seek__box">
          <span className="seek__icon" aria-hidden="true">
            <SearchIcon />
          </span>
          <span className="sr-only">
            {mode === 'classic' ? 'Search venues and services' : 'Describe what you need'}
          </span>
          <input
            type="search"
            className="seek__input"
            placeholder={
              mode === 'classic'
                ? 'Wedding halls in Lekki, DJs, small chops…'
                : 'Catering in Lagos for 200 guests, budget ₦2m'
            }
            value={query}
            onChange={(changed) => setQuery(changed.target.value)}
          />
          {dictation.interim && (
            <span className="seek__interim" aria-hidden="true">
              {dictation.interim}
            </span>
          )}
          {dictation.supported && (
            <MicButton
              listening={dictation.listening}
              onClick={dictation.listening ? dictation.stop : dictation.start}
              label="Say what you need"
            />
          )}
        </label>

        {dictation.error && (
          <p className="seek__error" role="status">
            {dictation.error}
          </p>
        )}

        {mode === 'describe' && (
          <p className="seek__note">
            {understood.length > 0 ? (
              <>
                Understood:{' '}
                {understood.map((part) => (
                  <span className="seek__chip" key={part}>
                    {part}
                  </span>
                ))}
              </>
            ) : (
              'Say the service, the place, the head count and the budget — in any order.'
            )}
          </p>
        )}
      </motion.section>

      {results ? (
        <motion.section variants={riseIn} aria-live="polite">
          <h2 className="section-title">
            {total === 0
              ? 'Nothing matches yet'
              : `${total} match${total === 1 ? '' : 'es'}`}
          </h2>

          {total === 0 && (
            <div className="empty">
              <p className="empty__title">No venues or services match</p>
              <p className="empty__body">
                Try fewer words, or browse by category below — more providers
                join every week.
              </p>
              <div className="empty__action">
                <button type="button" className="button-neutral" onClick={() => setQuery('')}>
                  Clear search
                </button>
              </div>
            </div>
          )}

          {results.venues.length > 0 && (
            <div className="hits">
              <h3 className="hits__head">Venues</h3>
              <ul className="hits__list">
                {(rankedVenues ?? results.venues.map((v) => ({ item: v, reasons: [] }))).map(
                  ({ item: venue, reasons }) => (
                  <li key={venue.id}>
                    <a className="hit" href={`#/venues/${venue.id}`}>
                      <span
                        className="hit__thumb"
                        style={{
                          background: `linear-gradient(145deg, hsl(${venue.hue} 72% 52%), hsl(${venue.hue + 24} 68% 32%))`,
                        }}
                        aria-hidden="true"
                      >
                        {venue.initials}
                      </span>
                      <span className="hit__body">
                        <span className="hit__name">{venue.name}</span>
                        <span className="hit__meta">
                          {venue.area}, {venue.state} · seats{' '}
                          {venue.capacity.toLocaleString('en-NG')}
                        </span>
                        {reasons.length > 0 && (
                          <span className="hit__why">{explain(reasons)}</span>
                        )}
                      </span>
                      <span className="hit__price">
                        {formatNairaShort(venue.pricePerDay)} / day
                      </span>
                    </a>
                  </li>
                  ),
                )}
              </ul>
            </div>
          )}

          {results.vendors.length > 0 && (
            <div className="hits">
              <h3 className="hits__head">Services</h3>
              <ul className="vendor-grid">
                {(rankedVendors ?? results.vendors.map((v) => ({ item: v, reasons: [] }))).map(
                  ({ item: vendor, reasons }) => (
                    <VendorTile key={vendor.id} vendor={vendor} why={explain(reasons)} />
                  ),
                )}
              </ul>
            </div>
          )}
        </motion.section>
      ) : (
        <>
          <motion.section variants={riseIn} aria-label="Promoted providers">
            <div className="rail__head">
              <h2 className="section-title">Featured this week</h2>
              <span className="tag tag--accent">Promoted</span>
            </div>

            <div className="rail">
              {promotedVenues.map((venue) => (
                <a className="rail__card" key={venue.id} href={`#/venues/${venue.id}`}>
                  <span
                    className="rail__thumb"
                    style={{
                      background: `linear-gradient(145deg, hsl(${venue.hue} 72% 52%), hsl(${venue.hue + 30} 66% 28%))`,
                    }}
                    aria-hidden="true"
                  >
                    {venue.initials}
                  </span>
                  <span className="rail__body">
                    <span className="rail__kind">Venue · {venue.spaceType}</span>
                    <span className="rail__name">{venue.name}</span>
                    <span className="rail__meta">
                      {venue.area}, {venue.state} ·{' '}
                      {formatNairaShort(venue.pricePerDay)} / day
                    </span>
                  </span>
                </a>
              ))}

              {promoted.map((vendor) => (
                <a className="rail__card" key={vendor.id} href={`#/vendors/${vendor.id}`}>
                  <span
                    className="rail__thumb"
                    style={{
                      background: `linear-gradient(145deg, hsl(${vendor.hue} 72% 52%), hsl(${vendor.hue + 30} 66% 28%))`,
                    }}
                    aria-hidden="true"
                  >
                    {vendor.initials}
                  </span>
                  <span className="rail__body">
                    <span className="rail__kind">
                      {VENDOR_CATEGORIES.find((c) => c.slug === vendor.category)?.label}
                    </span>
                    <span className="rail__name">{vendor.name}</span>
                    <span className="rail__meta">
                      {vendor.area}, {vendor.state} · from{' '}
                      {formatNairaShort(vendor.priceFrom)} {vendor.priceUnit}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </motion.section>

          <motion.section variants={riseIn} aria-label="Browse by category">
            <h2 className="section-title">Browse by category</h2>
            <ul className="cats">
              <li>
                <a className="cat" href="#/venues">
                  <span className="cat__mark" aria-hidden="true">
                    🏛️
                  </span>
                  <span className="cat__label">Venues</span>
                  <span className="cat__blurb">
                    Halls, gardens, rooftops — {venues.length} listed
                  </span>
                </a>
              </li>
              {VENDOR_CATEGORIES.map((category) => (
                <li key={category.slug}>
                  <a className="cat" href={`#/explore/${category.slug}`}>
                    <span className="cat__mark" aria-hidden="true">
                      {category.emoji}
                    </span>
                    <span className="cat__label">{category.label}</span>
                    <span className="cat__blurb">{category.blurb}</span>
                  </a>
                </li>
              ))}
            </ul>
          </motion.section>
        </>
      )}
    </AppShell>
  )
}
