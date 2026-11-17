import { useRef } from 'react'

import { Drawer } from '../../components/Drawer'
import { BookingChat } from '../owner/BookingChat'
import { formatEventDate } from '../../lib/events'
import type { Booking } from '../../lib/events'
import { chatAccess, hostChatId, phoneReleaseDate, phoneVisible } from '../../lib/owner'
import { findVenue } from '../../lib/venues'
import { useOwner } from '../../state/Owner'
import './event-venues.css'

type HostBookingDrawerProps = {
  eventId: string
  booking: Booking | undefined
  onClose: () => void
}

const GUIDE_ROWS = [
  { key: 'arrival', label: 'Arrival and gates' },
  { key: 'parking', label: 'Parking and vendor vehicles' },
  { key: 'setup', label: 'Set-up and clear-down' },
  { key: 'power', label: 'Power' },
] as const

/**
 * Everything a host needs once a venue is paid for: where it is, how the day
 * works, and a way to reach the venue. It lives behind a booking because none
 * of it should exist for someone who has not paid.
 */
export function HostBookingDrawer({ eventId, booking: current, onClose }: HostBookingDrawerProps) {
  const { state, sendHostMessage } = useOwner()
  const lastShown = useRef(current)
  if (current) lastShown.current = current
  const booking = current ?? lastShown.current
  if (!booking) return null

  const venue = findVenue(booking.venueId)
  if (!venue) return null

  const after = venue.afterBooking
  const chatId = hostChatId(eventId, booking.id)
  const balancePaid = Boolean(booking.balancePaidISO)
  const showPhone = phoneVisible(booking.date, balancePaid)

  return (
    <Drawer
      open={Boolean(current)}
      onClose={onClose}
      title={venue.name}
      subtitle={formatEventDate(booking.date)}
    >
      <div className="hbooking">
        <section>
          <h3 className="section-title">Exact address</h3>
          {after?.address ? (
            <>
              <p className="hbooking__text">{after.address}</p>
              {after.directions && <p className="hbooking__sub">{after.directions}</p>}
            </>
          ) : (
            <p className="hbooking__sub">This venue hasn’t added its exact address yet. You can ask below.</p>
          )}
        </section>

        <section>
          <h3 className="section-title">Event Day Guide</h3>
          {after && GUIDE_ROWS.some((row) => after.guide[row.key].trim()) ? (
            <dl className="hbooking__guide">
              {GUIDE_ROWS.filter((row) => after.guide[row.key].trim()).map((row) => (
                <div key={row.key}>
                  <dt>{row.label}</dt>
                  <dd>{after.guide[row.key]}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="hbooking__sub">This venue hasn’t added its guide yet. You can ask below.</p>
          )}
        </section>

        <section>
          <h3 className="section-title">Event-day number</h3>
          {!after?.phone ? (
            <p className="hbooking__sub">This venue hasn’t added an event-day number yet.</p>
          ) : showPhone ? (
            <a className="hbooking__phone" href={`tel:${after.phone.replace(/[^\d+]/g, '')}`}>
              {after.phone}
            </a>
          ) : (
            <p className="hbooking__sub">
              Appears from {formatEventDate(phoneReleaseDate(booking.date))}
              {balancePaid ? '.' : ', once your balance is paid.'}
            </p>
          )}
        </section>

        <BookingChat
          key={chatId}
          viewer="host"
          otherName={venue.name}
          messages={state.overlays[chatId]?.messages ?? []}
          access={chatAccess(booking.status === 'cancelled' ? 'cancelled' : 'confirmed', booking.date)}
          onSend={(text) => sendHostMessage(chatId, text)}
        />
      </div>
    </Drawer>
  )
}
