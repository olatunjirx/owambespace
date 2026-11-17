import { useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'

import { AppShell } from './AppShell'
import { CreateEventDrawer } from './CreateEventDrawer'
import { NextActionBand } from './NextActionBand'
import { FilterIcon, SearchIcon } from '../../components/AppIcons'
import { eventPath } from './EventShell'
import { formatNairaShort } from '../../lib/money'
import {
  activeBookings,
  budgetTotals,
  checklistProgress,
  countdownLabel,
  daysUntil,
  EVENT_TYPES,
  eventStage,
  formatShortDate,
  guestTotals,
  missingPieces,
} from '../../lib/events'
import type { EventRecord, EventStage } from '../../lib/events'
import { riseIn, softSpring } from '../../motion/variants'
import { navigate } from '../../router/hashRouter'
import { useEvents } from '../../state/Events'
import './events-list.css'
import './host.css'

type EventsListScreenProps = {
  firstName: string
  /** Driven by the /host/new route, so the panel is linkable and Back closes it. */
  createOpen?: boolean
}

const TABS: { id: EventStage; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'planning', label: 'In planning' },
  { id: 'past', label: 'Past' },
]

/**
 * Every event the host is running.
 *
 * Three tabs, not four: an event is either committed, still being planned, or
 * over — "All" would be a fourth decision nobody asked for. Tabs carry counts
 * and empty ones are disabled, so no tap ever lands on another empty screen.
 */
export function EventsListScreen({ firstName, createOpen = false }: EventsListScreenProps) {
  const { events } = useEvents()
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const byStage = useMemo(() => {
    const groups: Record<EventStage, EventRecord[]> = {
      upcoming: [],
      planning: [],
      past: [],
    }

    const needle = query.trim().toLowerCase()
    const matching = events.filter((event) => {
      if (typeFilter && event.type !== typeFilter) return false
      if (!needle) return true
      return `${event.name} ${event.type} ${event.city} ${event.state}`
        .toLowerCase()
        .includes(needle)
    })

    // Soonest first; events without a date have nothing urgent about them yet.
    const ordered = [...matching].sort((a, b) => {
      const left = daysUntil(a.date)
      const right = daysUntil(b.date)
      if (left === null && right === null) return b.createdISO.localeCompare(a.createdISO)
      if (left === null) return 1
      if (right === null) return -1
      return Math.abs(left) - Math.abs(right)
    })

    for (const event of ordered) groups[eventStage(event)].push(event)
    return groups
  }, [events, query, typeFilter])

  // Opens on whichever tab actually has something in it, so the first thing
  // the host sees is never an empty list.
  const [tab, setTab] = useState<EventStage>(() =>
    byStage.upcoming.length > 0
      ? 'upcoming'
      : byStage.planning.length > 0
        ? 'planning'
        : 'upcoming',
  )

  const visible = byStage[tab]
  const hasAny = events.length > 0
  const matches = byStage.upcoming.length + byStage.planning.length + byStage.past.length
  const closeDrawer = useCallback(() => navigate('/host'), [])
  const filtering = Boolean(query.trim() || typeFilter)

  const clearFilters = useCallback(() => {
    setQuery('')
    setTypeFilter('')
  }, [])

  return (
    <AppShell
      section="events"
      pageKey="events"
      title={firstName ? `Your events, ${firstName}` : 'Your events'}
      subtitle={
        hasAny
          ? `${byStage.upcoming.length} coming up · ${byStage.planning.length} still being planned.`
          : undefined
      }
      // Suppressed at zero: the empty state below already carries the primary
      // action, and two primaries on one screen is one too many.
      actions={
        hasAny ? (
          <a className="button-primary" href="#/host/new">
            New event
          </a>
        ) : null
      }
    >
      {hasAny ? (
        <>
          {/* Hidden while filtering — the band answers "what next", which is
              not the question someone searching for a name is asking. */}
          {!filtering && <NextActionBand events={events} />}

          <motion.div
            className="stage-tabs"
            role="tablist"
            aria-label="Filter events"
            variants={riseIn}
          >
            {TABS.map((item) => {
              const count = byStage[item.id].length
              const current = tab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={current}
                  // A tab with nothing behind it is a dead end, so it is not
                  // offered rather than punishing the tap.
                  disabled={count === 0}
                  className={`stage-tabs__tab${current ? ' stage-tabs__tab--on' : ''}`}
                  onClick={() => setTab(item.id)}
                >
                  {current && (
                    <motion.span
                      layoutId="stage-tab-underline"
                      className="stage-tabs__underline"
                      transition={softSpring}
                    />
                  )}
                  {item.label}
                  <span className="stage-tabs__count">{count}</span>
                </button>
              )
            })}
          </motion.div>

          <motion.div className="list-tools" variants={riseIn}>
            <label className="list-search">
              <span className="sr-only">Search events</span>
              <span className="list-search__icon" aria-hidden="true">
                <SearchIcon />
              </span>
              <input
                type="search"
                className="list-search__input"
                placeholder="Search events"
                value={query}
                onChange={(changed) => setQuery(changed.target.value)}
              />
            </label>

            <label className="list-filter">
              <span className="list-filter__icon" aria-hidden="true">
                <FilterIcon />
              </span>
              <span className="sr-only">Filter by event type</span>
              <select
                className="list-filter__select"
                value={typeFilter}
                onChange={(changed) => setTypeFilter(changed.target.value)}
              >
                <option value="">All types</option>
                {EVENT_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </motion.div>

          {matches === 0 ? (
            <motion.div className="empty" variants={riseIn}>
              <p className="empty__title">Nothing matches</p>
              <p className="empty__body">
                Search covers the event name, type and where it is happening.
              </p>
              <div className="empty__action">
                <button type="button" className="button-neutral" onClick={clearFilters}>
                  Clear search and filter
                </button>
              </div>
            </motion.div>
          ) : (
          <motion.ul className="event-grid" variants={riseIn}>
            {visible.map((event) => (
              <EventCard key={event.id} event={event} stage={tab} />
            ))}

            {tab !== 'past' && (
              <li className="event-new">
                <a className="event-new__link" href="#/host/new">
                  <span className="event-new__plus" aria-hidden="true">
                    +
                  </span>
                  <span className="event-new__label">Plan another event</span>
                  <span className="event-new__hint">
                    A new workspace with its own checklist
                  </span>
                </a>
              </li>
            )}
          </motion.ul>
          )}
        </>
      ) : (
        <motion.div className="zero" variants={riseIn}>
          <span className="zero__mark" aria-hidden="true">
            🎉
          </span>
          <h2 className="zero__title">Your first event starts here</h2>
          <p className="zero__body">
            Tell us what you are planning and you get a workspace of your own —
            a checklist built for that kind of event, somewhere to shortlist
            venues, and a running total of what you have spent.
          </p>
          <div className="zero__actions">
            <a className="button-primary" href="#/host/new">
              Plan your first event
            </a>
            <a className="button-neutral" href="#/explore">
              Explore venues & services
            </a>
          </div>
        </motion.div>
      )}

      <CreateEventDrawer open={createOpen} onClose={closeDrawer} />
    </AppShell>
  )
}

