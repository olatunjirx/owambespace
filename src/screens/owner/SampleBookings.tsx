import { useEffect, useRef } from 'react'

import { href, venuePath } from './ownerPaths'
import { addDays, isWeekend, makeId, todayISO } from '../../lib/events'
import { headlineCapacity, ownerPenalty } from '../../lib/owner'
import type { BlockedDate, BookingMessage, OwnerBooking, OwnerBookingStatus, OwnerVenue } from '../../lib/owner'
import { navigate } from '../../router/hashRouter'
import { useOwner } from '../../state/Owner'

/**
 * Dev helper: open #/owner/dev/sample-bookings to fill the booking history of
 * every live or paused venue with one row for each state a booking can be in,
 * then land on the first venue. It replaces the earlier samples rather than
 * adding to them, so opening the link twice does not duplicate anything.
 */
export function SampleBookingsRoute() {
  const { state, replaceSamples } = useOwner()
  const first = state.venues.find((venue) => venue.status === 'live' || venue.status === 'paused')
  const seeded = useRef(false)

  useEffect(() => {
    if (seeded.current || !first) return
    seeded.current = true
    replaceSamples(designStateBookings)
    navigate(venuePath(first.id), true)
  }, [first, replaceSamples])

  if (first) return null
  return (
    <div className="owner-empty">
      <p className="empty__title">No live venue yet</p>
      <p className="empty__body">Booking history only shows on a live venue. Submit one, then open this link again.</p>
      <div className="empty__action">
        <a className="ghost-button" href={href('/owner/venues')}>
          Go to My venues
        </a>
      </div>
    </div>
  )
}

const BLOCK_REASON = 'Private family event (sample)'
const HOUR = 3_600_000
const DAY = 24 * HOUR

type Row = {
  hostName: string
  eventName: string
  eventType: string
  /** Days from today; negative is in the past. */
  inDays: number
  guests: number
  status: OwnerBookingStatus
  createdAgoMs: number
  /** Defaults to paid once the 14-day balance deadline has passed. */
  balancePaid?: boolean
  addOns?: { names: string[]; cost: number }
  messages?: { from: BookingMessage['from']; text: string }[]
  /** Leaves the host's messages unread, for the new-message states. */
  unread?: boolean
  ownerCancelled?: { reason: string; waived?: boolean }
}

