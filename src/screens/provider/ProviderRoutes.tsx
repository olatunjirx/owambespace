import { useEffect } from 'react'

import { ProviderBookings } from './ProviderBookings'
import { ProviderCalendar } from './ProviderCalendar'
import { ProviderEarnings } from './ProviderEarnings'
import type { ProviderDialog } from './ProviderEarnings'
import { ProviderHome } from './ProviderHome'
import { ProviderHelp, ProviderSettings } from './ProviderSettingsHelp'
import type { SettingsTab } from './ProviderSettingsHelp'
import { ProviderWelcome } from './ProviderWelcome'
import { ServicesOverview } from './ServicesOverview'
import { ServicesScreen } from './ServicesScreen'
import type { ServicesStep } from './ServicesScreen'
import type { BookingTab } from '../owner/BookingsScreen'
import { navigate } from '../../router/hashRouter'

/** Everything under /provider — same hand-rolled matching as the owner side. */
export type ProviderRoute =
  | { kind: 'welcome' }
  | { kind: 'home' }
  | { kind: 'bookings'; tab?: BookingTab; bookingId?: string }
  | { kind: 'calendar' }
  | { kind: 'services'; step?: ServicesStep }
  | { kind: 'earnings'; dialog?: ProviderDialog }
  | { kind: 'settings'; tab?: SettingsTab }
  | { kind: 'help' }
  | { kind: 'unknown' }

const TABS = new Set(['upcoming', 'past', 'cancelled'])
const STEPS = new Set(['profile', 'packages', 'policies', 'review'])
const DIALOGS = new Set(['payout', 'verify', 'withdraw'])

export function matchProviderRoute(path: string): ProviderRoute | null {
  if (path !== '/provider' && !path.startsWith('/provider/')) return null

  const simple: Record<string, ProviderRoute> = {
    '/provider': { kind: 'home' },
    '/provider/welcome': { kind: 'welcome' },
    '/provider/bookings': { kind: 'bookings' },
    '/provider/calendar': { kind: 'calendar' },
    '/provider/services': { kind: 'services' },
    '/provider/earnings': { kind: 'earnings' },
    '/provider/settings': { kind: 'settings' },
    '/provider/help': { kind: 'help' },
  }
  if (simple[path]) return simple[path]

  const bookings = path.match(/^\/provider\/bookings\/([\w-]+)$/)
  if (bookings) {
    return TABS.has(bookings[1])
      ? { kind: 'bookings', tab: bookings[1] as BookingTab }
      : { kind: 'bookings', bookingId: bookings[1] }
  }

  const services = path.match(/^\/provider\/services\/([\w-]+)$/)
  if (services && STEPS.has(services[1])) return { kind: 'services', step: services[1] as ServicesStep }

  const settings = path.match(/^\/provider\/settings\/(you|business|notifications)$/)
  if (settings) return { kind: 'settings', tab: settings[1] as SettingsTab }

  const earnings = path.match(/^\/provider\/earnings\/([\w-]+)$/)
  if (earnings && DIALOGS.has(earnings[1])) return { kind: 'earnings', dialog: earnings[1] as ProviderDialog }

  return { kind: 'unknown' }
}

export function ProviderRoutes({ route }: { route: ProviderRoute }) {
  switch (route.kind) {
    case 'welcome':
      return <ProviderWelcome />
    case 'home':
      return <ProviderHome />
    case 'bookings':
      return <ProviderBookings tab={route.tab} bookingId={route.bookingId} />
    case 'calendar':
      return <ProviderCalendar />
    case 'services':
      return <ServicesRoute step={route.step} />
    case 'earnings':
      return <ProviderEarnings dialog={route.dialog} />
    case 'settings':
      return <ProviderSettings tab={route.tab} />
    case 'help':
      return <ProviderHelp />
    default:
      return <Redirect to="/provider" />
  }
}

/** "My services" with no section is the overview; a section opens its setup step. */
function ServicesRoute({ step }: { step?: ServicesStep }) {
  if (!step) return <ServicesOverview />
  return <ServicesScreen step={step} />
}

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, true), [to])
  return null
}
