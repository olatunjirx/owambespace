import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { emptyEvent, makeId } from '../lib/events'
import type {
  Booking,
  ChecklistItem,
  EventRecord,
  Expense,
  Guest,
  Hire,
  RsvpStatus,
} from '../lib/events'
import type { BudgetCategory } from '../lib/events'
import type { RunSheet } from '../lib/runSheet'

/**
 * Every event the host is running, held above the screens.
 *
 * A host plans several events at once, so this is a collection keyed by id —
 * never a single "current plan". Screens take an event id from the route and
 * look it up; nothing here is implicitly "the" event.
 *
 * Persisted so a guest list built over a week survives a refresh. Swapping
 * localStorage for an API means changing `load`/`persist` and nothing else.
 */
const STORAGE_KEY = 'owambe.host.events.v1'

type EventsContextValue = {
  events: EventRecord[]
  getEvent: (id: string) => EventRecord | undefined
  createEvent: (values: Partial<EventRecord>) => EventRecord
  updateEvent: (id: string, patch: Partial<EventRecord>) => void
  deleteEvent: (id: string) => void

  toggleChecklistItem: (eventId: string, itemId: string) => void
  addChecklistItem: (eventId: string, label: string) => void
  removeChecklistItem: (eventId: string, itemId: string) => void

  addGuest: (eventId: string, guest: Omit<Guest, 'id'>) => void
  setGuestStatus: (eventId: string, guestId: string, status: RsvpStatus) => void
  updateGuest: (eventId: string, guestId: string, patch: Partial<Omit<Guest, 'id'>>) => void
  removeGuest: (eventId: string, guestId: string) => void

  addExpense: (eventId: string, expense: Omit<Expense, 'id'>) => void
  addExpenses: (eventId: string, expenses: Omit<Expense, 'id'>[]) => void
  updateExpense: (eventId: string, expenseId: string, patch: Partial<Omit<Expense, 'id'>>) => void
  removeExpense: (eventId: string, expenseId: string) => void

  toggleSavedVenue: (eventId: string, venueId: string) => void
  addBooking: (eventId: string, booking: Omit<Booking, 'id'>) => Booking
  cancelBooking: (eventId: string, bookingId: string) => void
  payBalance: (eventId: string, bookingId: string) => void

  addHire: (eventId: string, hire: Omit<Hire, 'id'>) => Hire
  cancelHire: (eventId: string, hireId: string) => void
  payHireBalance: (eventId: string, hireId: string) => void

  setRunSheet: (eventId: string, sheet: RunSheet) => void
  resetRunSheet: (eventId: string) => void
}

const EventsContext = createContext<EventsContextValue | null>(null)

function load(): EventRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as EventRecord[]
    if (!Array.isArray(parsed)) return []

    // Merged over a blank event so a copy written by an older build cannot
    // leave a field undefined and crash a screen.
    return parsed.map((stored) => ({
      ...emptyEvent(),
      ...stored,
      checklist: stored.checklist ?? [],
      guests: stored.guests ?? [],
      // Older builds could hold requests waiting on a venue. Every booking is
      // instant now, so nothing is left to answer them.
      bookings: (stored.bookings ?? []).map((booking) =>
        (booking.status as string) === 'pending' ? { ...booking, status: 'confirmed' as const } : booking,
      ),
      // Older builds stored an expected and a paid figure; the expected one is
      // what the host budgeted, so it becomes the single amount.
      expenses: (stored.expenses ?? []).map((expense) => {
        const { planned, paid: _paid, ...rest } = expense as Expense & { planned?: number; paid?: number }
        return { ...rest, amount: rest.amount ?? planned ?? 0 }
      }),
      hires: stored.hires ?? [],
      saved: stored.saved ?? [],
    }))
  } catch {
    // Corrupt or unavailable storage should cost the events, not the app.
    return []
  }
}

/** Which budget line a provider's category lands on. */
function budgetCategoryFor(slug: string): BudgetCategory {
  switch (slug) {
    case 'catering':
      return 'Catering'
    case 'decor':
      return 'Decor'
    case 'photo':
      return 'Photo & video'
    case 'music':
    case 'mc':
      return 'Music'
    default:
      return 'Other'
  }
}

