import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { makeId, todayISO } from '../lib/events'
import type { OperatingMode } from '../lib/signupFlow'
import {
  emptyVenue,
  hostChatId,
  maskAccount,
  ownerPenalty,
  sampleBookings,
  toDirectoryVenue,
} from '../lib/owner'
import type {
  BlockedDate,
  BookingMessage,
  ListingStatus,
  OwnerBooking,
  OwnerBookingStatus,
  OwnerCancellation,
  OwnerVenue,
  Payout,
} from '../lib/owner'
import { findContactDetails } from '../lib/contactGuard'
import { setListedVenues } from '../lib/venues'
import { useEvents } from './Events'
import { useProfile } from './Profile'

/**
 * Everything a venue owner manages, held above the screens.
 *
 * Bookings come from two places. Sample bookings live here. Real ones live
 * in the events store, because a host's checkout writes them onto the host's
 * event — so this provider reads those for the owner's venues and keeps only
 * what is added afterwards (messages, completion, an owner cancellation) as
 * an overlay. An owner cancellation writes straight back to the host's
 * booking, which is what makes the two sides agree.
 *
 * Moderation, ID checks and bank transfers have no backend in this build.
 * They are simulated with short timers and labelled as such on screen.
 */
const STORAGE_KEY = 'owambe.owner.v1'

/** How long the simulated listing review takes. */
const REVIEW_MS = 6_000
const VERIFY_MS = 5_000
const PAYOUT_MS = 6_000

export type OwnerBusiness = {
  businessName: string
  mode: OperatingMode
  rcNumber: string
  phone: string
  email: string
}

export type PayoutAccount = {
  bank: string
  accountNumber: string
  accountName: string
}

export type Verification = {
  status: 'none' | 'pending' | 'verified'
  idType: string
  /** Only the last four digits are kept. */
  idLast4: string
  submittedISO?: string
}

export type OwnerPrefs = {
  requestSms: boolean
  requestEmail: boolean
  whatsapp: boolean
  weeklySummary: boolean
}

export type OwnerNotice = {
  id: string
  text: string
  href?: string
  atISO: string
}

type BookingOverlay = {
  messages: BookingMessage[]
  completed?: boolean
  ownerReadISO?: string
  cancellation?: OwnerCancellation
}

type OwnerState = {
  welcomeSeen: boolean
  venues: OwnerVenue[]
  /** Sample bookings, kept here because no host record exists for them. */
  bookings: OwnerBooking[]
  /** Owner-side additions to real host bookings, keyed by owner booking id. */
  overlays: Record<string, BookingOverlay>
  samplesSeeded: boolean
  business: OwnerBusiness
  payoutAccount: PayoutAccount | null
  verification: Verification
  payouts: Payout[]
  prefs: OwnerPrefs
  notices: OwnerNotice[]
  /** Last time the owner looked at their calendar. */
  calendarCheckedISO?: string
}

const EMPTY_STATE: OwnerState = {
  welcomeSeen: false,
  venues: [],
  bookings: [],
  overlays: {},
  samplesSeeded: false,
  business: { businessName: '', mode: 'solo', rcNumber: '', phone: '', email: '' },
  payoutAccount: null,
  verification: { status: 'none', idType: '', idLast4: '' },
  payouts: [],
  prefs: { requestSms: true, requestEmail: true, whatsapp: false, weeklySummary: true },
  notices: [],
}

function load(): OwnerState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_STATE
    const parsed = JSON.parse(raw) as Partial<OwnerState>
    // Merged over the empty state so a copy from an older build cannot leave a
    // field undefined and crash a screen.
    return {
      ...EMPTY_STATE,
      ...parsed,
      venues: (parsed.venues ?? []).map((venue) => emptyVenue(venue)),
      business: { ...EMPTY_STATE.business, ...parsed.business },
      verification: { ...EMPTY_STATE.verification, ...parsed.verification },
      prefs: { ...EMPTY_STATE.prefs, ...parsed.prefs },
      overlays: parsed.overlays ?? {},
      // Requests and declines no longer exist, so old samples of them go.
      bookings: (parsed.bookings ?? []).filter((booking) => {
        const status = booking.status as string
        return status !== 'pending' && status !== 'declined'
      }),
      payouts: parsed.payouts ?? [],
      notices: parsed.notices ?? [],
    }
  } catch {
    return EMPTY_STATE
  }
}

