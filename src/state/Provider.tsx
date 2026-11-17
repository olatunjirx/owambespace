import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { makeId } from '../lib/events'
import type { OperatingMode } from '../lib/signupFlow'
import { maskAccount, ownerPenalty } from '../lib/owner'
import type { BookingMessage, OwnerBookingStatus, OwnerCancellation, Payout } from '../lib/owner'
import { emptyListing, hireChatId, sampleProviderBookings, toDirectoryVendor } from '../lib/provider'
import type { ProviderBooking, ProviderListing } from '../lib/provider'
import { findContactDetails } from '../lib/contactGuard'
import { setListedVendors } from '../lib/vendors'
import { useEvents } from './Events'
import { useProfile } from './Profile'
import type { OwnerNotice, PayoutAccount, Verification } from './Owner'

/**
 * Everything a service provider manages, held above the screens.
 *
 * Shaped like the owner store on purpose. Sample bookings live here; real
 * ones live on the host's event (a hire), so this reads those for the
 * provider's listing and keeps only provider-side additions — messages,
 * completion, a provider cancellation — as an overlay keyed by chat id.
 *
 * Review, ID checks and payouts have no backend in this build. They run on
 * short timers and are labelled as simulated on screen.
 */
const STORAGE_KEY = 'owambe.provider.v1'

const REVIEW_MS = 6_000
const VERIFY_MS = 5_000
const PAYOUT_MS = 6_000

export type ProviderBusiness = {
  mode: OperatingMode
  /** Registered name, for company mode. The public name lives on the listing. */
  companyName: string
  rcNumber: string
  phone: string
  email: string
  /** A downscaled data URL — there is no upload server in this build. */
  avatar: string
}

export type ProviderPrefs = {
  bookingSms: boolean
  bookingEmail: boolean
  whatsapp: boolean
  weeklySummary: boolean
}

type HireOverlay = {
  messages: BookingMessage[]
  completed?: boolean
  readISO?: string
  cancellation?: OwnerCancellation
}

type ProviderState = {
  welcomeSeen: boolean
  listing: ProviderListing
  bookings: ProviderBooking[]
  overlays: Record<string, HireOverlay>
  samplesSeeded: boolean
  business: ProviderBusiness
  payoutAccount: PayoutAccount | null
  verification: Verification
  payouts: Payout[]
  prefs: ProviderPrefs
  notices: OwnerNotice[]
}

function emptyState(): ProviderState {
  return {
    welcomeSeen: false,
    listing: emptyListing(),
    bookings: [],
    overlays: {},
    samplesSeeded: false,
    business: { mode: 'solo', companyName: '', rcNumber: '', phone: '', email: '', avatar: '' },
    payoutAccount: null,
    verification: { status: 'none', idType: '', idLast4: '' },
    payouts: [],
    prefs: { bookingSms: true, bookingEmail: true, whatsapp: false, weeklySummary: true },
    notices: [],
  }
}

function load(): ProviderState {
  const empty = emptyState()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw) as Partial<ProviderState>
    // Merged over the empty state so an older copy can't leave a field undefined.
    return {
      ...empty,
      ...parsed,
      listing: emptyListing(parsed.listing),
      business: { ...empty.business, ...parsed.business },
      verification: { ...empty.verification, ...parsed.verification },
      prefs: { ...empty.prefs, ...parsed.prefs },
      overlays: parsed.overlays ?? {},
      bookings: parsed.bookings ?? [],
      payouts: parsed.payouts ?? [],
      notices: parsed.notices ?? [],
    }
  } catch {
    return empty
  }
}

export type ListingPatch = Partial<ProviderListing> | ((listing: ProviderListing) => Partial<ProviderListing>)

type ProviderContextValue = {
  state: ProviderState
  listing: ProviderListing
  /** Sample and real bookings, soonest first. */
  bookings: ProviderBooking[]

  markWelcomeSeen: () => void
  updateListing: (patch: ListingPatch) => void
  submitListing: () => void
  setPaused: (paused: boolean) => void
  blockDates: (dates: string[], reason: string) => void
  unblockDate: (date: string) => void

  cancelAsProvider: (id: string, reason: string) => void
  completeBooking: (id: string) => void
  sendMessage: (id: string, text: string) => void
  /** The host's side of a hire chat, keyed by chat id. */
  sendHostMessage: (chatId: string, text: string) => void
  hostMessages: (chatId: string) => BookingMessage[]
  markMessagesRead: (id: string) => void
  clearSamples: () => void

  updateBusiness: (patch: Partial<ProviderBusiness>) => void
  setPayoutAccount: (account: PayoutAccount | null) => void
  submitVerification: (idType: string, idNumber: string) => void
  requestPayout: (amount: number) => void
  setPref: (pref: keyof ProviderPrefs, on: boolean) => void
  dismissNotice: (id: string) => void
}

