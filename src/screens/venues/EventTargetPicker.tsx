import { useCallback, useEffect, useState } from 'react'

import { formatShortDate } from '../../lib/events'
import type { EventRecord } from '../../lib/events'
import { useEvents } from '../../state/Events'

/**
 * Which event a saved or booked venue belongs to.
 *
 * Browsing is global but saving is not, so every venue action needs a target
 * event. The choice is remembered between visits — a host shopping for one
 * wedding should not re-pick it on every page.
 */
const STORAGE_KEY = 'owambe.host.venueTarget.v1'

export function useEventTarget() {
  const { events } = useEvents()

  const [targetId, setStoredId] = useState<string>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) ?? ''
    } catch {
      return ''
    }
  })

  // A remembered id can point at an event that has since been deleted.
  const valid = events.some((event) => event.id === targetId)
  const resolvedId = valid ? targetId : (events[0]?.id ?? '')

  useEffect(() => {
    if (resolvedId && resolvedId !== targetId) setStoredId(resolvedId)
  }, [resolvedId, targetId])

  const setTargetId = useCallback((id: string) => {
    setStoredId(id)
    try {
      window.localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // Storage being unavailable costs the memory, not the action.
    }
  }, [])

  const target = events.find((event) => event.id === resolvedId)

  return { targetId: resolvedId, setTargetId, target }
}

type EventTargetPickerProps = {
  events: EventRecord[]
  targetId: string
  onChange: (id: string) => void
  /** Copies the event's state and guest count into the filters. */
  onUseEventDetails?: () => void
}

export function EventTargetPicker({
  events,
  targetId,
  onChange,
  onUseEventDetails,
}: EventTargetPickerProps) {
  return (
    <div className="target">
      <div className="target__field">
        <label className="filters__label" htmlFor="venue-target">
          Saving to
        </label>
        <select
          id="venue-target"
          className="filters__input"
          value={targetId}
          onChange={(event) => onChange(event.target.value)}
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name} · {formatShortDate(event.date)}
            </option>
          ))}
        </select>
      </div>

      {onUseEventDetails && (
        <button type="button" className="ghost-button" onClick={onUseEventDetails}>
          Match this event
        </button>
      )}
    </div>
  )
}
