import type { ProviderSection } from '../../lib/provider'

/**
 * Every service-provider URL, built in one place — same pattern as
 * ownerPaths. Screens link through these so a route change is one edit.
 */
export function servicesPath(section: ProviderSection = 'profile'): string {
  return `/provider/services/${section}`
}

export function bookingPath(bookingId: string): string {
  return `/provider/bookings/${bookingId}`
}

/** For `href` attributes, which need the hash. */
export function href(path: string): string {
  return `#${path}`
}
