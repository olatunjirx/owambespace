import { bookingPath, href } from './ownerPaths'
import { daysUntil } from '../../lib/events'
import { formatNaira } from '../../lib/money'
import { payoutFor, unreadCount } from '../../lib/owner'
import type { OwnerBooking } from '../../lib/owner'
import { useOwner } from '../../state/Owner'

const MONTH = new Intl.DateTimeFormat('en-NG', { month: 'short' })
const WEEKDAY = new Intl.DateTimeFormat('en-NG', { weekday: 'short' })

function parts(iso: string): { day: string; month: string; weekday: string } {
  const date = new Date(`${iso}T00:00:00`)
  return { day: String(date.getDate()), month: MONTH.format(date), weekday: WEEKDAY.format(date) }
}

/** The one line that tells the owner what this booking wants from them. */
export function bookingCue(booking: OwnerBooking): { text: string; tone: 'warn' | 'good' | 'muted' | 'accent' } {
  const days = daysUntil(booking.date) ?? 0
  switch (booking.status) {
    case 'confirmed':
      if (days < 0) return { text: 'Mark complete', tone: 'accent' }
      if (days === 0) return { text: 'Today', tone: 'good' }
      return { text: `In ${days} day${days === 1 ? '' : 's'}`, tone: 'good' }
    case 'completed':
      return { text: 'Completed', tone: 'muted' }
    default:
      return { text: 'Cancelled', tone: 'muted' }
  }
}

type BookingRowProps = {
  booking: OwnerBooking
  /** Hides the money column, for the narrower dashboard cards. */
  compact?: boolean
}

export function BookingRow({ booking, compact = false }: BookingRowProps) {
  const { state } = useOwner()
  const venue = state.venues.find((entry) => entry.id === booking.venueId)
  const date = parts(booking.date)
  const unread = unreadCount(booking)
  const cue = unread > 0 ? { text: 'New message', tone: 'accent' as const } : bookingCue(booking)
  const showVenue = state.venues.length > 1

  return (
    <li>
      <a className={`brow${compact ? ' brow--compact' : ''}`} href={href(bookingPath(booking.id))}>
        <span className="brow__date" aria-hidden="true">
          <span className="brow__month">{date.month}</span>
          <span className="brow__day">{date.day}</span>
          <span className="brow__weekday">{date.weekday}</span>
        </span>

        <span className="brow__main">
          <span className="brow__title">
            {booking.eventName}
            {booking.source === 'sample' && <span className="tag tag--muted">Sample</span>}
          </span>
          <span className="brow__meta">
            {booking.hostName} · {booking.eventType} · {booking.guests.toLocaleString('en-NG')} guests
            {showVenue && venue ? ` · ${venue.name}` : ''}
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