function EventCard({ event, stage }: { event: EventRecord; stage: EventStage }) {
  const guests = guestTotals(event.guests)
  const budget = budgetTotals(event)
  const checklist = checklistProgress(event)
  const bookings = activeBookings(event)
  const missing = missingPieces(event)

  const venue = bookings.some((booking) => booking.status === 'confirmed')
    ? 'Booked'
    : event.saved.length > 0
        ? `${event.saved.length} saved`
        : 'None yet'

  const ratio = checklist.total > 0 ? checklist.done / checklist.total : 0
  const days = daysUntil(event.date)
  const soon = days !== null && days >= 0 && days <= 30

  return (
    <motion.li
      className={`event-card${stage === 'past' ? ' event-card--past' : ''}`}
      layout
      whileHover={stage === 'past' ? undefined : { y: -2 }}
      transition={softSpring}
    >
      {/* The whole card is the target — resuming should never need precision. */}
      <a className="event-card__link" href={eventPath(event.id)}>
        <div className="event-card__top">
          <span className="event-card__type">{event.type}</span>
          <span className={`tag ${soon ? 'tag--warn' : 'tag--accent'}`}>
            {countdownLabel(event.date)}
          </span>
        </div>

        <h2 className="event-card__name">{event.name}</h2>
        <p className="event-card__where">
          {formatShortDate(event.date)}
          {event.state && ` · ${event.city ? `${event.city}, ` : ''}${event.state}`}
        </p>

        {stage === 'planning' && missing.length > 0 && (
          <p className="event-card__missing">Still needs {missing.join(' and ')}.</p>
        )}

        <dl className="event-card__facts">
          <div>
            <dt>Venue</dt>
            <dd>{venue}</dd>
          </div>
          <div>
            <dt>Guests</dt>
            <dd>
              {guests.invited === 0
                ? `${event.guestEstimate || 0} expected`
                : `${guests.headCount} of ${guests.invited} confirmed`}
            </dd>
          </div>
          <div>
            <dt>Budget</dt>
            <dd>
              {formatNairaShort(budget.spent)} of {formatNairaShort(budget.budget)}
            </dd>
          </div>
        </dl>

        <div className="event-card__progress">
          <div className="event-card__progress-head">
            <span>{stage === 'planning' ? 'Continue planning' : 'Checklist'}</span>
            <span>
              {checklist.done}/{checklist.total}
            </span>
          </div>
          <div className="meter">
            <motion.div
              className="meter__fill"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: ratio }}
              transition={softSpring}
            />
          </div>
        </div>
      </a>
    </motion.li>
  )
}
