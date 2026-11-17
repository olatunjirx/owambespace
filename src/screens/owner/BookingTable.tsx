import { bookingCue } from './BookingRow'
import { unreadCount } from '../../lib/owner'
import type { OwnerBooking } from '../../lib/owner'
import { useOwner } from '../../state/Owner'

const DATE = new Intl.DateTimeFormat('en-NG', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })

type BookingTableProps = {
  bookings: OwnerBooking[]
  onOpen: (id: string) => void
  /** Adds a Venue column, for lists that span more than one venue. */
  showVenue?: boolean
}

/**
 * The one layout for a list of bookings: what, when, where, how many, and what
 * it needs. Everything else (host, money, extras) is in the drawer. One line
 * per row, on fixed columns, so a long name can't push another column around.
 */
export function BookingTable({ bookings, onOpen, showVenue = false }: BookingTableProps) {
  const { state } = useOwner()
  const venueName = (id: string) => state.venues.find((venue) => venue.id === id)?.name || 'Untitled venue'

  return (
    <div className="history-wrap">
      <table className={`history${showVenue ? ' history--venues' : ''}`}>
        <thead>
          <tr>
            <th scope="col" className="history__date">Event date</th>
            <th scope="col" className="history__event">Event</th>
            {showVenue && <th scope="col" className="history__venue">Venue</th>}
            <th scope="col" className="history__guests">Guests</th>
            <th scope="col" className="history__status">Status</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => {
            const cue = bookingCue(booking)
            const lost = booking.status === 'cancelled'
            const unread = unreadCount(booking)
            return (
              <tr
                key={booking.id}
                className={`history__row${lost ? ' history__row--lost' : ''}`}
                onClick={() => onOpen(booking.id)}
              >
                <td className="history__date">{DATE.format(new Date(`${booking.date}T00:00:00`))}</td>
                <td className="history__event">
                  <span className="history__name">
                    {unread > 0 && <span className="history__unread" role="img" aria-label="New message" />}
                    <button
                      type="button"
                      className="history__open"
                      title={booking.eventName}
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpen(booking.id)
                      }}
                    >
                      {booking.eventName}
                    </button>
                    {booking.source === 'sample' && <span className="tag tag--muted">Sample</span>}
                  </span>
                </td>
                {showVenue && (
                  <td className="history__venue" title={venueName(booking.venueId)}>
                    {venueName(booking.venueId)}
                  </td>
                )}
                <td className="history__guests">{booking.guests.toLocaleString('en-NG')}</td>
                <td className="history__status">
                  <span className={`brow__cue brow__cue--${cue.tone}`}>{cue.text}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
