import type { SetupStep } from '../../lib/owner'

/**
 * Every owner URL, built in one place. Screens link through these rather than
 * writing paths inline, so a route change is one edit, and OwnerRoutes can
 * import the screens without the screens importing it back.
 */
export function setupPath(venueId: string, step: SetupStep = 'basics'): string {
  return `/owner/venues/${venueId}/setup/${step}`
}

export function venuePath(venueId: string): string {
  return `/owner/venues/${venueId}`
}

export function bookingPath(bookingId: string): string {
  return `/owner/bookings/${bookingId}`
}

export function calendarPath(venueId?: string): string {
  return venueId ? `/owner/calendar/${venueId}` : '/owner/calendar'
}

export function promotePath(venueId?: string): string {
  return venueId ? `/owner/promote/${venueId}` : '/owner/promote'
}

/** For `href` attributes, which need the hash. */
export function href(path: string): string {
  return `#${path}`
}
