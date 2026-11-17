import { useState } from 'react'
import { motion } from 'framer-motion'

import { Modal } from '../../components/Modal'
import { BookingHistory } from './BookingHistory'
import { ListingPreview, StatusTag } from './ListingPreview'
import { EyeLineIcon } from './OwnerIcons'
import { BackLink, OwnerShell } from './OwnerShell'
import { ReviewStep } from './ReviewStep'
import { calendarPath, href, promotePath, setupPath } from './ownerPaths'
import { formatNairaShort } from '../../lib/money'
import { listingProgress, listingStrength } from '../../lib/owner'
import type { OwnerVenue } from '../../lib/owner'
import { riseIn } from '../../motion/variants'
import { navigate } from '../../router/hashRouter'
import { useEvents } from '../../state/Events'
import { useOwner } from '../../state/Owner'

/**
 * One venue: is it live, how is it doing, and who has booked it.
 *
 * The numbers are only the ones this build can count honestly — saves come
 * from hosts' shortlists and bookings from checkout. There is no
 * view tracking, so there is no views figure.
 */
export function VenueManageScreen({ venue }: { venue: OwnerVenue }) {
  const { bookings, setVenueStatus, deleteVenue } = useOwner()
  const { events } = useEvents()
  const [confirm, setConfirm] = useState<'pause' | 'delete' | null>(null)

  const venueBookings = bookings.filter((booking) => booking.venueId === venue.id)
  const booked = venueBookings.filter(
    (booking) => booking.status === 'confirmed' || booking.status === 'completed',
  )
  const bookedValue = booked.reduce((sum, booking) => sum + booking.total, 0)
  const saves = events.filter((event) => event.saved.includes(venue.id)).length
  const active = venueBookings.some((booking) => booking.status === 'confirmed')
  const progress = listingProgress(venue)
  const strength = listingStrength(venue)

  const isPublic = venue.status === 'live' || venue.status === 'paused'

  return (
    <OwnerShell
      section="listings"
      pageKey={`owner-venue-${venue.id}`}
      eyebrow={<BackLink href="#/owner/venues">My venues</BackLink>}
      title={venue.name || 'Untitled venue'}
      subtitle={
        <span className="manage__subtitle">
          <StatusTag status={venue.status} />
          {[venue.area, venue.state].filter(Boolean).join(', ')}
          {venue.spaceType ? ` · ${venue.spaceType}` : ''}
        </span>
      }
      actions={
        <>
          {venue.status === 'live' && (
            <a className="ghost-button" href={href(`/venues/${venue.id}`)}>
              <EyeLineIcon size={14} /> View as host
            </a>
          )}
          <a className="button-primary" href={href(setupPath(venue.id, venue.status === 'draft' ? progress.nextStep : 'basics'))}>
            {venue.status === 'draft' ? 'Continue setup' : 'Edit listing'}
          </a>
        </>
      }
    >
      <motion.section className={`card status-card status-card--${venue.status}`} variants={riseIn}>
        <div className="status-card__text">
          <h2 className="card__title">{STATUS_COPY[venue.status].title}</h2>
          <p className="card__hint">{STATUS_COPY[venue.status].body}</p>
        </div>
        {venue.status === 'draft' && (
          <span className="status-card__progress">
            {progress.done}/{progress.total}
          </span>
        )}
        {venue.status === 'live' && (
          <button type="button" className="ghost-button" onClick={() => setConfirm('pause')}>
            Pause listing
          </button>
        )}
        {venue.status === 'paused' && (
          <button type="button" className="button-primary" onClick={() => setVenueStatus(venue.id, 'live')}>
            Resume listing
          </button>
        )}
      </motion.section>

      {isPublic && (
        <motion.div className="stat-grid stat-grid--four" variants={riseIn}>
          <div className="stat">
            <span className="stat__label">Saved by hosts</span>
            <span className="stat__value">{saves}</span>
            <span className="stat__meta">Shortlisted for an event</span>
          </div>
          <a className="stat" href="#/owner/bookings">
            <span className="stat__label">Bookings</span>
            <span className="stat__value">{venueBookings.length}</span>
            <span className="stat__meta">All time</span>
          </a>
          <div className="stat">
            <span className="stat__label">Booked</span>
            <span className="stat__value">{formatNairaShort(bookedValue)}</span>
            <span className="stat__meta">{booked.length} event{booked.length === 1 ? '' : 's'}</span>
          </div>
          <a className="stat" href={href(promotePath(venue.id))}>
            <span className="stat__label">Listing strength</span>
            <span className="stat__value">{strength.score}</span>
            <span className="stat__meta">Out of 100</span>
          </a>
        </motion.div>
      )}

      {isPublic ? (
        <motion.section variants={riseIn}>
          <div className="manage__section-head">
            <h2 className="section-title">Booking history</h2>
            <a className="ghost-button ghost-button--small" href={href(calendarPath(venue.id))}>Availability</a>
          </div>
          <div className="manage__grid">
            <div className="manage__history">
              <BookingHistory bookings={venueBookings} venueId={venue.id} />
            </div>
            <aside className="manage__preview">
              <p className="manage__preview-label">How hosts see it</p>
              <ListingPreview venue={venue} />
            </aside>
          </div>
        </motion.section>
      ) : (
        // Until it is live the checklist is the useful view: it shows what is left.
        <motion.section variants={riseIn}>
          <div className="manage__section-head">
            <h2 className="section-title">Listing</h2>
          </div>
          <ReviewStep venue={venue} showState={false} />
        </motion.section>
      )}

      <motion.section className="card" variants={riseIn}>
        <h2 className="card__title">Reviews</h2>
        <p className="card__hint">
          Hosts can review your venue after their event. You’ll be able to reply publicly to each one.
        </p>
        <p className="quiet-empty">No reviews yet.</p>
      </motion.section>

      <motion.section className="card danger-zone" variants={riseIn}>
        <div>
          <h2 className="card__title">Remove this venue</h2>
          <p className="card__hint">
            {active
              ? 'You can’t remove a venue with upcoming bookings. Pause it instead.'
              : 'Deletes the listing and its calendar. This can’t be undone.'}
          </p>
        </div>
        <button
          type="button"
          className="ghost-button ghost-button--danger"
          disabled={active}
          onClick={() => setConfirm('delete')}
        >
          Remove venue
        </button>
      </motion.section>

      <Modal
        open={confirm === 'pause'}
        onClose={() => setConfirm(null)}
        size="small"
        title="Pause this listing?"
        footer={
          <>
            <button type="button" className="button-neutral" onClick={() => setConfirm(null)}>
              Keep it live
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={() => {
                setVenueStatus(venue.id, 'paused')
                setConfirm(null)
              }}
            >
              Pause listing
            </button>
          </>
        }
      >
        <p className="modal-copy">
          {venue.name} will be hidden from search and no one can make new bookings. Bookings you
          already have are kept, and you can resume any time.
        </p>
      </Modal>

      <Modal
        open={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        size="small"
        title={`Remove ${venue.name || 'this venue'}?`}
        footer={
          <>
            <button type="button" className="button-neutral" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="button-primary button-primary--danger"
              onClick={() => {
                setConfirm(null)
                deleteVenue(venue.id)
                navigate('/owner/venues', true)
              }}
            >
              Remove venue
            </button>
          </>
        }
      >
        <p className="modal-copy">The listing, photos and calendar will be deleted.</p>
      </Modal>
    </OwnerShell>
  )
}

const STATUS_COPY: Record<OwnerVenue['status'], { title: string; body: string }> = {
  draft: {
    title: 'Not live yet',
    body: 'Finish the listing and submit it. Hosts can’t see it until it’s approved.',
  },
  review: {
    title: 'In review',
    body: 'We’re checking the photos and details — usually within 24 hours.',
  },
  live: {
    title: 'Live and bookable',
    body: 'Hosts can find this venue in search and book any open date. Edits show straight away.',
  },
  paused: {
    title: 'Paused',
    body: 'Hidden from search. Existing bookings are unaffected.',
  },
}
