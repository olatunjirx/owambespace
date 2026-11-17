import { useEffect } from 'react'

import { BudgetScreen } from './BudgetScreen'
import { ChecklistScreen } from './ChecklistScreen'
import { EventVenuesScreen } from './EventVenuesScreen'
import { EventVendorsScreen } from './EventVendorsScreen'
import { EventsListScreen } from './EventsListScreen'
import { FlyerScreen } from './FlyerScreen'
import { GuestsScreen } from './GuestsScreen'
import { OverviewScreen } from './OverviewScreen'
import { RunSheetScreen } from './RunSheetScreen'
import type { EventTab } from './EventShell'
import { AccountScreen } from '../account/AccountScreen'
import { CategoryScreen } from '../discover/CategoryScreen'
import { ExploreScreen } from '../discover/ExploreScreen'
import { VendorDetailScreen } from '../discover/VendorDetailScreen'
import { CheckoutScreen } from '../venues/CheckoutScreen'
import { HireCheckoutScreen } from '../discover/HireCheckoutScreen'
import { VenueDetailScreen } from '../venues/VenueDetailScreen'
import { VenuesBrowseScreen } from '../venues/VenuesBrowseScreen'
import { findCategory, findVendor, packagesFor } from '../../lib/vendors'
import { findVenue } from '../../lib/venues'
import { navigate } from '../../router/hashRouter'
import { useEvents } from '../../state/Events'

/**
 * Route matching for everything behind sign-up.
 *
 * Hand-rolled rather than pulled from a library: there are seven patterns and
 * no nested layouts, and the shells already handle their own composition.
 */
export type HostRoute =
  | { kind: 'events' }
  | { kind: 'create' }
  | { kind: 'event'; eventId: string; tab: EventTab }
  | { kind: 'checkout'; eventId: string; venueId: string }
  | { kind: 'hire'; eventId: string; vendorId: string; packageId: string }
  | { kind: 'explore' }
  | { kind: 'category'; slug: string }
  | { kind: 'vendor'; vendorId: string }
  | { kind: 'venues' }
  | { kind: 'venue'; venueId: string }
  | { kind: 'account' }

const EVENT_TABS: Record<string, EventTab> = {
  '': 'overview',
  checklist: 'checklist',
  venues: 'venues',
  vendors: 'vendors',
  guests: 'guests',
  budget: 'budget',
  runsheet: 'runsheet',
  flyer: 'flyer',
}

export function matchHostRoute(path: string): HostRoute | null {
  if (path === '/host') return { kind: 'events' }
  if (path === '/host/new') return { kind: 'create' }
  if (path === '/venues') return { kind: 'venues' }
  if (path === '/explore') return { kind: 'explore' }
  if (path === '/account') return { kind: 'account' }

  const category = path.match(/^\/explore\/([\w-]+)$/)
  if (category) return { kind: 'category', slug: category[1] }

  const vendor = path.match(/^\/vendors\/([\w-]+)$/)
  if (vendor) return { kind: 'vendor', vendorId: vendor[1] }

  const venue = path.match(/^\/venues\/([\w-]+)$/)
  if (venue) return { kind: 'venue', venueId: venue[1] }

  const checkout = path.match(/^\/host\/e\/([\w-]+)\/book\/([\w-]+)$/)
  if (checkout) return { kind: 'checkout', eventId: checkout[1], venueId: checkout[2] }

  const hire = path.match(/^\/host\/e\/([\w-]+)\/hire\/([\w-]+)\/([\w-]+)$/)
  if (hire) return { kind: 'hire', eventId: hire[1], vendorId: hire[2], packageId: hire[3] }

  const event = path.match(/^\/host\/e\/([\w-]+)(?:\/([\w-]+))?$/)
  if (event) {
    const tab = EVENT_TABS[event[2] ?? '']
    // An unknown tail is a bad URL, not an event — fall through to the list.
    if (tab) return { kind: 'event', eventId: event[1], tab }
  }

  return null
}

type HostRoutesProps = {
  route: HostRoute
  firstName: string
}

