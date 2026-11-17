import { useState } from 'react'
import { motion } from 'framer-motion'

import { EventShell } from './EventShell'
import { HostBookingDrawer } from './HostBookingDrawer'
import { activeBookings, formatEventDate } from '../../lib/events'
import type { Booking, EventRecord } from '../../lib/events'
import { formatNaira, formatNairaShort } from '../../lib/money'
import { findVenue } from '../../lib/venues'
import { riseIn, softSpring } from '../../motion/variants'
import { useEvents } from '../../state/Events'
import './event-venues.css'
import './host.css'

type EventVenuesScreenProps = {
  event: EventRecord
}

/**
 * This event's venues: what is booked, and what is still on the shortlist.
 *
 * Bookings come first because they are decisions; saved venues are still
 * options, and options should not outrank commitments on the page.
 */
export function EventVenuesScreen({ event }: EventVenuesScreenProps) {
  const { toggleSavedVenue, cancelBooking, payBalance } = useEvents()
  const [openId, setOpenId] = useState<string | null>(null)

  const bookings = activeBookings(event)
  const saved = event.saved
    .map((id) => findVenue(id))
    .filter((venue): venue is NonNullable<typeof venue> => Boolean(venue))

  return (
    <EventShell
      event={event}
      tab="venues"
      title="Venues"
      subtitle={
        bookings.length === 0 && saved.length === 0
          ? 'Nothing here yet. Browse the directory and save the ones worth a second look.'
          : `${bookings.length} booked · ${saved.length} saved.`
      }
      actions={
        <a className="ghost-button" href="#/venues">
          Browse venues
        </a>
      }
    >
      {bookings.length === 0 && saved.length === 0 ? (
        <motion.div className="empty" variants={riseIn}>
          <p className="empty__title">No venues yet</p>
          <p className="empty__body">
            Filter the directory by your state and guest count, save the ones
            you like, then book when you have decided.
          </p>
          <div className="empty__action">
            <a className="ghost-button" href="#/venues">
              Find a venue
            </a>
          </div>
        </motion.div>
      ) : (
        <>
          {bookings.length > 0 && (
            <motion.section variants={riseIn}>
              <h2 className="section-title">Booked</h2>
              <ul className="booking-list">
                {bookings.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    onCancel={() => cancelBooking(event.id, booking.id)}
                    onOpen={() => setOpenId(booking.id)}
                    onPayBalance={() => payBalance(event.id, booking.id)}
                  />
                ))}
              </ul>
            </motion.section>
          )}

          {saved.length > 0 && (
            <motion.section variants={riseIn}>
              <h2 className="section-title">Saved for later</h2>
              <ul className="saved-list">
                {saved.map((venue) => (
                  <motion.li className="saved" key={venue.id} layout transition={softSpring}>
                    <a className="saved__link" href={`#/venues/${venue.id}`}>
                      <span
                        className="saved__thumb"
                        style={{
                          background: `linear-gradient(145deg, hsl(${venue.hue} 72% 52%), hsl(${venue.hue + 24} 68% 32%))`,
                        }}
                        aria-hidden="true"
                      >
                        {venue.initials}
                      </span>
                      <span className="saved__body">
                        <span className="saved__name">{venue.name}</span>
                        <span className="saved__meta">
                          {venue.area}, {venue.state} · seats{' '}
                          {venue.capacity.toLocaleString('en-NG')} ·{' '}
                          {formatNairaShort(venue.pricePerDay)} a day
                        </span>
                      </span>
                    </a>

                    <span className="saved__actions">
                      <a
                        className="ghost-button ghost-button--small"
                        href={`#/host/e/${event.id}/book/${venue.id}`}
                      >
                        Book
                      </a>
                      <button
                        type="button"
                        className="ghost-button ghost-button--small ghost-button--danger"
                        onClick={() => toggleSavedVenue(event.id, venue.id)}
                      >
                        Remove
                      </button>
                    </span>
                  </motion.li>
                ))}
              </ul>
            </motion.section>
          )}
        </>
      )}

      <HostBookingDrawer
        eventId={event.id}
        booking={bookings.find((booking) => booking.id === openId)}
        onClose={() => setOpenId(null)}
      />
    </EventShell>
  )
}

type BookingRowProps = {
  booking: Booking
  onCancel: () => void
  onOpen: () => void
  onPayBalance: () => void
}

function BookingRow({ booking, onCancel, onOpen, onPayBalance }: BookingRowProps) {
  const venue = findVenue(booking.venueId)
  if (!venue) return null

  const balancePaid = Boolean(booking.balancePaidISO)

  return (
    <motion.li className="booking" layout transition={softSpring}>
      <div className="booking__head">
        <div>
          <a className="booking__name" href={`#/venues/${venue.id}`}>
            {venue.name}
          </a>
          <p className="booking__where">
            {venue.area}, {venue.state}
          </p>
        </div>
        <span className="tag tag--good">Booked</span>
      </div>

      <dl className="booking__facts">
        <div>
          <dt>Date</dt>
          <dd>{formatEventDate(booking.date)}</dd>
        </div>
        <div>
          <dt>Guests</dt>
          <dd>{booking.guests.toLocaleString('en-NG')}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{formatNaira(booking.total)}</dd>
        </div>
        <div>
          <dt>Deposit paid</dt>
          <dd>{formatNaira(booking.deposit)}</dd>
        </div>
      </dl>

      {booking.addOns.length > 0 && (
        <p className="booking__addons">Includes {booking.addOns.join(', ')}.</p>
      )}

      <div className="booking__footer">
        <p className="booking__balance">
          {balancePaid
            ? `Balance of ${formatNaira(booking.total - booking.deposit)} paid`
            : `Balance ${formatNaira(booking.total - booking.deposit)} due by ${formatEventDate(booking.balanceDueISO)}`}
        </p>
        <span className="booking__actions">
          <button type="button" className="ghost-button ghost-button--small" onClick={onOpen}>
            Event details and chat
          </button>
          {!balancePaid && (
            <button type="button" className="ghost-button ghost-button--small" onClick={onPayBalance}>
              Pay balance
            </button>
          )}
          <button
            type="button"
            className="ghost-button ghost-button--small ghost-button--danger"
            onClick={onCancel}
          >
            Cancel booking
          </button>
        </span>
      </div>
    </motion.li>
  )
}
