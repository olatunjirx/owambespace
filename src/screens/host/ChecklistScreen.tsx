import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { EventShell } from './EventShell'
import { dueLabel, isOverdue } from '../../lib/checklist'
import { checklistProgress, daysUntil } from '../../lib/events'
import type { ChecklistItem, EventRecord } from '../../lib/events'
import { riseIn, softSpring } from '../../motion/variants'
import { useEvents } from '../../state/Events'
import './checklist.css'
import './host.css'

type ChecklistScreenProps = {
  event: EventRecord
}

type Filter = 'todo' | 'done' | 'all'

/**
 * The event checklist.
 *
 * Ordered by lead time rather than by when things were added, so the list
 * reads as a plan. Done items drop to the bottom instead of vanishing — a
 * host wants to see what they have already handled.
 */
export function ChecklistScreen({ event }: ChecklistScreenProps) {
  const { toggleChecklistItem, addChecklistItem, removeChecklistItem } = useEvents()

  const [label, setLabel] = useState('')
  const [filter, setFilter] = useState<Filter>('todo')

  const days = daysUntil(event.date)
  const progress = checklistProgress(event)

  const ordered = useMemo(() => {
    const sorted = [...event.checklist].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      return b.weeksBefore - a.weeksBefore
    })

    if (filter === 'todo') return sorted.filter((item) => !item.done)
    if (filter === 'done') return sorted.filter((item) => item.done)
    return sorted
  }, [event.checklist, filter])

  const overdue = event.checklist.filter(
    (item) => !item.done && isOverdue(item.weeksBefore, days),
  ).length

  function handleAdd(submitted: FormEvent<HTMLFormElement>): void {
    submitted.preventDefault()
    const trimmed = label.trim()
    if (trimmed.length < 2) return

    addChecklistItem(event.id, trimmed)
    setLabel('')
  }

  return (
    <EventShell
      event={event}
      tab="checklist"
      title="Checklist"
      subtitle={
        overdue > 0
          ? `${progress.done} of ${progress.total} done · ${overdue} past their lead time.`
          : `${progress.done} of ${progress.total} done.`
      }
    >
      <motion.div className="card checklist__head" variants={riseIn}>
        <div className="checklist__progress">
          <div className="checklist__progress-head">
            <span>Progress</span>
            <span>
              {progress.done}/{progress.total}
            </span>
          </div>
          <div className="meter">
            <motion.div
              className="meter__fill"
              initial={{ scaleX: 0 }}
              animate={{
                scaleX: progress.total ? progress.done / progress.total : 0,
              }}
              transition={softSpring}
            />
          </div>
        </div>

        <div className="checklist__filters" role="tablist" aria-label="Filter checklist">
          {(['todo', 'done', 'all'] as Filter[]).map((option) => {
            const count =
              option === 'all'
                ? event.checklist.length
                : event.checklist.filter((item) =>
                    option === 'done' ? item.done : !item.done,
                  ).length
            const current = filter === option
            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={current}
                className={`checklist__filter${current ? ' checklist__filter--on' : ''}`}
                onClick={() => setFilter(option)}
              >
                {option === 'todo' ? 'To do' : option === 'done' ? 'Done' : 'Everything'}
                <span>{count}</span>
              </button>
            )
          })}
        </div>
      </motion.div>

      <motion.form className="card checklist__add" variants={riseIn} onSubmit={handleAdd}>
        <label className="checklist__add-field">
          <span className="filters__label">Add your own step</span>
          <input
            className="filters__input"
            value={label}
            placeholder="Confirm generator with the venue"
            onChange={(changed) => setLabel(changed.target.value)}
          />
        </label>
        <button type="submit" className="ghost-button" disabled={label.trim().length < 2}>
          Add step
        </button>
      </motion.form>

      {ordered.length === 0 ? (
        <motion.div className="empty" variants={riseIn}>
          <p className="empty__title">
            {filter === 'done' ? 'Nothing ticked off yet' : 'Everything is done'}
          </p>
          <p className="empty__body">
            {filter === 'done'
              ? 'Steps you complete will collect here.'
              : 'Every step on this checklist is complete. Add your own if something is missing.'}
          </p>
        </motion.div>
      ) : (
        <motion.ul className="checklist" variants={riseIn}>
          {ordered.map((item) => (
            <ChecklistRow
              key={item.id}
              item={item}
              days={days}
              onToggle={() => toggleChecklistItem(event.id, item.id)}
              onRemove={() => removeChecklistItem(event.id, item.id)}
            />
          ))}
        </motion.ul>
      )}
    </EventShell>
  )
}

type ChecklistRowProps = {
  item: ChecklistItem
  days: number | null
  onToggle: () => void
  onRemove: () => void
}

function ChecklistRow({ item, days, onToggle, onRemove }: ChecklistRowProps) {
  const late = !item.done && isOverdue(item.weeksBefore, days)

  return (
    <motion.li
      className={`checklist__item${item.done ? ' checklist__item--done' : ''}`}
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={softSpring}
    >
      <button
        type="button"
        className="checklist__check"
        role="checkbox"
        aria-checked={item.done}
        onClick={onToggle}
      >
        <motion.span
          className="checklist__box"
          animate={{
            backgroundColor: item.done ? 'var(--primary-base)' : 'rgba(0,0,0,0)',
            borderColor: item.done ? 'var(--primary-base)' : 'var(--bg-muted)',
          }}
          transition={softSpring}
        >
          <AnimatePresence initial={false}>
            {item.done && (
              <motion.svg
                viewBox="0 0 16 16"
                width="12"
                height="12"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                aria-hidden="true"
              >
                <path
                  d="M3.5 8.5 6.5 11.5 12.5 5"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.span>

        <span className="checklist__text">
          <span className="checklist__label">{item.label}</span>
          <span className="checklist__note">{item.note}</span>
        </span>
      </button>

      <span className={`tag ${late ? 'tag--danger' : item.done ? 'tag--muted' : 'tag--accent'}`}>
        {item.done ? 'Done' : dueLabel(item.weeksBefore, days)}
      </span>

      {item.custom && (
        <button
          type="button"
          className="row-remove"
          onClick={onRemove}
          aria-label={`Remove ${item.label}`}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </motion.li>
  )
}