function persist(events: EventRecord[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch {
    // Private browsing and full quotas both land here; the session still works.
  }
}

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<EventRecord[]>(load)

  useEffect(() => persist(events), [events])

  /** Applies a change to one event and leaves the rest untouched. */
  const patchEvent = useCallback(
    (id: string, change: (event: EventRecord) => EventRecord) => {
      setEvents((current) =>
        current.map((event) => (event.id === id ? change(event) : event)),
      )
    },
    [],
  )

  const getEvent = useCallback(
    (id: string) => events.find((event) => event.id === id),
    [events],
  )

  const createEvent = useCallback((values: Partial<EventRecord>) => {
    const event: EventRecord = { ...emptyEvent(), ...values }
    setEvents((current) => [event, ...current])
    return event
  }, [])

  const updateEvent = useCallback(
    (id: string, patch: Partial<EventRecord>) =>
      patchEvent(id, (event) => ({ ...event, ...patch })),
    [patchEvent],
  )

  const deleteEvent = useCallback((id: string) => {
    setEvents((current) => current.filter((event) => event.id !== id))
  }, [])

  /* ── Checklist ─────────────────────────────────────────── */

  const toggleChecklistItem = useCallback(
    (eventId: string, itemId: string) =>
      patchEvent(eventId, (event) => ({
        ...event,
        checklist: event.checklist.map((item) =>
          item.id === itemId ? { ...item, done: !item.done } : item,
        ),
      })),
    [patchEvent],
  )

  const addChecklistItem = useCallback(
    (eventId: string, label: string) =>
      patchEvent(eventId, (event) => {
        const item: ChecklistItem = {
          id: makeId(),
          label,
          note: 'Added by you.',
          // Slots in with the near-term work rather than at the very top.
          weeksBefore: 2,
          done: false,
          custom: true,
        }
        return { ...event, checklist: [...event.checklist, item] }
      }),
    [patchEvent],
  )

  const removeChecklistItem = useCallback(
    (eventId: string, itemId: string) =>
      patchEvent(eventId, (event) => ({
        ...event,
        checklist: event.checklist.filter((item) => item.id !== itemId),
      })),
    [patchEvent],
  )

  /* ── Guests ────────────────────────────────────────────── */

  const addGuest = useCallback(
    (eventId: string, guest: Omit<Guest, 'id'>) =>
      patchEvent(eventId, (event) => {
        const now = new Date().toISOString()
        return {
          ...event,
          guests: [
            { source: 'host' as const, addedISO: now, statusISO: now, ...guest, id: makeId() },
            ...event.guests,
          ],
        }
      }),
    [patchEvent],
  )

  const setGuestStatus = useCallback(
    (eventId: string, guestId: string, status: RsvpStatus) =>
      patchEvent(eventId, (event) => ({
        ...event,
        guests: event.guests.map((guest) =>
          guest.id === guestId && guest.status !== status
            ? { ...guest, status, statusISO: new Date().toISOString() }
            : guest,
        ),
      })),
    [patchEvent],
  )

  const updateGuest = useCallback(
    (eventId: string, guestId: string, patch: Partial<Omit<Guest, 'id'>>) =>
      patchEvent(eventId, (event) => ({
        ...event,
        guests: event.guests.map((guest) => (guest.id === guestId ? { ...guest, ...patch } : guest)),
      })),
    [patchEvent],
  )

  const removeGuest = useCallback(
    (eventId: string, guestId: string) =>
      patchEvent(eventId, (event) => ({
        ...event,
        guests: event.guests.filter((guest) => guest.id !== guestId),
      })),
    [patchEvent],
  )

  /* ── Budget ────────────────────────────────────────────── */

  const addExpense = useCallback(
    (eventId: string, expense: Omit<Expense, 'id'>) =>
      patchEvent(eventId, (event) => ({
        ...event,
        expenses: [...event.expenses, { ...expense, id: makeId() }],
      })),
    [patchEvent],
  )

  const addExpenses = useCallback(
    (eventId: string, expenses: Omit<Expense, 'id'>[]) =>
      patchEvent(eventId, (event) => ({
        ...event,
        expenses: [...event.expenses, ...expenses.map((expense) => ({ ...expense, id: makeId() }))],
      })),
    [patchEvent],
  )

  const updateExpense = useCallback(
    (eventId: string, expenseId: string, patch: Partial<Omit<Expense, 'id'>>) =>
      patchEvent(eventId, (event) => ({
        ...event,
        expenses: event.expenses.map((expense) =>
          expense.id === expenseId ? { ...expense, ...patch } : expense,
        ),
      })),
    [patchEvent],
  )

  const removeExpense = useCallback(
    (eventId: string, expenseId: string) =>
      patchEvent(eventId, (event) => ({
        ...event,
        expenses: event.expenses.filter((expense) => expense.id !== expenseId),
      })),
    [patchEvent],
  )

  /* ── Venues ────────────────────────────────────────────── */

  const toggleSavedVenue = useCallback(
    (eventId: string, venueId: string) =>
      patchEvent(eventId, (event) => ({
        ...event,
        saved: event.saved.includes(venueId)
          ? event.saved.filter((id) => id !== venueId)
          : [...event.saved, venueId],
      })),
    [patchEvent],
  )

  /**
   * Booking a venue also writes the budget line, because a host who has just
   * committed millions should not have to remember to type it in again.
   */
  const addBooking = useCallback(
    (eventId: string, booking: Omit<Booking, 'id'>) => {
      const created: Booking = { ...booking, id: makeId() }

      patchEvent(eventId, (event) => ({
        ...event,
        bookings: [...event.bookings, created],
        // A booked venue is no longer merely saved.
        saved: event.saved.filter((id) => id !== created.venueId),
        // Booking a hall is the venue steps being done. Leaving them unticked
        // would have the checklist telling a host to find a venue they have
        // already paid a deposit on.
        checklist:
          created.status === 'confirmed'
            ? event.checklist.map((item) =>
                item.satisfiedBy === 'venue' ? { ...item, done: true } : item,
              )
            : event.checklist,
        expenses: [
          ...event.expenses,
          {
            id: makeId(),
            label: 'Venue booking',
            category: 'Venue' as const,
            amount: created.total,
            bookingId: created.id,
          },
        ],
      }))

      return created
    },
    [patchEvent],
  )

  const cancelBooking = useCallback(
    (eventId: string, bookingId: string) =>
      patchEvent(eventId, (event) => {
        const bookings = event.bookings.map((booking) =>
          booking.id === bookingId ? { ...booking, status: 'cancelled' as const } : booking,
        )

        // Cancelling the last confirmed venue puts those steps back on the
        // list — the work genuinely needs doing again.
        const stillBooked = bookings.some((booking) => booking.status === 'confirmed')

        return {
          ...event,
          bookings,
          checklist: stillBooked
            ? event.checklist
            : event.checklist.map((item) =>
                item.satisfiedBy === 'venue' ? { ...item, done: false } : item,
              ),
          // The matching budget line goes too; a cancelled booking is not spend.
          expenses: event.expenses.filter((expense) => expense.bookingId !== bookingId),
        }
      }),
    [patchEvent],
  )

  const payBalance = useCallback(
    (eventId: string, bookingId: string) =>
      patchEvent(eventId, (event) => ({
        ...event,
        bookings: event.bookings.map((booking) =>
          booking.id === bookingId ? { ...booking, balancePaidISO: new Date().toISOString() } : booking,
        ),
      })),
    [patchEvent],
  )

  /* ── Service providers ─────────────────────────────────── */

  /** Like a venue booking, a hire writes its own budget line. */
  const addHire = useCallback(
    (eventId: string, hire: Omit<Hire, 'id'>) => {
      const created: Hire = { ...hire, id: makeId() }
      patchEvent(eventId, (event) => ({
        ...event,
        hires: [...event.hires, created],
        expenses: [
          ...event.expenses,
          {
            id: makeId(),
            label: `${created.vendorName} · ${created.packageName}`,
            category: budgetCategoryFor(created.category),
            amount: created.total,
            bookingId: created.id,
          },
        ],
      }))
      return created
    },
    [patchEvent],
  )

  const cancelHire = useCallback(
    (eventId: string, hireId: string) =>
      patchEvent(eventId, (event) => ({
        ...event,
        hires: event.hires.map((hire) => (hire.id === hireId ? { ...hire, status: 'cancelled' as const } : hire)),
        expenses: event.expenses.filter((expense) => expense.bookingId !== hireId),
      })),
    [patchEvent],
  )

  const payHireBalance = useCallback(
    (eventId: string, hireId: string) =>
      patchEvent(eventId, (event) => ({
        ...event,
        hires: event.hires.map((hire) =>
          hire.id === hireId ? { ...hire, balancePaidISO: new Date().toISOString() } : hire,
        ),
      })),
    [patchEvent],
  )

  /* ── Run sheet ─────────────────────────────────────────── */

  /**
   * Storing the sheet is what takes it out of the generator's hands. Until
   * then it re-derives from the head count on every render, so RSVPs coming
   * in still lengthen the meal service.
   */
  const setRunSheet = useCallback(
    (eventId: string, sheet: RunSheet) =>
      patchEvent(eventId, (event) => ({ ...event, runSheet: sheet })),
    [patchEvent],
  )

  const resetRunSheet = useCallback(
    (eventId: string) =>
      patchEvent(eventId, (event) => {
        const { runSheet: _discarded, ...rest } = event
        return rest as EventRecord
      }),
    [patchEvent],
  )

  const value = useMemo(
    () => ({
      events,
      getEvent,
      createEvent,
      updateEvent,
      deleteEvent,
      toggleChecklistItem,
      addChecklistItem,
      removeChecklistItem,
      addGuest,
      setGuestStatus,
      updateGuest,
      removeGuest,
      addExpense,
      addExpenses,
      updateExpense,
      removeExpense,
      toggleSavedVenue,
      addBooking,
      cancelBooking,
      payBalance,
      addHire,
      cancelHire,
      payHireBalance,
      setRunSheet,
      resetRunSheet,
    }),
    [
      events,
      getEvent,
      createEvent,
      updateEvent,
      deleteEvent,
      toggleChecklistItem,
      addChecklistItem,
      removeChecklistItem,
      addGuest,
      setGuestStatus,
      updateGuest,
      removeGuest,
      addExpense,
      addExpenses,
      updateExpense,
      removeExpense,
      toggleSavedVenue,
      addBooking,
      cancelBooking,
      payBalance,
      addHire,
      cancelHire,
      payHireBalance,
      setRunSheet,
      resetRunSheet,
    ],
  )

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
}

export function useEvents(): EventsContextValue {
  const context = useContext(EventsContext)
  if (!context) {
    throw new Error('useEvents must be used inside <EventsProvider>')
  }
  return context
}
