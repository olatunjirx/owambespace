import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

import { BookingDrawer } from './BookingDrawer'
import { BookingTable } from './BookingTable'
import { OwnerShell } from './OwnerShell'
import { bookingPath } from './ownerPaths'
import { daysUntil } from '../../lib/events'
import { unreadCount } from '../../lib/owner'
import type { OwnerBooking } from '../../lib/owner'
import { riseIn, softSpring } from '../../motion/variants'
import { navigate } from '../../router/hashRouter'
import { useOwner } from '../../state/Owner'

export type BookingTab = 'upcoming' | 'past' | 'cancelled'

export const BOOKING_TABS: { id: BookingTab; label: string; empty: string }[] = [
  {
    id: 'upcoming',
    label: 'Upcoming',
    empty: 'No confirmed events yet. When a host books an open date, it shows up here.',
  },
  {
    id: 'past',
    label: 'Past',
    empty: 'Events that have happened at your venues will collect here.',
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    empty: 'No cancelled bookings.',
  },
]

export function tabFor(booking: OwnerBooking): BookingTab {
  if (booking.status === 'cancelled') return 'cancelled'
  if (booking.status === 'completed') return 'past'
  // A confirmed event whose day has passed still needs marking complete, so
  // it stays in Upcoming where the owner is looking.
  return 'upcoming'
}

type BookingsScreenProps = {
  tab?: BookingTab
  bookingId?: string
}

/**
 * Every booking across every venue, by what it needs.
 *
 * The open booking lives in the URL (/owner/bookings/<id>) so a notification
 * can link straight to it and Back closes it; the tab behind it is whichever
 * one that booking belongs to.
 */
export function BookingsScreen({ tab: routeTab, bookingId }: BookingsScreenProps) {
  const { state, bookings } = useOwner()
  const [venueFilter, setVenueFilter] = useState('')
  const [query, setQuery] = useState('')

  const open = bookingId ? bookings.find((booking) => booking.id === bookingId) : undefined
  const unread = bookings.reduce((sum, booking) => sum + unreadCount(booking), 0)
  const tab: BookingTab = routeTab ?? (open ? tabFor(open) : 'upcoming')

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const groups: Record<BookingTab, OwnerBooking[]> = { upcoming: [], past: [], cancelled: [] }
    for (const booking of bookings) {
      if (venueFilter && booking.venueId !== venueFilter) continue
      if (needle && !`${booking.eventName} ${booking.hostName} ${booking.eventType}`.toLowerCase().includes(needle)) {
        continue
      }
      groups[tabFor(booking)].push(booking)
    }
    // Past reads newest first; everything else soonest first.
    groups.past.reverse()
    groups.cancelled.sort((a, b) => b.createdISO.localeCompare(a.createdISO))
    return groups
  }, [bookings, venueFilter, query])

  const list = grouped[tab]
  const thisWeek = grouped.upcoming.filter((booking) => {
    const days = daysUntil(booking.date) ?? -1
    return days >= 0 && days <= 7
  }).length

  return (
    <OwnerShell
      section="bookings"
      pageKey="owner-bookings"
      title="Bookings"
      subtitle={
        unread > 0
          ? `${unread} new message${unread === 1 ? '' : 's'} from hosts.`
          : thisWeek > 0
            ? `${thisWeek} event${thisWeek === 1 ? '' : 's'} this week.`
            : 'Every paid booking at your venues.'
      }
    >
      <motion.div className="owner-tabs-row" variants={riseIn}>
        <div className="owner-tabs" role="tablist" aria-label="Booking status">
          {BOOKING_TABS.map((entry) => {
            const current = entry.id === tab
            const count = grouped[entry.id].length
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={current}
                className={`owner-tab${current ? ' owner-tab--current' : ''}`}
                onClick={() => navigate(`/owner/bookings/${entry.id}`, true)}
              >
                {current && (
                  <motion.span layoutId="owner-tab-pill" className="owner-tab__pill" transition={softSpring} />
                )}
                <span className="owner-tab__label">{entry.label}</span>
                <span className="owner-tab__count">{count}</span>
              </button>
            )
          })}
        </div>

        <div className="owner-filters">
          {state.venues.length > 1 && (
            <select
              className="filters__input"
              aria-label="Venue"
              value={venueFilter}
              onChange={(event) => setVenueFilter(event.target.value)}
            >
              <option value="">All venues</option>
              {state.venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name || 'Untitled venue'}
                </option>
              ))}
            </select>
          )}
          <input
            className="filters__input"
            type="search"
            placeholder="Search event or host"
            aria-label="Search bookings"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </motion.div>

      <motion.section className="card card--flush" variants={riseIn} key={tab}>
        {list.length === 0 ? (
          <div className="owner-empty">
            <p className="empty__title">
              {query || venueFilter ? 'Nothing matches' : BOOKING_TABS.find((entry) => entry.id === tab)?.label}
            </p>
            <p className="empty__body">
              {query || venueFilter
                ? 'Try a different search or venue.'
                : BOOKING_TABS.find((entry) => entry.id === tab)?.empty}
            </p>
          </div>
        ) : (
          <BookingTable
            bookings={list}
            onOpen={(id) => navigate(bookingPath(id))}
            showVenue={state.venues.length > 1 && !venueFilter}
          />
        )}
      </motion.section>

      <BookingDrawer
        booking={open}
        onClose={() => navigate(`/owner/bookings/${tab}`)}
      />
    </OwnerShell>
  )
}