function message(from: BookingMessage['from'], text: string): BookingMessage {
  return { id: makeId(), from, text, atISO: new Date().toISOString() }
}

const ProviderContext = createContext<ProviderContextValue | null>(null)

export function ProviderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProviderState>(load)
  const { events, cancelHire } = useEvents()
  const { profile } = useProfile()

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // A full or blocked store costs persistence, not the session.
    }
  }, [state])

  const patch = useCallback((change: (current: ProviderState) => ProviderState) => setState(change), [])

  const patchListing = useCallback(
    (change: (listing: ProviderListing) => ProviderListing) =>
      patch((current) => ({ ...current, listing: change(current.listing) })),
    [patch],
  )

  /* ── Bookings: samples + real hires ────────────────────── */

  const listingId = state.listing.id

  const hostBookings = useMemo(() => {
    const list: ProviderBooking[] = []
    for (const event of events) {
      for (const hire of event.hires ?? []) {
        if (hire.vendorId !== listingId) continue
        const id = hireChatId(event.id, hire.id)
        const overlay = state.overlays[id]
        let status: OwnerBookingStatus = overlay?.completed ? 'completed' : 'confirmed'
        if (hire.status === 'cancelled') status = 'cancelled'
        list.push({
          id,
          source: 'host',
          eventId: event.id,
          hostBookingId: hire.id,
          venueId: listingId,
          packageId: hire.packageId,
          packageName: hire.packageName,
          // One device plays both sides in this build; a backend sends the host's own name.
          hostName: profile.displayName.trim() || 'Host',
          eventName: event.name || 'Untitled event',
          eventType: event.type,
          date: hire.date,
          guests: hire.guests,
          addOns: [],
          total: hire.total,
          deposit: hire.deposit,
          status,
          createdISO: hire.createdISO,
          balancePaid: Boolean(hire.balancePaidISO),
          messages: overlay?.messages ?? [],
          ownerReadISO: overlay?.readISO,
          cancellation: overlay?.cancellation,
        })
      }
    }
    return list
  }, [events, listingId, state.overlays, profile.displayName])

  const bookings = useMemo(
    () => [...hostBookings, ...state.bookings].sort((a, b) => a.date.localeCompare(b.date)),
    [hostBookings, state.bookings],
  )

  /*
   * A live listing goes into the host directory. Done during render, like the
   * owner store, so host screens below never read a stale directory.
   * A date is full once the provider has as many events on it as they cover.
   */
  useMemo(() => {
    const listing = state.listing
    if (listing.status !== 'live' && listing.status !== 'paused') {
      setListedVendors([])
      return
    }
    const perDate = new Map<string, number>()
    for (const booking of bookings) {
      if (booking.status !== 'confirmed') continue
      perDate.set(booking.date, (perDate.get(booking.date) ?? 0) + 1)
    }
    const full = [...perDate.entries()].filter(([, count]) => count >= listing.perDay).map(([date]) => date)
    setListedVendors([toDirectoryVendor(listing, full)])
  }, [state.listing, bookings])

  const findBooking = useCallback((id: string) => bookings.find((booking) => booking.id === id), [bookings])

  const setOverlay = useCallback(
    (id: string, change: (overlay: HireOverlay) => HireOverlay) =>
      patch((current) => ({
        ...current,
        overlays: { ...current.overlays, [id]: change(current.overlays[id] ?? { messages: [] }) },
      })),
    [patch],
  )

  const patchSample = useCallback(
    (id: string, change: (booking: ProviderBooking) => ProviderBooking) =>
      patch((current) => ({
        ...current,
        bookings: current.bookings.map((booking) => (booking.id === id ? change(booking) : booking)),
      })),
    [patch],
  )

  const cancelAsProvider = useCallback(
    (id: string, reason: string) => {
      const booking = findBooking(id)
      if (!booking) return
      const cancellation: OwnerCancellation = {
        reason,
        penalty: ownerPenalty(booking.total),
        atISO: new Date().toISOString(),
      }
      if (booking.source === 'sample') {
        patchSample(id, (entry) => ({ ...entry, status: 'cancelled', cancellation }))
      } else {
        if (booking.eventId && booking.hostBookingId) cancelHire(booking.eventId, booking.hostBookingId)
        setOverlay(id, (overlay) => ({ ...overlay, cancellation }))
      }
    },
    [findBooking, patchSample, cancelHire, setOverlay],
  )

  const completeBooking = useCallback(
    (id: string) => {
      const booking = findBooking(id)
      if (!booking) return
      if (booking.source === 'sample') patchSample(id, (entry) => ({ ...entry, status: 'completed' }))
      else setOverlay(id, (overlay) => ({ ...overlay, completed: true }))
    },
    [findBooking, patchSample, setOverlay],
  )

  const sendMessage = useCallback(
    (id: string, text: string) => {
      const booking = findBooking(id)
      const trimmed = text.trim()
      // The chat checks too, but the store is the last line before "sending".
      if (!booking || !trimmed || findContactDetails(trimmed)) return
      const sent = message('owner', trimmed)
      if (booking.source === 'sample') patchSample(id, (entry) => ({ ...entry, messages: [...entry.messages, sent] }))
      else setOverlay(id, (overlay) => ({ ...overlay, messages: [...overlay.messages, sent] }))
    },
    [findBooking, patchSample, setOverlay],
  )

  const sendHostMessage = useCallback(
    (chatId: string, text: string) => {
      const trimmed = text.trim()
      if (!trimmed || findContactDetails(trimmed)) return
      setOverlay(chatId, (overlay) => ({ ...overlay, messages: [...overlay.messages, message('host', trimmed)] }))
    },
    [setOverlay],
  )

  const hostMessages = useCallback((chatId: string) => state.overlays[chatId]?.messages ?? [], [state.overlays])

  const markMessagesRead = useCallback(
    (id: string) => {
      const booking = findBooking(id)
      if (!booking) return
      const readISO = new Date().toISOString()
      if (booking.source === 'sample') patchSample(id, (entry) => ({ ...entry, ownerReadISO: readISO }))
      else setOverlay(id, (overlay) => ({ ...overlay, readISO }))
    },
    [findBooking, patchSample, setOverlay],
  )

  const clearSamples = useCallback(() => patch((current) => ({ ...current, bookings: [] })), [patch])

  /* ── Listing ───────────────────────────────────────────── */

  const markWelcomeSeen = useCallback(
    () => patch((current) => (current.welcomeSeen ? current : { ...current, welcomeSeen: true })),
    [patch],
  )

  const updateListing = useCallback(
    (change: ListingPatch) =>
      patchListing((listing) => ({ ...listing, ...(typeof change === 'function' ? change(listing) : change) })),
    [patchListing],
  )

  const submitListing = useCallback(
    () => patchListing((listing) => ({ ...listing, status: 'review', submittedISO: new Date().toISOString() })),
    [patchListing],
  )

  const setPaused = useCallback(
    (paused: boolean) => patchListing((listing) => ({ ...listing, status: paused ? 'paused' : 'live' })),
    [patchListing],
  )

  const blockDates = useCallback(
    (dates: string[], reason: string) =>
      patchListing((listing) => {
        const existing = new Set(listing.blocked.map((entry) => entry.date))
        const added = dates.filter((date) => !existing.has(date)).map((date) => ({ date, reason: reason.trim() }))
        return { ...listing, blocked: [...listing.blocked, ...added] }
      }),
    [patchListing],
  )

  const unblockDate = useCallback(
    (date: string) =>
      patchListing((listing) => ({
        ...listing,
        blocked: listing.blocked.filter((entry) => entry.date !== date || entry.locked),
      })),
    [patchListing],
  )

  /* ── Simulated review ──────────────────────────────────── */

  const { status: listingStatus, submittedISO } = state.listing
  useEffect(() => {
    if (listingStatus !== 'review') return
    const elapsed = Date.now() - new Date(submittedISO ?? Date.now()).getTime()
    const timer = window.setTimeout(() => {
      patch((current) => {
        if (current.listing.status !== 'review') return current
        const published = { ...current.listing, status: 'live' as const, publishedISO: new Date().toISOString() }
        return {
          ...current,
          listing: published,
          // Going live the first time brings samples, so every stage can be seen.
          bookings: current.samplesSeeded ? current.bookings : sampleProviderBookings(published),
          samplesSeeded: true,
          notices: [
            {
              id: makeId(),
              text: `${published.name} is live. Hosts can now find and book your packages.`,
              href: '/provider/services',
              atISO: new Date().toISOString(),
            },
            ...current.notices,
          ],
        }
      })
    }, Math.max(0, REVIEW_MS - elapsed))
    return () => window.clearTimeout(timer)
  }, [listingStatus, submittedISO, patch])

  /* ── Money & identity ──────────────────────────────────── */

  const updateBusiness = useCallback(
    (change: Partial<ProviderBusiness>) =>
      patch((current) => ({ ...current, business: { ...current.business, ...change } })),
    [patch],
  )

  const setPayoutAccount = useCallback(
    (account: PayoutAccount | null) => patch((current) => ({ ...current, payoutAccount: account })),
    [patch],
  )

  const submitVerification = useCallback(
    (idType: string, idNumber: string) =>
      patch((current) => ({
        ...current,
        verification: {
          status: 'pending',
          idType,
          idLast4: idNumber.replace(/\s/g, '').slice(-4),
          submittedISO: new Date().toISOString(),
        },
      })),
    [patch],
  )

  const { verification } = state
  useEffect(() => {
    if (verification.status !== 'pending') return
    const elapsed = Date.now() - new Date(verification.submittedISO ?? Date.now()).getTime()
    const timer = window.setTimeout(() => {
      patch((current) =>
        current.verification.status !== 'pending'
          ? current
          : {
              ...current,
              verification: { ...current.verification, status: 'verified' },
              notices: [
                {
                  id: makeId(),
                  text: 'Your identity is verified. Payouts are unlocked.',
                  href: '/provider/earnings',
                  atISO: new Date().toISOString(),
                },
                ...current.notices,
              ],
            },
      )
    }, Math.max(0, VERIFY_MS - elapsed))
    return () => window.clearTimeout(timer)
  }, [verification, patch])

  const requestPayout = useCallback(
    (amount: number) =>
      patch((current) => {
        if (!current.payoutAccount || amount <= 0) return current
        const payout: Payout = {
          id: makeId(),
          amount,
          requestedISO: new Date().toISOString(),
          status: 'processing',
          bankLabel: `${current.payoutAccount.bank} ${maskAccount(current.payoutAccount.accountNumber)}`,
        }
        return { ...current, payouts: [payout, ...current.payouts] }
      }),
    [patch],
  )

  useEffect(() => {
    const processing = state.payouts.filter((payout) => payout.status === 'processing')
    if (processing.length === 0) return
    const timers = processing.map((payout) => {
      const elapsed = Date.now() - new Date(payout.requestedISO).getTime()
      return window.setTimeout(() => {
        patch((current) => ({
          ...current,
          payouts: current.payouts.map((entry) => (entry.id === payout.id ? { ...entry, status: 'paid' as const } : entry)),
        }))
      }, Math.max(0, PAYOUT_MS - elapsed))
    })
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [state.payouts, patch])

  const setPref = useCallback(
    (pref: keyof ProviderPrefs, on: boolean) =>
      patch((current) => ({ ...current, prefs: { ...current.prefs, [pref]: on } })),
    [patch],
  )

  const dismissNotice = useCallback(
    (id: string) => patch((current) => ({ ...current, notices: current.notices.filter((notice) => notice.id !== id) })),
    [patch],
  )

  const value = useMemo<ProviderContextValue>(
    () => ({
      state,
      listing: state.listing,
      bookings,
      markWelcomeSeen,
      updateListing,
      submitListing,
      setPaused,
      blockDates,
      unblockDate,
      cancelAsProvider,
      completeBooking,
      sendMessage,
      sendHostMessage,
      hostMessages,
      markMessagesRead,
      clearSamples,
      updateBusiness,
      setPayoutAccount,
      submitVerification,
      requestPayout,
      setPref,
      dismissNotice,
    }),
    [
      state,
      bookings,
      markWelcomeSeen,
      updateListing,
      submitListing,
      setPaused,
      blockDates,
      unblockDate,
      cancelAsProvider,
      completeBooking,
      sendMessage,
      sendHostMessage,
      hostMessages,
      markMessagesRead,
      clearSamples,
      updateBusiness,
      setPayoutAccount,
      submitVerification,
      requestPayout,
      setPref,
      dismissNotice,
    ],
  )

  return <ProviderContext.Provider value={value}>{children}</ProviderContext.Provider>
}

export function useProvider(): ProviderContextValue {
  const context = useContext(ProviderContext)
  if (!context) throw new Error('useProvider must be used inside <ProviderProvider>')
  return context
}
