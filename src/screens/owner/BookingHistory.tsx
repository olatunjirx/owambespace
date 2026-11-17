import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

import { BookingDrawer } from './BookingDrawer'
import { BookingTable } from './BookingTable'
import { BOOKING_TABS, tabFor } from './BookingsScreen'
import type { BookingTab } from './BookingsScreen'
import { href, promotePath } from './ownerPaths'
import type { OwnerBooking } from '../../lib/owner'
import { softSpring } from '../../motion/variants'

type Filter = 'all' | BookingTab

/** What's coming first, then what has been. */
const ORDER: Record<BookingTab, number> = { upcoming: 0, past: 1, cancelled: 2 }

function sortHistory(bookings: OwnerBooking[]): OwnerBooking[] {
  return [...bookings].sort((a, b) => {
    const group = ORDER[tabFor(a)] - ORDER[tabFor(b)]
    if (group !== 0) return group
    // Upcoming reads soonest first; anything already behind us, newest first.
    const forward = tabFor(a) === 'upcoming'
    return forward ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
  })
}

/**
 * Every booking this one venue has had, as a table the owner can scan.
 *
 * Rows open the same drawer as the Bookings screen, in place, so reading a
 * message never takes the owner off this venue.
 */
export function BookingHistory({ bookings, venueId }: { bookings: OwnerBooking[]; venueId: string }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const sorted = useMemo(() => sortHistory(bookings), [bookings])
  const rows = filter === 'all' ? sorted : sorted.filter((booking) => tabFor(booking) === filter)
  const open = openId ? bookings.find((booking) => booking.id === openId) : undefined

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: bookings.length },
    ...BOOKING_TABS.map((tab) => ({
      id: tab.id,
      label: tab.label,
      count: bookings.filter((booking) => tabFor(booking) === tab.id).length,
    })),
  ]

  return (
    <>
      {bookings.length > 0 && (
        <div className="owner-tabs" role="tablist" aria-label="Filter booking history">
          {filters.map((entry) => {
            const current = entry.id === filter
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={current}
                className={`owner-tab${current ? ' owner-tab--current' : ''}`}
                onClick={() => setFilter(entry.id)}
              >
                {current && (
                  <motion.span layoutId="history-tab-pill" className="owner-tab__pill" transition={softSpring} />
                )}
                <span className="owner-tab__label">{entry.label}</span>
                <span className="owner-tab__count">{entry.count}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="card card--flush">
        {bookings.length === 0 ? (
          <div className="owner-empty">
            <p className="empty__title">No bookings yet</p>
            <p className="empty__body">
              Confirmed events for this venue will build up here. Sharing your listing is the quickest
              way to get the first one.
            </p>
            <div className="empty__action">
              <a className="ghost-button" href={href(promotePath(venueId))}>
                Share your listing
              </a>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="owner-empty">
            <p className="empty__title">Nothing here</p>
            <p className="empty__body">{BOOKING_TABS.find((tab) => tab.id === filter)?.empty}</p>
          </div>
        ) : (
          <BookingTable bookings={rows} onOpen={setOpenId} />
        )}
      </div>

      <BookingDrawer booking={open} onClose={() => setOpenId(null)} />
    </>
  )
}
