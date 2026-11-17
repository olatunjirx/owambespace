import { bookingCue } from '../owner/BookingRow'
import { bookingPath, href } from './providerPaths'
import { formatNaira } from '../../lib/money'
import { payoutFor, unreadCount } from '../../lib/owner'
import type { ProviderBooking } from '../../lib/provider'

const MONTH = new Intl.DateTimeFormat('en-NG', { month: 'short' })
const WEEKDAY = new Intl.DateTimeFormat('en-NG', { weekday: 'short' })
const DATE = new Intl.DateTimeFormat('en-NG', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })

/** One booking as a dashboard row — the owner's `.brow`, with the package in place of the venue. */
export function ProviderBookingRow({ booking, compact = false }: { booking: ProviderBooking; compact?: boolean }) {
  const date = new Date(`${booking.date}T00:00:00`)
  const unread = unreadCount(booking)
  const cue = unread > 0 ? { text: 'New message', tone: 'accent' as const } : bookingCue(booking)

  return (
    <li>
      <a className={`brow${compact ? ' brow--compact' : ''}`} href={href(bookingPath(booking.id))}>
        <span className="brow__date" aria-hidden="true">
          <span className="brow__month">{MONTH.format(date)}</span>
          <span className="brow__day">{date.getDate()}</span>
          <span className="brow__weekday">{WEEKDAY.format(date)}</span>
        </span>
        <span className="brow__main">
          <span className="brow__title">
            {booking.eventName}
            {booking.source === 'sample' && <span className="tag tag--muted">Sample</span>}
          </span>
          <span className="brow__meta">
            {booking.hostName} · {booking.packageName} · {booking.guests.toLocaleString('en-NG')} guests
          </span>
        </span>
        {!compact && (
          <span className="brow__money">
            <span className="brow__total">{formatNaira(booking.total)}</span>
            <span className="brow__net">You get {formatNaira(payoutFor(booking.total).net)}</span>
          </span>
        )}
        <span className={`brow__cue brow__cue--${cue.tone}`}>{cue.text}</span>
      </a>
    </li>
  )
}

/** The bookings list as a table — same columns and classes as the owner's. */
export function ProviderBookingTable({
  bookings,
  onOpen,
}: {
  bookings: ProviderBooking[]
  onOpen: (id: string) => void
}) {
  return (
    <div className="history-wrap">
      <table className="history history--venues">
        <thead>
          <tr>
            <th scope="col" className="history__date">Event date</th>
            <th scope="col" className="history__event">Event</th>
            <th scope="col" className="history__venue">Package</th>
            <th scope="col" className="history__guests">Guests</th>
            <th scope="col" className="history__status">Status</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => {
            const cue = bookingCue(booking)
            const unread = unreadCount(booking)
            return (
              <tr
                key={booking.id}
                className={`history__row${booking.status === 'cancelled' ? ' history__row--lost' : ''}`}
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
                <td className="history__venue" title={booking.packageName}>
                  {booking.packageName}
                </td>
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
