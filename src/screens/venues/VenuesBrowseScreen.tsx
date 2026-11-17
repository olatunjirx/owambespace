import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { AppShell } from '../host/AppShell'
import { VenueCard } from './VenueCard'
import { EventTargetPicker, useEventTarget } from './EventTargetPicker'
import {
  AMENITIES,
  NO_FILTERS,
  allVenues,
  areasIn,
  countFilters,
  filterVenues,
  venueSpaceTypes,
  venueStates,
} from '../../lib/venues'
import type { VenueFilters, VenueSort } from '../../lib/venues'
import { riseIn } from '../../motion/variants'
import { useEvents } from '../../state/Events'
import './venues.css'
import '../host/host.css'

const SORTS: { id: VenueSort; label: string }[] = [
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'rating', label: 'Highest rated' },
  { id: 'capacity', label: 'Largest first' },
]

/**
 * The venue directory.
 *
 * Browsing is global — a host looking for a hall should not have to create an
 * event first. The event only becomes relevant at the point of saving or
 * booking, which is what the target picker above the results is for.
 */
export function VenuesBrowseScreen() {
  const { events, toggleSavedVenue } = useEvents()
  const { targetId, setTargetId, target } = useEventTarget()

  const [filters, setFilters] = useState<VenueFilters>(() => ({ ...NO_FILTERS }))
  const [showAllFilters, setShowAllFilters] = useState(false)

  // Read per render: owner listings can go live while this screen is open.
  const venues = allVenues()
  const states = venueStates()
  const spaceTypes = venueSpaceTypes()
  const results = useMemo(() => filterVenues(venues, filters), [venues, filters])
  const activeCount = countFilters(filters)
  const areas = useMemo(() => areasIn(filters.state), [filters.state])

  function patch(next: Partial<VenueFilters>): void {
    setFilters((current) => ({ ...current, ...next }))
  }

  function toggleAmenity(amenity: string): void {
    setFilters((current) => ({
      ...current,
      amenities: current.amenities.includes(amenity)
        ? current.amenities.filter((item) => item !== amenity)
        : [...current.amenities, amenity],
    }))
  }

  return (
    <AppShell
      section="explore"
      pageKey="venues"
      title="Event centres"
      subtitle={`${venues.length} venues across ${states.length} states. Filter by where you are, how many are coming and what you can spend.`}
      actions={
        activeCount > 0 ? (
          <button
            type="button"
            className="ghost-button"
            onClick={() => setFilters({ ...NO_FILTERS })}
          >
            Clear {activeCount} filter{activeCount === 1 ? '' : 's'}
          </button>
        ) : null
      }
    >
      {events.length > 0 && (
        <motion.div variants={riseIn}>
          <EventTargetPicker
            events={events}
            targetId={targetId}
            onChange={setTargetId}
            onUseEventDetails={
              target
                ? () =>
                    patch({
                      state: states.includes(target.state) ? target.state : '',
                      minCapacity: target.guestEstimate || 0,
                    })
                : undefined
            }
          />
        </motion.div>
      )}

      <motion.section className="card filters" variants={riseIn} aria-label="Filters">
        <div className="filters__row">
          <label className="filters__field filters__field--grow">
            <span className="filters__label">Search</span>
            <input
              className="filters__input"
              type="search"
              placeholder="Name, area or style"
              value={filters.query}
              onChange={(event) => patch({ query: event.target.value })}
            />
          </label>

          <label className="filters__field">
            <span className="filters__label">State</span>
            <select
              className="filters__input"
              value={filters.state}
              onChange={(event) => patch({ state: event.target.value, area: '' })}
            >
              <option value="">Anywhere</option>
              {states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>

          <label className="filters__field">
            <span className="filters__label">Area</span>
            <select
              className="filters__input"
              value={filters.area}
              onChange={(event) => patch({ area: event.target.value })}
            >
              <option value="">All areas</option>
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </label>

          <label className="filters__field">
            <span className="filters__label">Seats at least</span>
            <input
              className="filters__input"
              type="number"
              min={0}
              step={50}
              placeholder="Any"
              value={filters.minCapacity || ''}
              onChange={(event) => patch({ minCapacity: Number(event.target.value) || 0 })}
            />
          </label>

          <label className="filters__field">
            <span className="filters__label">Up to ₦ / day</span>
            <input
              className="filters__input"
              type="number"
              min={0}
              step={100_000}
              placeholder="Any"
              value={filters.maxPrice || ''}
              onChange={(event) => patch({ maxPrice: Number(event.target.value) || 0 })}
            />
          </label>
        </div>

        <AnimatePresence initial={false}>
          {showAllFilters && (
            <motion.div
              className="filters__more"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="filters__row filters__row--wrap">
                <label className="filters__field">
                  <span className="filters__label">Space type</span>
                  <select
                    className="filters__input"
                    value={filters.spaceType}
                    onChange={(event) => patch({ spaceType: event.target.value })}
                  >
                    <option value="">Any type</option>
                    {spaceTypes.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="filters__field">
                  <span className="filters__label">Minimum rating</span>
                  <select
                    className="filters__input"
                    value={filters.minRating}
                    onChange={(event) => patch({ minRating: Number(event.target.value) })}
                  >
                    <option value={0}>Any rating</option>
                    <option value={4}>4.0 and above</option>
                    <option value={4.5}>4.5 and above</option>
                  </select>
                </label>

              </div>

              <fieldset className="filters__amenities">
                <legend className="filters__label">Must have</legend>
                <div className="filters__chips">
                  {AMENITIES.map((amenity) => {
                    const on = filters.amenities.includes(amenity)
                    return (
                      <button
                        key={amenity}
                        type="button"
                        className={`filter-chip${on ? ' filter-chip--on' : ''}`}
                        aria-pressed={on}
                        onClick={() => toggleAmenity(amenity)}
                      >
                        {amenity}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="filters__footer">
          <button
            type="button"
            className="ghost-button ghost-button--small"
            aria-expanded={showAllFilters}
            onClick={() => setShowAllFilters((current) => !current)}
          >
            {showAllFilters ? 'Fewer filters' : 'More filters'}
          </button>

          <p className="filters__summary" role="status">
            {results.length} venue{results.length === 1 ? '' : 's'} match
          </p>

          <label className="filters__sort">
            <span className="sr-only">Sort by</span>
            <select
              className="filters__input"
              value={filters.sort}
              onChange={(event) => patch({ sort: event.target.value as VenueSort })}
            >
              {SORTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </motion.section>

      {results.length === 0 ? (
        <motion.div className="empty" variants={riseIn}>
          <p className="empty__title">Nothing matches those filters</p>
          <p className="empty__body">
            Try a wider price ceiling, a lower seat count, or drop one of the
            must-have amenities. More venues join every week.
          </p>
          <div className="empty__action">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setFilters({ ...NO_FILTERS })}
            >
              Clear filters
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.ul className="venue-grid" variants={riseIn}>
          {/*
            No exit animation on a filtered list: a card that is no longer a
            match has to leave the moment the filter changes, and the count in
            the summary above must always describe what is on screen.
          */}
          {results.map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              saved={Boolean(target?.saved.includes(venue.id))}
              canSave={Boolean(target)}
              budget={target?.budget ?? 0}
              onSave={() => target && toggleSavedVenue(target.id, venue.id)}
            />
          ))}
        </motion.ul>
      )}
    </AppShell>
  )
}
