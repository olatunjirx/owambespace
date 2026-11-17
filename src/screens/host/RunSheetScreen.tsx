import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

import { EventShell } from './EventShell'
import type { EventRecord } from '../../lib/events'
import {
  OWNER_LABELS,
  buildRunSheet,
  callSheet,
  dayShift,
  formatDuration,
  formatTime,
  headCountFor,
  layOut,
  runSheetFlags,
  toPlainText,
} from '../../lib/runSheet'
import type { RunSheet, RunSheetSegment, SegmentOwner } from '../../lib/runSheet'
import { makeId } from '../../lib/events'
import { riseIn } from '../../motion/variants'
import { useEvents } from '../../state/Events'
import './run-sheet.css'

/**
 * The day-of run sheet — spec §10.8.
 *
 * Generated until the host edits it, then theirs. The generated version keeps
 * following the head count as RSVPs land; the moment anything is changed the
 * sheet is stored, because a host who has moved the cake cutting does not want
 * an incoming RSVP moving it back.
 */
export function RunSheetScreen({ event }: { event: EventRecord }) {
  const { setRunSheet, resetRunSheet } = useEvents()
  const [copied, setCopied] = useState(false)

  const generated = !event.runSheet
  const heads = headCountFor(event)

  // Held across renders: buildRunSheet mints fresh segment ids, and a new id
  // every render would remount the row you are typing in.
  const suggested = useMemo(
    () => buildRunSheet(event),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [event.id, event.type, heads],
  )

  const sheet: RunSheet = event.runSheet ?? suggested
  const timed = layOut(sheet)
  const flags = runSheetFlags(event, timed)
  const calls = callSheet(timed)

  /** Any edit takes ownership of the sheet, generated or not. */
  function commit(next: RunSheet): void {
    setRunSheet(event.id, next)
  }

  function patchSegment(id: string, patch: Partial<RunSheetSegment>): void {
    commit({
      ...sheet,
      segments: sheet.segments.map((segment) =>
        segment.id === id ? { ...segment, ...patch } : segment,
      ),
    })
  }

  function removeSegment(id: string): void {
    commit({ ...sheet, segments: sheet.segments.filter((segment) => segment.id !== id) })
  }

  /** Moves a segment one place, which is how a programme actually gets reordered. */
  function move(id: string, direction: -1 | 1): void {
    const index = sheet.segments.findIndex((segment) => segment.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= sheet.segments.length) return

    const segments = [...sheet.segments]
    const [moved] = segments.splice(index, 1)
    segments.splice(target, 0, moved)
    commit({ ...sheet, segments })
  }

  function addSegment(): void {
    const segment: RunSheetSegment = {
      id: makeId(),
      label: 'New segment',
      owner: 'host',
      minutes: 15,
      note: 'Added by you.',
      custom: true,
    }
    commit({ ...sheet, segments: [...sheet.segments, segment] })
  }

  async function copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(toPlainText(event, sheet))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access is refused in some contexts; the sheet is still on
      // screen to read from, so this is not worth an error state.
    }
  }

  return (
    <EventShell
      event={event}
      tab="runsheet"
      title="Run sheet"
      subtitle={`Doors at ${formatTime(timed.segments.find((s) => s.anchor)?.startsAt ?? 0)}, first call at ${formatTime(timed.callTime)}.`}
      actions={
        <>
          <label className="run__start">
            Doors open
            <input
              className="filters__input run__start-input"
              type="time"
              value={sheet.startTime}
              onChange={(changed) =>
                commit({ ...sheet, startTime: changed.target.value })
              }
            />
          </label>
          <button type="button" className="ghost-button" onClick={copyToClipboard}>
            {copied ? 'Copied' : 'Copy as text'}
          </button>
        </>
      }
    >
      <motion.section className="card" variants={riseIn}>
        <div className="card__header">
          <div>
            <h2 className="card__title">The day, hour by hour</h2>
            <p className="card__hint">
              Timed for {heads} guests.{' '}
              {generated
                ? 'Suggested — edit anything and it becomes yours.'
                : 'Yours. Edited from the suggested sheet.'}
            </p>
          </div>
          {generated ? (
            <button type="button" className="ghost-button ghost-button--small" onClick={addSegment}>
              Add segment
            </button>
          ) : (
            <button
              type="button"
              className="ghost-button ghost-button--small"
              onClick={() => resetRunSheet(event.id)}
            >
              Reset to suggested
            </button>
          )}
        </div>

        {flags.length > 0 && (
          <ul className="run__flags">
            {flags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        )}

        <ol className="run__list">
          {timed.segments.map((segment, index) => {
            const shift = dayShift(segment.startsAt)
            return (
              <li
                className={`run__row${segment.setup ? ' run__row--setup' : ''}${segment.anchor ? ' run__row--anchor' : ''}`}
                key={segment.id}
              >
                <span className="run__when">
                  <span className="run__time">{formatTime(segment.startsAt)}</span>
                  {shift && <span className="run__shift">{shift}</span>}
                  <span className="run__length">{formatDuration(segment.minutes)}</span>
                </span>

                <span className="run__body">
                  <span className="run__head">
                    <input
                      className="run__label"
                      value={segment.label}
                      aria-label="Segment name"
                      onChange={(changed) =>
                        patchSegment(segment.id, { label: changed.target.value })
                      }
                    />
                    {segment.anchor && <span className="tag tag--accent">Doors</span>}
                    {segment.setup && !segment.anchor && (
                      <span className="tag tag--muted">Set-up</span>
                    )}
                  </span>
                  <span className="run__note">{segment.note}</span>
                </span>

                <span className="run__controls">
                  <select
                    className="run__owner"
                    value={segment.owner}
                    aria-label="Who runs this"
                    onChange={(changed) =>
                      patchSegment(segment.id, {
                        owner: changed.target.value as SegmentOwner,
                      })
                    }
                  >
                    {(Object.keys(OWNER_LABELS) as SegmentOwner[]).map((owner) => (
                      <option key={owner} value={owner}>
                        {OWNER_LABELS[owner]}
                      </option>
                    ))}
                  </select>

                  <span className="run__minutes">
                    <input
                      type="number"
                      min={5}
                      step={5}
                      value={segment.minutes}
                      aria-label={`${segment.label} length in minutes`}
                      onChange={(changed) =>
                        patchSegment(segment.id, {
                          minutes: Math.max(5, Number(changed.target.value) || 5),
                        })
                      }
                    />
                    min
                  </span>

                  <span className="run__move">
                    <button
                      type="button"
                      aria-label="Move earlier"
                      disabled={index === 0}
                      onClick={() => move(segment.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Move later"
                      disabled={index === timed.segments.length - 1}
                      onClick={() => move(segment.id, 1)}
                    >
                      ↓
                    </button>
                    {/* The doors segment is what every other time is measured
                        from — removing it would leave the sheet anchored to
                        whatever happened to be first. */}
                    {!segment.anchor && (
                      <button
                        type="button"
                        aria-label={`Remove ${segment.label}`}
                        className="run__remove"
                        onClick={() => removeSegment(segment.id)}
                      >
                        ×
                      </button>
                    )}
                  </span>
                </span>
              </li>
            )
          })}
        </ol>

        {!generated && (
          <button type="button" className="ghost-button ghost-button--small run__add" onClick={addSegment}>
            Add segment
          </button>
        )}
      </motion.section>

      <motion.section className="card" variants={riseIn}>
        <div className="card__header">
          <div>
            <h2 className="card__title">Call times</h2>
            <p className="card__hint">
              The earliest each one is needed. This is the message they should get.
            </p>
          </div>
        </div>

        <ul className="run__calls">
          {calls.map((call) => {
            const shift = dayShift(call.at)
            return (
              <li key={call.owner}>
                <span className="run__call-time">
                  {formatTime(call.at)}
                  {shift && <span className="run__shift">{shift}</span>}
                </span>
                <span className="run__call-owner">{OWNER_LABELS[call.owner]}</span>
              </li>
            )
          })}
        </ul>

        <p className="run__source">
          Set-up runs backwards from the doors time, so these are arrival times,
          not start times. Durations come from the table in{' '}
          <code>lib/runSheet.ts</code>, stretched for the head count — nothing
          here is predicted.
        </p>
      </motion.section>
    </EventShell>
  )
}
