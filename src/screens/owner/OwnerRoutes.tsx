import { useEffect } from 'react'

import { BOOKING_TABS, BookingsScreen } from './BookingsScreen'
import type { BookingTab } from './BookingsScreen'
import { CalendarScreen } from './CalendarScreen'
import { EarningsScreen } from './EarningsScreen'
import type { EarningsDialog } from './EarningsScreen'
import { ListingsScreen } from './ListingsScreen'
import { OwnerHelpScreen } from './OwnerHelpScreen'
import { OwnerHome } from './OwnerHome'
import { OwnerSettingsScreen } from './OwnerSettingsScreen'
import { PromoteScreen } from './PromoteScreen'
import { SampleBookingsRoute } from './SampleBookings'
import { SampleVenueRoute } from './SampleVenue'
import { SetupScreen } from './SetupScreen'
import { VenueManageScreen } from './VenueManageScreen'
import { WelcomeScreen } from './WelcomeScreen'
import { SETUP_STEPS } from '../../lib/owner'
import type { SetupStep } from '../../lib/owner'
import { navigate } from '../../router/hashRouter'
import { useOwnerVenue } from '../../state/Owner'

/**
 * Everything under /owner. Same hand-rolled matching as the host side: a
 * dozen patterns, no nested layouts, and each screen brings its own shell.
 */
export type OwnerRoute =
  | { kind: 'welcome' }
  | { kind: 'home' }
  | { kind: 'bookings'; tab?: BookingTab; bookingId?: string }
  | { kind: 'calendar'; venueId?: string }
  | { kind: 'listings'; adding: boolean }
  | { kind: 'venue'; venueId: string }
  | { kind: 'setup'; venueId: string; step: SetupStep }
  | { kind: 'earnings'; dialog?: EarningsDialog }
  | { kind: 'promote'; venueId?: string }
  | { kind: 'settings' }
  | { kind: 'help' }
  | { kind: 'sample-venue' }
  | { kind: 'sample-bookings' }
  | { kind: 'unknown' }

const TAB_IDS = new Set<string>(BOOKING_TABS.map((tab) => tab.id))
const STEP_IDS = new Set<string>(SETUP_STEPS.map((step) => step.id))
const DIALOGS = new Set<string>(['payout', 'verify', 'withdraw'])

export function matchOwnerRoute(path: string): OwnerRoute | null {
  if (path !== '/owner' && !path.startsWith('/owner/')) return null

  const simple: Record<string, OwnerRoute> = {
    '/owner': { kind: 'home' },
    '/owner/welcome': { kind: 'welcome' },
    '/owner/bookings': { kind: 'bookings' },
    '/owner/calendar': { kind: 'calendar' },
    '/owner/venues': { kind: 'listings', adding: false },
    '/owner/venues/new': { kind: 'listings', adding: true },
    '/owner/earnings': { kind: 'earnings' },
    '/owner/promote': { kind: 'promote' },
    '/owner/settings': { kind: 'settings' },
    '/owner/help': { kind: 'help' },
    '/owner/dev/sample-venue': { kind: 'sample-venue' },
    '/owner/dev/sample-bookings': { kind: 'sample-bookings' },
  }
  if (simple[path]) return simple[path]

  const bookings = path.match(/^\/owner\/bookings\/([\w-]+)$/)
  if (bookings) {
    return TAB_IDS.has(bookings[1])
      ? { kind: 'bookings', tab: bookings[1] as BookingTab }
      : { kind: 'bookings', bookingId: bookings[1] }
  }

  const calendar = path.match(/^\/owner\/calendar\/([\w-]+)$/)
  if (calendar) return { kind: 'calendar', venueId: calendar[1] }

  const promote = path.match(/^\/owner\/promote\/([\w-]+)$/)
  if (promote) return { kind: 'promote', venueId: promote[1] }

  const earnings = path.match(/^\/owner\/earnings\/([\w-]+)$/)
  if (earnings && DIALOGS.has(earnings[1])) {
    return { kind: 'earnings', dialog: earnings[1] as EarningsDialog }
  }

  const setup = path.match(/^\/owner\/venues\/([\w-]+)\/setup(?:\/([\w-]+))?$/)
  if (setup) {
    const step = setup[2] && STEP_IDS.has(setup[2]) ? (setup[2] as SetupStep) : 'basics'
    return { kind: 'setup', venueId: setup[1], step }
  }

  const venue = path.match(/^\/owner\/venues\/([\w-]+)$/)
  if (venue) return { kind: 'venue', venueId: venue[1] }

  return { kind: 'unknown' }
}

export function OwnerRoutes({ route }: { route: OwnerRoute }) {
  switch (route.kind) {
    case 'welcome':
      return <WelcomeScreen />
    case 'home':
      return <OwnerHome />
    case 'bookings':
      return <BookingsScreen tab={route.tab} bookingId={route.bookingId} />
    case 'calendar':
      return <CalendarScreen venueId={route.venueId} />
    case 'listings':
      return <ListingsScreen adding={route.adding} />
    case 'venue':
      return <VenueRoute venueId={route.venueId} />
    case 'setup':
      return <SetupRoute venueId={route.venueId} step={route.step} />
    case 'earnings':
      return <EarningsScreen dialog={route.dialog} />
    case 'promote':
      return <PromoteScreen venueId={route.venueId} />
    case 'settings':
      return <OwnerSettingsScreen />
    case 'help':
      return <OwnerHelpScreen />
    case 'sample-venue':
      return <SampleVenueRoute />
    case 'sample-bookings':
      return <SampleBookingsRoute />
    default:
      return <Redirect to="/owner" />
  }
}

/** A bookmarked or deleted venue id goes back to the list, not a blank page. */
function VenueRoute({ venueId }: { venueId: string }) {
  const venue = useOwnerVenue(venueId)
  if (!venue) return <Redirect to="/owner/venues" />
  return <VenueManageScreen venue={venue} />
}

function SetupRoute({ venueId, step }: { venueId: string; step: SetupStep }) {
  const venue = useOwnerVenue(venueId)
  if (!venue) return <Redirect to="/owner/venues" />
  return <SetupScreen venue={venue} step={step} />
}

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, true), [to])
  return null
}