export type VenuePatch = Partial<OwnerVenue> | ((venue: OwnerVenue) => Partial<OwnerVenue>)

type OwnerContextValue = {
  state: OwnerState
  /** Sample and real bookings for every venue this owner runs. */
  bookings: OwnerBooking[]
  /** True when the last save failed — usually photos filling local storage. */
  storageFull: boolean

  markWelcomeSeen: () => void
  createVenue: (seed: Partial<OwnerVenue>) => OwnerVenue
  /** Takes a patch, or a function of the current venue for read-then-write. */
  updateVenue: (id: string, patch: VenuePatch) => void
  deleteVenue: (id: string) => void
  submitVenue: (id: string) => void
  setVenueStatus: (id: string, status: ListingStatus) => void
  blockDates: (venueId: string, dates: string[], reason: string) => void
  unblockDate: (venueId: string, date: string) => void

  cancelAsOwner: (id: string, reason: string) => void
  completeBooking: (id: string) => void
  sendMessage: (id: string, text: string) => void
  /** Keyed by chat id, so it also works for venues this owner doesn't run. */
  sendHostMessage: (chatId: string, text: string) => void
  markMessagesRead: (id: string) => void
  markCalendarChecked: () => void
  clearSamples: () => void
  /** Dev helper: swaps the samples on every live or paused venue for this set. */
  replaceSamples: (build: (venue: OwnerVenue) => { bookings: OwnerBooking[]; blocked: BlockedDate }) => void

  updateBusiness: (patch: Partial<OwnerBusiness>) => void
  setPayoutAccount: (account: PayoutAccount | null) => void
  submitVerification: (idType: string, idNumber: string) => void
  requestPayout: (amount: number) => void
  setPref: (pref: keyof OwnerPrefs, on: boolean) => void
  dismissNotice: (id: string) => void
}

const OwnerContext = createContext<OwnerContextValue | null>(null)

