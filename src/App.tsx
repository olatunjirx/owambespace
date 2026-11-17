import { useEffect, useRef } from 'react'

import { SIGNUP_ROUTES, SignupFlow, useResetSignup } from './screens/signup/SignupFlow'
import { SignInScreen } from './screens/signup/SignInScreen'
import { DashboardStub } from './screens/dashboard/DashboardStub'
import { HostRoutes, matchHostRoute } from './screens/host/HostRoutes'
import { OwnerRoutes, matchOwnerRoute } from './screens/owner/OwnerRoutes'
import { ProviderRoutes, matchProviderRoute } from './screens/provider/ProviderRoutes'
import { categoryFromSignup } from './lib/provider'
import { ROLE_LABELS } from './lib/signupFlow'
import type { AccountRole } from './lib/signupFlow'
import { SignupDraftProvider, useSignupDraft } from './state/SignupDraft'
import { EventsProvider, useEvents } from './state/Events'
import { ProfileProvider, useProfile } from './state/Profile'
import { OwnerProvider, useOwner } from './state/Owner'
import { ProviderProvider, useProvider } from './state/Provider'
import { navigate, useRoute, useScrollReset } from './router/hashRouter'
import './App.css'

export default function App() {
  return (
    <SignupDraftProvider>
      <ProfileProvider>
        <EventsProvider>
          <OwnerProvider>
            <ProviderProvider>
              <ProfileSeed />
              <Routes />
            </ProviderProvider>
          </OwnerProvider>
        </EventsProvider>
      </ProfileProvider>
    </SignupDraftProvider>
  )
}

function Routes() {
  const path = useRoute()
  useScrollReset(path)

  const { draft } = useSignupDraft()
  const firstName = draft.fullName.trim().split(' ')[0] ?? ''

  if (path === '/signin') return <SignInScreen />

  const signupStep = SIGNUP_ROUTES[path]
  if (signupStep) return <SignupFlow step={signupStep} />

  const ownerRoute = matchOwnerRoute(path)
  if (ownerRoute) return <OwnerRoutes route={ownerRoute} />

  const providerRoute = matchProviderRoute(path)
  if (providerRoute) return <ProviderRoutes route={providerRoute} />

  const hostRoute = matchHostRoute(path)
  if (hostRoute) return <HostRoutes route={hostRoute} firstName={firstName} />

  const dashboardRole = path.startsWith('/dashboard/')
    ? (path.slice('/dashboard/'.length) as AccountRole)
    : null

  // Hosts, venue owners and service providers (vendors and planners) each
  // have a dashboard; anything else lands on the placeholder.
  if (dashboardRole === 'host') return <HostEntry />
  if (dashboardRole === 'venue_owner') return <OwnerEntry />
  if (dashboardRole === 'vendor' || dashboardRole === 'planner') return <ProviderEntry planner={dashboardRole === 'planner'} />

  if (dashboardRole && dashboardRole in ROLE_LABELS) {
    return <Dashboard role={dashboardRole} />
  }

  return <SignupFlow step="type" />
}

/**
 * Where sign-up drops a new host.
 *
 * Someone with no events goes straight to creating one; a returning host lands
 * on the list of everything they are already running.
 */
function HostEntry() {
  const { events } = useEvents()

  useEffect(() => {
    navigate(events.length === 0 ? '/host/new' : '/host', true)
  }, [events.length])

  return null
}

/**
 * Where sign-up drops a new venue owner: the welcome screen the first time,
 * their dashboard every time after.
 *
 * This is also where the venue named during sign-up becomes the owner's first
 * draft listing — here, after the account exists, and not while the sign-up
 * form is still being typed into. A returning owner's listings are left alone.
 */
function OwnerEntry() {
  const { draft } = useSignupDraft()
  const { state, createVenue, updateBusiness } = useOwner()
  // StrictMode runs effects twice on mount; the ref keeps that to one venue.
  const seeded = useRef(false)

  useEffect(() => {
    if (!seeded.current && state.venues.length === 0 && draft.door === 'venue' && draft.venueName.trim()) {
      seeded.current = true
      createVenue({
        name: draft.venueName.trim(),
        spaceType: draft.spaceType,
        state: draft.location,
      })
      if (!state.business.businessName) {
        updateBusiness({ businessName: draft.companyName || draft.venueName.trim(), mode: draft.mode })
      }
    }
    navigate(state.welcomeSeen ? '/owner' : '/owner/welcome', true)
  }, [draft, state.venues.length, state.business.businessName, state.welcomeSeen, createVenue, updateBusiness])

  return null
}

/**
 * Where sign-up drops a service provider (vendor or planner): the welcome
 * screen the first time, their dashboard after. What they told us at sign-up —
 * the service, trading or company name, state — seeds the draft profile once,
 * after the account exists. A returning provider's profile is left alone.
 */
function ProviderEntry({ planner }: { planner: boolean }) {
  const { draft } = useSignupDraft()
  const { profile } = useProfile()
  const { state, listing, updateListing, updateBusiness } = useProvider()
  const seeded = useRef(false)

  useEffect(() => {
    if (!seeded.current && listing.status === 'draft' && !listing.name && !listing.category) {
      seeded.current = true
      const name =
        draft.companyName.trim() || draft.tradingName.trim() || draft.fullName.trim() || profile.displayName.trim()
      updateListing({
        name,
        category: planner ? 'planners' : categoryFromSignup(draft.service),
        state: draft.location,
      })
      updateBusiness({ mode: draft.mode, rcNumber: draft.rcNumber })
    }
    navigate(state.welcomeSeen ? '/provider' : '/provider/welcome', true)
  }, [draft, profile.displayName, planner, listing.status, listing.name, listing.category, state.welcomeSeen, updateListing, updateBusiness])

  return null
}

/**
 * Copies the sign-up name into the profile once, so the account page and the
 * top-bar chip know who this is without asking again. The profile wins from
 * then on — editing your display name must survive a fresh sign-up draft.
 */
function ProfileSeed() {
  const { draft } = useSignupDraft()
  const { profile, update } = useProfile()

  useEffect(() => {
    const fullName = draft.fullName.trim()
    if (!profile.displayName && fullName) update({ displayName: fullName })
  }, [draft.fullName, profile.displayName, update])

  return null
}

function Dashboard({ role }: { role: AccountRole }) {
  const { draft } = useSignupDraft()
  const startOver = useResetSignup()

  return <DashboardStub role={role} name={draft.fullName} onStartOver={startOver} />
}