export function HostRoutes({ route, firstName }: HostRoutesProps) {
  if (route.kind === 'events') return <EventsListScreen firstName={firstName} />
  // Creating is a panel over the list, not its own page — the route only
  // decides whether that panel is open.
  if (route.kind === 'create') {
    return <EventsListScreen firstName={firstName} createOpen />
  }
  if (route.kind === 'explore') return <ExploreScreen />
  if (route.kind === 'category') return <CategoryRoute slug={route.slug} />
  if (route.kind === 'vendor') return <VendorRoute vendorId={route.vendorId} />
  if (route.kind === 'account') return <AccountScreen />
  if (route.kind === 'venues') return <VenuesBrowseScreen />
  if (route.kind === 'venue') return <VenueRoute venueId={route.venueId} />
  if (route.kind === 'checkout') {
    return <CheckoutRoute eventId={route.eventId} venueId={route.venueId} />
  }

  if (route.kind === 'hire') {
    return <HireRoute eventId={route.eventId} vendorId={route.vendorId} packageId={route.packageId} />
  }

  return <EventRoute eventId={route.eventId} tab={route.tab} />
}

function HireRoute({ eventId, vendorId, packageId }: { eventId: string; vendorId: string; packageId: string }) {
  const { getEvent } = useEvents()
  const event = getEvent(eventId)
  const vendor = findVendor(vendorId)
  const pkg = vendor ? packagesFor(vendor).find((entry) => entry.id === packageId) : undefined

  useEffect(() => {
    if (!event) navigate('/host', true)
    else if (!vendor || !pkg) navigate('/explore', true)
  }, [event, vendor, pkg])

  if (!event || !vendor || !pkg) return null
  return <HireCheckoutScreen event={event} vendor={vendor} pkg={pkg} />
}

/**
 * Guards the workspace. Every tab re-reads the event from the store, so an
 * edit on one tab is visible the moment another renders.
 */
function EventRoute({ eventId, tab }: { eventId: string; tab: EventTab }) {
  const { getEvent } = useEvents()
  const event = getEvent(eventId)

  // A bookmarked id can outlive the event it points at.
  useEffect(() => {
    if (!event) navigate('/host', true)
  }, [event])

  if (!event) return null

  if (tab === 'checklist') return <ChecklistScreen event={event} />
  if (tab === 'venues') return <EventVenuesScreen event={event} />
  if (tab === 'vendors') return <EventVendorsScreen event={event} />
  if (tab === 'guests') return <GuestsScreen event={event} />
  if (tab === 'budget') return <BudgetScreen event={event} />
  if (tab === 'runsheet') return <RunSheetScreen event={event} />
  if (tab === 'flyer') return <FlyerScreen event={event} />

  return <OverviewScreen event={event} />
}

function CategoryRoute({ slug }: { slug: string }) {
  const known = Boolean(findCategory(slug))

  // 'venues' is a category in the browse grid but its own screen in the app;
  // anything unknown goes back to the hub rather than a blank page.
  useEffect(() => {
    if (slug === 'venues') navigate('/venues', true)
    else if (!known) navigate('/explore', true)
  }, [slug, known])

  if (!known) return null
  return <CategoryScreen slug={slug} />
}

function VendorRoute({ vendorId }: { vendorId: string }) {
  const vendor = findVendor(vendorId)

  useEffect(() => {
    if (!vendor) navigate('/explore', true)
  }, [vendor])

  if (!vendor) return null
  return <VendorDetailScreen vendor={vendor} />
}

function VenueRoute({ venueId }: { venueId: string }) {
  const venue = findVenue(venueId)

  useEffect(() => {
    if (!venue) navigate('/venues', true)
  }, [venue])

  if (!venue) return null
  return <VenueDetailScreen venue={venue} />
}

function CheckoutRoute({ eventId, venueId }: { eventId: string; venueId: string }) {
  const { getEvent } = useEvents()
  const event = getEvent(eventId)
  const venue = findVenue(venueId)

  useEffect(() => {
    if (!event) navigate('/host', true)
    else if (!venue) navigate('/venues', true)
  }, [event, venue])

  if (!event || !venue) return null
  return <CheckoutScreen event={event} venue={venue} />
}
