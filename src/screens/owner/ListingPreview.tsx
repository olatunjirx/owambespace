import { formatNairaShort } from '../../lib/money'
import { STATUS_LABELS, headlineCapacity, initialsFor } from '../../lib/owner'
import type { ListingStatus, OwnerVenue } from '../../lib/owner'

type ListingPreviewProps = {
  venue: OwnerVenue
  /** Show the draft/live tag over the photo. */
  showStatus?: boolean
}

/**
 * The listing as a host will meet it in search — cover, name, where, and the
 * three facts hosts filter on. Built from the draft as it is typed, so the
 * owner sees the effect of every field without leaving the form.
 */
export function ListingPreview({ venue, showStatus = false }: ListingPreviewProps) {
  const cover = venue.photos[0]?.src
  const capacity = headlineCapacity(venue)
  const where = [venue.area, venue.state].filter(Boolean).join(', ')

  return (
    <article className="preview">
      <div
        className="preview__cover"
        style={{
          background: cover
            ? `url(${cover}) center / cover`
            : `linear-gradient(145deg, hsl(${venue.hue} 72% 52%), hsl(${venue.hue + 24} 68% 32%))`,
        }}
      >
        {!cover && <span className="preview__initials">{initialsFor(venue.name)}</span>}
        {showStatus && <StatusTag status={venue.status} floating />}
        {venue.photos.length > 1 && (
          <span className="preview__count">{venue.photos.length} photos</span>
        )}
      </div>

      <div className="preview__body">
        <div className="preview__head">
          <h3 className="preview__name">{venue.name || 'Your venue name'}</h3>
          <span className="tag tag--accent">New</span>
        </div>
        <p className="preview__meta">
          {[where || 'Area, State', venue.spaceType || 'Type of space'].join(' · ')}
        </p>
        <p className={`preview__tagline${venue.tagline ? '' : ' preview__placeholder'}`}>
          {venue.tagline || 'Your one-line tagline appears here.'}
        </p>
        <div className="preview__facts">
          <span className="tag">{capacity ? `Seats ${capacity.toLocaleString('en-NG')}` : 'Seats —'}</span>
          <span className="tag tag--accent">
            {venue.pricePerDay ? `${formatNairaShort(venue.pricePerDay)} / day` : '₦— / day'}
          </span>
          {venue.weekdayOffer > 0 && (
            <span className="tag tag--warn">{venue.weekdayOffer}% off weekdays</span>
          )}
        </div>
      </div>
    </article>
  )
}

const STATUS_CLASS: Record<ListingStatus, string> = {
  draft: 'tag',
  review: 'tag tag--warn',
  live: 'tag tag--good',
  paused: 'tag tag--muted',
}

export function StatusTag({ status, floating = false }: { status: ListingStatus; floating?: boolean }) {
  return (
    <span className={`${STATUS_CLASS[status]}${floating ? ' preview__status' : ''}`}>
      {status === 'live' && <span className="live-dot" aria-hidden="true" />}
      {STATUS_LABELS[status]}
    </span>
  )
}

/** A small square tile — the cover photo, or initials on the venue's hue. */
export function VenueThumb({ venue, size = 44 }: { venue: OwnerVenue; size?: number }) {
  const cover = venue.photos[0]?.src
  return (
    <span
      className="venue-thumb"
      style={{
        width: size,
        height: size,
        background: cover
          ? `url(${cover}) center / cover`
          : `linear-gradient(145deg, hsl(${venue.hue} 72% 52%), hsl(${venue.hue + 24} 68% 32%))`,
      }}
      aria-hidden="true"
    >
      {!cover && initialsFor(venue.name)}
    </span>
  )
}