function designStateBookings(venue: OwnerVenue): { bookings: OwnerBooking[]; blocked: BlockedDate } {
  const capacity = Math.max(50, headlineCapacity(venue))
  const some = (share: number) => Math.round(capacity * share)

  const rows: Row[] = [
    // Upcoming: chat states, balance states and the countdown ends.
    {
      hostName: 'Adaeze Okafor',
      eventName: 'Adaeze & Tobi’s wedding reception',
      eventType: 'Wedding',
      inDays: 45,
      guests: some(0.8),
      status: 'confirmed',
      createdAgoMs: 5 * HOUR,
      unread: true,
      messages: [{ from: 'host', text: 'Hello! Could our decorator get in from 8am on the day?' }],
    },
    {
      hostName: 'Kunle Adebayo',
      eventName: 'Mum’s 60th birthday',
      eventType: 'Birthday',
      inDays: 21,
      guests: some(0.5),
      status: 'confirmed',
      createdAgoMs: 6 * DAY,
      messages: [
        { from: 'host', text: 'Thanks! Is there parking for the band’s van?' },
        { from: 'owner', text: 'Yes, there is space right by the side gate.' },
      ],
    },
    {
      hostName: 'Ngozi Umeh',
      eventName: 'Umeh & Bassey engagement party',
      eventType: 'Engagement',
      inDays: 34,
      guests: some(0.6),
      status: 'confirmed',
      createdAgoMs: 3 * DAY,
      addOns: { names: ['Decor package', 'Ushers'], cost: 450_000 },
    },
    {
      hostName: 'Funke Alabi',
      eventName: 'Alabi 25th anniversary',
      eventType: 'Anniversary',
      inDays: 6,
      guests: some(0.4),
      status: 'confirmed',
      createdAgoMs: 12 * DAY,
      balancePaid: true,
    },
    {
      hostName: 'Emeka Nwosu',
      eventName: 'Nwosu traditional marriage',
      eventType: 'Traditional wedding',
      inDays: 5,
      guests: some(0.7),
      status: 'confirmed',
      createdAgoMs: 20 * DAY,
      balancePaid: false,
    },
    {
      hostName: 'Tunde Bakare',
      eventName: 'Bakare book launch',
      eventType: 'Launch',
      inDays: 1,
      guests: some(0.3),
      status: 'confirmed',
      createdAgoMs: 18 * DAY,
    },
    {
      hostName: 'Halima Sani',
      eventName: 'Sani bridal shower',
      eventType: 'Bridal shower',
      inDays: 0,
      guests: some(0.25),
      status: 'confirmed',
      createdAgoMs: 25 * DAY,
    },
    {
      hostName: 'Segun Ojo',
      eventName: 'Ojo family reunion',
      eventType: 'Reunion',
      inDays: -2,
      guests: some(0.45),
      status: 'confirmed',
      createdAgoMs: 30 * DAY,
    },

    // Past: chat still open just after the event, then read-only.
    {
      hostName: 'Bisi Lawal',
      eventName: 'Lawal & Coker wedding',
      eventType: 'Wedding',
      inDays: -2,
      guests: some(0.9),
      status: 'completed',
      createdAgoMs: 75 * DAY,
      addOns: { names: ['Marquee & tables'], cost: 650_000 },
      messages: [{ from: 'host', text: 'Everyone loved the venue. Thank you for everything!' }],
    },
    {
      hostName: 'Zainab Bello',
      eventName: 'Bello family naming ceremony',
      eventType: 'Naming ceremony',
      inDays: -9,
      guests: some(0.6),
      status: 'completed',
      createdAgoMs: 40 * DAY,
      messages: [
        { from: 'host', text: 'Can the caterer use the back entrance?' },
        { from: 'owner', text: 'Yes, the back gate opens at 9am.' },
      ],
    },

    // Cancelled: by the host, by the owner, and through support.
    {
      hostName: 'David Ikenna',
      eventName: 'Ikenna 40th birthday',
      eventType: 'Birthday',
      inDays: 40,
      guests: some(0.35),
      status: 'cancelled',
      createdAgoMs: 14 * DAY,
      messages: [{ from: 'host', text: 'Is the generator included in the price?' }],
    },
    {
      hostName: 'Amina Yusuf',
      eventName: 'Yusuf wedding fatiha',
      eventType: 'Wedding',
      inDays: -15,
      guests: some(0.55),
      status: 'cancelled',
      createdAgoMs: 60 * DAY,
    },
    {
      hostName: 'Yemi Fashola',
      eventName: 'Fashola album listening party',
      eventType: 'Party',
      inDays: 12,
      guests: some(0.5),
      status: 'cancelled',
      createdAgoMs: 4 * DAY,
      ownerCancelled: { reason: 'The venue is double-booked' },
    },
    {
      hostName: 'Grace Etim',
      eventName: 'Etim church convention',
      eventType: 'Religious',
      inDays: 27,
      guests: some(0.7),
      status: 'cancelled',
      createdAgoMs: 9 * DAY,
      ownerCancelled: { reason: 'Flood damage at the venue', waived: true },
    },
  ]

  const now = Date.now()
  const price = venue.pricePerDay || 500_000
  const bookings = rows.map((row): OwnerBooking => {
    const date = addDays(todayISO(), row.inDays)
    const premium = isWeekend(date) ? Math.round((price * venue.weekendPremium) / 100) : 0
    const total = price + premium + (row.addOns?.cost ?? 0)
    const createdISO = new Date(now - row.createdAgoMs).toISOString()
    return {
      id: `sb-${makeId()}`,
      source: 'sample',
      venueId: venue.id,
      hostName: row.hostName,
      eventName: row.eventName,
      eventType: row.eventType,
      date,
      guests: row.guests,
      addOns: row.addOns?.names ?? [],
      total,
      deposit: Math.round((total * venue.depositPercent) / 100),
      status: row.status,
      createdISO,
      balancePaid: row.balancePaid ?? row.inDays <= 14,
      messages: (row.messages ?? []).map((message) => ({ id: makeId(), atISO: createdISO, ...message })),
      ownerReadISO: row.unread ? undefined : new Date(now).toISOString(),
      cancellation: row.ownerCancelled && {
        reason: row.ownerCancelled.reason,
        penalty: row.ownerCancelled.waived ? 0 : ownerPenalty(total),
        atISO: new Date(now - DAY).toISOString(),
      },
    }
  })

  return { bookings, blocked: { date: addDays(todayISO(), 60), reason: BLOCK_REASON } }
}