export function OwnerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OwnerState>(load)
  const [storageFull, setStorageFull] = useState(false)
  const { events, cancelBooking: cancelHostBooking } = useEvents()
  const { profile } = useProfile()

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      setStorageFull(false)
    } catch {
      // Quota errors land here. The session keeps working; the photo step
      // tells the owner their latest changes will not survive a refresh.
      setStorageFull(true)
    }
  }, [state])

  const patch = useCallback((change: (current: OwnerState) => OwnerState) => {
    setState(change)
  }, [])

  const patchVenue = useCallback(
    (id: string, change: (venue: OwnerVenue) => OwnerVenue) =>
      patch((current) => ({
        ...current,
        venues: current.venues.map((venue) => (venue.id === id ? change(venue) : venue)),
      })),
    [patch],
  )

  /* ── Bookings: samples + real host bookings ────────────── */

  const venueIds = useMemo(() => new Set(state.venues.map((venue) => venue.id)), [state.venues])

  const hostBookings = useMemo(() => {
    const list: OwnerBooking[] = []
    for (const event of events) {
      for (const booking of event.bookings) {
        if (!venueIds.has(booking.venueId)) continue
        const id = hostChatId(event.id, booking.id)
        const overlay = state.overlays[id]

        let status: OwnerBookingStatus = overlay?.completed ? 'completed' : 'confirmed'
        if (booking.status === 'cancelled') status = 'cancelled'

        list.push({
          id,
          source: 'host',
          eventId: event.id,
          hostBookingId: booking.id,
          venueId: booking.venueId,
          // One device plays both sides in this build, so the host's name is
          // the profile name; a backend would send the host's own.
          hostName: profile.displayName.trim() || 'Host',
          eventName: event.name || 'Untitled event',
          eventType: event.type,
          date: booking.date,
          guests: booking.guests,
          addOns: booking.addOns,
          total: booking.total,
          deposit: booking.deposit,
          status,
          createdISO: booking.createdISO,
          balancePaid: Boolean(booking.balancePaidISO),
          messages: overlay?.messages ?? [],
          ownerReadISO: overlay?.ownerReadISO,
          cancellation: overlay?.cancellation,
        })
      }
    }
    return list
  }, [events, venueIds, state.overlays, profile.displayName])

  const bookings = useMemo(
    () =>
      [...hostBookings, ...state.bookings].sort((a, b) => a.date.localeCompare(b.date)),
    [hostBookings, state.bookings],
  )

  /*
   * Live listings go into the host directory. Done during render rather than
   * in an effect so host screens rendered below this provider never see a
   * stale directory on the same pass.
   */
  useMemo(() => {
    const listed = state.venues.filter((venue) => venue.status === 'live' || venue.status === 'paused')
    setListedVenues(
      listed.map((venue) => ({
        ...toDirectoryVenue(
          venue,
          bookings
            .filter(
              (booking) =>
                booking.venueId === venue.id &&
                (booking.status === 'confirmed' || booking.status === 'completed'),
            )
            .map((booking) => booking.date),
        ),
        hidden: venue.status === 'paused',
      })),
    )
  }, [state.venues, bookings])

  const findBooking = useCallback(
    (id: string) => bookings.find((booking) => booking.id === id),
    [bookings],
  )

  const setOverlay = useCallback(
    (id: string, change: (overlay: BookingOverlay) => BookingOverlay) =>
      patch((current) => ({
        ...current,
        overlays: {
          ...current.overlays,
          [id]: change(current.overlays[id] ?? { messages: [] }),
        },
      })),
    [patch],
  )

  const setSampleStatus = useCallback(
    (id: string, status: OwnerBookingStatus, extra: Partial<OwnerBooking> = {}) =>
      patch((current) => ({
        ...current,
        bookings: current.bookings.map((booking) =>
          booking.id === id ? { ...booking, ...extra, status } : booking,
        ),
      })),
    [patch],
  )

  const cancelAsOwner = useCallback(
    (id: string, reason: string) => {
      const booking = findBooking(id)
      if (!booking) return
      const cancellation: OwnerCancellation = {
        reason,
        penalty: ownerPenalty(booking.total),
        atISO: new Date().toISOString(),
      }
      if (booking.source === 'sample') {
        setSampleStatus(id, 'cancelled', { cancellation })
      } else {
        if (booking.eventId && booking.hostBookingId) {
          // The host's own cancel also drops the budget line the booking wrote.
          cancelHostBooking(booking.eventId, booking.hostBookingId)
        }
        setOverlay(id, (overlay) => ({ ...overlay, cancellation }))
      }
      // The date stays shut, so cancelling can't free it up to resell.
      patchVenue(booking.venueId, (venue) => ({
        ...venue,
        blocked: [
          ...venue.blocked.filter((entry) => entry.date !== booking.date),
          { date: booking.date, reason: 'Closed after you cancelled a booking', locked: true },
        ],
      }))
    },
    [findBooking, setSampleStatus, cancelHostBooking, setOverlay, patchVenue],
  )

  const completeBooking = useCallback(
    (id: string) => {
      const booking = findBooking(id)
      if (!booking) return
      if (booking.source === 'sample') setSampleStatus(id, 'completed')
      else setOverlay(id, (overlay) => ({ ...overlay, completed: true }))
    },
    [findBooking, setSampleStatus, setOverlay],
  )

  const sendMessage = useCallback(
    (id: string, text: string) => {
      const booking = findBooking(id)
      const trimmed = text.trim()
      if (!booking || !trimmed || findContactDetails(trimmed)) return
      const message: BookingMessage = {
        id: makeId(),
        from: 'owner',
        text: trimmed,
        atISO: new Date().toISOString(),
      }
      if (booking.source === 'sample') {
        patch((current) => ({
          ...current,
          bookings: current.bookings.map((entry) =>
            entry.id === id ? { ...entry, messages: [...entry.messages, message] } : entry,
          ),
        }))
      } else {
        setOverlay(id, (overlay) => ({ ...overlay, messages: [...overlay.messages, message] }))
      }
    },
    [findBooking, patch, setOverlay],
  )

  const sendHostMessage = useCallback(
    (chatId: string, text: string) => {
      const trimmed = text.trim()
      if (!trimmed || findContactDetails(trimmed)) return
      const message: BookingMessage = {
        id: makeId(),
        from: 'host',
        text: trimmed,
        atISO: new Date().toISOString(),
      }
      setOverlay(chatId, (overlay) => ({ ...overlay, messages: [...overlay.messages, message] }))
    },
    [setOverlay],
  )

  const markMessagesRead = useCallback(
    (id: string) => {
      const ownerReadISO = new Date().toISOString()
      const booking = findBooking(id)
      if (!booking) return
      if (booking.source === 'sample') {
        patch((current) => ({
          ...current,
          bookings: current.bookings.map((entry) => (entry.id === id ? { ...entry, ownerReadISO } : entry)),
        }))
      } else {
        setOverlay(id, (overlay) => ({ ...overlay, ownerReadISO }))
      }
    },
    [findBooking, patch, setOverlay],
  )

  const markCalendarChecked = useCallback(
    () => patch((current) => ({ ...current, calendarCheckedISO: new Date().toISOString() })),
    [patch],
  )

  const clearSamples = useCallback(
    () => patch((current) => ({ ...current, bookings: [] })),
    [patch],
  )

  const replaceSamples = useCallback(
    (build: (venue: OwnerVenue) => { bookings: OwnerBooking[]; blocked: BlockedDate }) =>
      patch((current) => {
        const listed = current.venues.filter((venue) => venue.status === 'live' || venue.status === 'paused')
        const sets = new Map(listed.map((venue) => [venue.id, build(venue)]))
        return {
          ...current,
          samplesSeeded: true,
          bookings: [
            ...current.bookings.filter((booking) => !sets.has(booking.venueId)),
            ...[...sets.values()].flatMap((set) => set.bookings),
          ],
          venues: current.venues.map((venue) => {
            const set = sets.get(venue.id)
            if (!set) return venue
            // A sample block from an earlier run would be left behind otherwise.
            const kept = venue.blocked.filter((entry) => entry.reason !== set.blocked.reason)
            return {
              ...venue,
              blocked: kept.some((entry) => entry.date === set.blocked.date) ? kept : [...kept, set.blocked],
            }
          }),
        }
      }),
    [patch],
  )

  /* ── Venues ─────────────────────────────────────────────── */

  const markWelcomeSeen = useCallback(
    () => patch((current) => (current.welcomeSeen ? current : { ...current, welcomeSeen: true })),
    [patch],
  )

  const createVenue = useCallback(
    (seed: Partial<OwnerVenue>) => {
      const venue = emptyVenue(seed)
      patch((current) => ({ ...current, venues: [...current.venues, venue] }))
      return venue
    },
    [patch],
  )

  const updateVenue = useCallback(
    (id: string, change: VenuePatch) =>
      patchVenue(id, (venue) => ({
        ...venue,
        ...(typeof change === 'function' ? change(venue) : change),
      })),
    [patchVenue],
  )

  const deleteVenue = useCallback(
    (id: string) =>
      patch((current) => ({
        ...current,
        venues: current.venues.filter((venue) => venue.id !== id),
        bookings: current.bookings.filter((booking) => booking.venueId !== id),
      })),
    [patch],
  )

  const submitVenue = useCallback(
    (id: string) =>
      patchVenue(id, (venue) => ({
        ...venue,
        status: 'review',
        submittedISO: new Date().toISOString(),
      })),
    [patchVenue],
  )

  const setVenueStatus = useCallback(
    (id: string, status: ListingStatus) => patchVenue(id, (venue) => ({ ...venue, status })),
    [patchVenue],
  )

  const blockDates = useCallback(
    (venueId: string, dates: string[], reason: string) =>
      patchVenue(venueId, (venue) => {
        const existing = new Set(venue.blocked.map((entry) => entry.date))
        const added = dates
          .filter((date) => !existing.has(date))
          .map((date) => ({ date, reason: reason.trim() }))
        return { ...venue, blocked: [...venue.blocked, ...added] }
      }),
    [patchVenue],
  )

  const unblockDate = useCallback(
    (venueId: string, date: string) =>
      patchVenue(venueId, (venue) => ({
        ...venue,
        blocked: venue.blocked.filter((entry) => entry.date !== date || entry.locked),
      })),
    [patchVenue],
  )

  /* ── Simulated review ──────────────────────────────────── */

  useEffect(() => {
    const inReview = state.venues.filter((venue) => venue.status === 'review')
    if (inReview.length === 0) return

    const timers = inReview.map((venue) => {
      const elapsed = Date.now() - new Date(venue.submittedISO ?? Date.now()).getTime()
      return window.setTimeout(() => {
        patch((current) => {
          const target = current.venues.find((entry) => entry.id === venue.id)
          if (!target || target.status !== 'review') return current
          const published = { ...target, status: 'live' as const, publishedISO: new Date().toISOString() }
          return {
            ...current,
            venues: current.venues.map((entry) => (entry.id === venue.id ? published : entry)),
            // The first venue to go live brings sample bookings, so a new
            // owner can see every stage of the flow before a real one lands.
            bookings: current.samplesSeeded ? current.bookings : sampleBookings(published),
            samplesSeeded: true,
            notices: [
              {
                id: makeId(),
                text: `${target.name} is live. Hosts can now find and book it.`,
                href: `/owner/venues/${target.id}`,
                atISO: new Date().toISOString(),
              },
              ...current.notices,
            ],
          }
        })
      }, Math.max(0, REVIEW_MS - elapsed))
    })

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [state.venues, patch])

  /* ── Money & identity ──────────────────────────────────── */

  const updateBusiness = useCallback(
    (change: Partial<OwnerBusiness>) =>
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
                  href: '/owner/earnings',
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
          payouts: current.payouts.map((entry) =>
            entry.id === payout.id ? { ...entry, status: 'paid' as const } : entry,
          ),
        }))
      }, Math.max(0, PAYOUT_MS - elapsed))
    })
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [state.payouts, patch])

  const setPref = useCallback(
    (pref: keyof OwnerPrefs, on: boolean) =>
      patch((current) => ({ ...current, prefs: { ...current.prefs, [pref]: on } })),
    [patch],
  )

  const dismissNotice = useCallback(
    (id: string) =>
      patch((current) => ({
        ...current,
        notices: current.notices.filter((notice) => notice.id !== id),
      })),
    [patch],
  )

  const value = useMemo<OwnerContextValue>(
    () => ({
      state,
      bookings,
      storageFull,
      markWelcomeSeen,
      createVenue,
      updateVenue,
      deleteVenue,
      submitVenue,
      setVenueStatus,
      blockDates,
      unblockDate,
      cancelAsOwner,
      completeBooking,
      sendMessage,
      sendHostMessage,
      markMessagesRead,
      markCalendarChecked,
      clearSamples,
      replaceSamples,
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
      storageFull,
      markWelcomeSeen,
      createVenue,
      updateVenue,
      deleteVenue,
      submitVenue,
      setVenueStatus,
      blockDates,
      unblockDate,
      cancelAsOwner,
      completeBooking,
      sendMessage,
      sendHostMessage,
      markMessagesRead,
      markCalendarChecked,
      clearSamples,
      replaceSamples,
      updateBusiness,
      setPayoutAccount,
      submitVerification,
      requestPayout,
      setPref,
      dismissNotice,
    ],
  )

  return <OwnerContext.Provider value={value}>{children}</OwnerContext.Provider>
}

export function useOwner(): OwnerContextValue {
  const context = useContext(OwnerContext)
  if (!context) throw new Error('useOwner must be used inside <OwnerProvider>')
  return context
}

/** The owner's venue by id, or undefined. */
export function useOwnerVenue(id: string): OwnerVenue | undefined {
  const { state } = useOwner()
  return state.venues.find((venue) => venue.id === id)
}

/** Bookings that hold a date — the ones that make a day unavailable. */
export function holdsDate(booking: OwnerBooking): boolean {
  return booking.status === 'confirmed' || booking.status === 'completed'
}

/** True when the date is in the past (so an event on it can be completed). */
export function isPastOrToday(date: string): boolean {
  return date <= todayISO()
}
