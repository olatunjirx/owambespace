import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { seriesColor } from './BudgetChart'
import { PrimaryButton } from '../../components/Buttons'
import { SPEND_STYLES, draftBudget } from '../../lib/budgetAssistant'
import type { SpendStyle } from '../../lib/budgetAssistant'
import { suggestedBudget } from '../../lib/budgetPlan'
import type { EventRecord } from '../../lib/events'
import { formatAmountInput, formatNaira, formatNairaShort, parseNaira } from '../../lib/money'
import { riseIn, softSpring } from '../../motion/variants'
import { useEvents } from '../../state/Events'

type BudgetAssistantProps = {
  event: EventRecord
  /** Absent on a first visit, where the assistant is the page's starting point. */
  onClose?: () => void
  onApplied: () => void
}

export function BudgetAssistant({ event, onClose, onApplied }: BudgetAssistantProps) {
  const { updateEvent, addExpenses } = useEvents()

  const [guests, setGuests] = useState(String(event.guestEstimate || ''))
  const [budget, setBudget] = useState(event.budget ? formatAmountInput(String(event.budget)) : '')
  const [style, setStyle] = useState<SpendStyle>('balanced')
  const [drafted, setDrafted] = useState(false)
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [edits, setEdits] = useState<Record<string, number>>({})
  const [error, setError] = useState('')

  const heads = Number(guests.replace(/\D/g, '')) || 0
  const total = parseNaira(budget)

  const draft = useMemo(
    () =>
      draftBudget({
        type: event.type,
        guests: heads,
        budget: total,
        state: event.state,
        existing: event.expenses,
        style,
      }),
    [event.type, event.state, event.expenses, heads, total, style],
  )

  // A changed input is a new draft; edits to the old one no longer apply.
  function resetDraftEdits(): void {
    setSkipped(new Set())
    setEdits({})
  }

  const chosen = draft.lines
    .filter((line) => !skipped.has(line.key))
    .map((line) => ({ ...line, amount: edits[line.key] ?? line.amount }))
  const chosenTotal = chosen.reduce((sum, line) => sum + line.amount, 0)
  const alreadyIn = event.expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const afterAdding = alreadyIn + chosenTotal

  const suggestion = suggestedBudget({ ...event, guestEstimate: heads })

  function start(): void {
    if (!heads) {
      setError('How many guests are you expecting?')
      return
    }
    if (!total) {
      setError('What is the total budget for the event?')
      return
    }
    setError('')
    setDrafted(true)
  }

  function apply(): void {
    if (total !== event.budget || heads !== event.guestEstimate) {
      updateEvent(event.id, { budget: total, guestEstimate: heads })
    }
    addExpenses(
      event.id,
      chosen.map((line) => ({ label: line.label, category: line.category, amount: line.amount })),
    )
    onApplied()
  }

  return (
    <motion.section
      className="card assist"
      variants={riseIn}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -8 }}
      aria-label="Budget assistant"
    >
      <div className="assist__head">
        <span className="assist__mark" aria-hidden="true">
          <SparkleIcon />
        </span>
        <div className="assist__intro">
          <h2 className="assist__title">
            {drafted ? 'Here is a draft budget' : 'Let the assistant draft your budget'}
          </h2>
          <p className="card__hint">
            Built from your event type, guest count and total, using what events like yours
            usually cost. Change anything before you add it.
          </p>
        </div>
        {onClose && (
          <button type="button" className="assist__close" onClick={onClose} aria-label="Close the assistant">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <div className="assist__inputs">
        <div className="assist__field">
          <span className="filters__label">Event</span>
          <span className="assist__fixed">{event.type}</span>
        </div>

        <label className="assist__field">
          <span className="filters__label">Guests</span>
          <input
            className="filters__input"
            inputMode="numeric"
            value={guests}
            placeholder="150"
            onChange={(changed) => {
              setGuests(changed.target.value.replace(/\D/g, '').slice(0, 5))
              resetDraftEdits()
              setError('')
            }}
          />
        </label>

        <label className="assist__field assist__field--grow">
          <span className="filters__label">Total budget (₦)</span>
          <input
            className="filters__input"
            inputMode="numeric"
            value={budget}
            placeholder="5,000,000"
            onChange={(changed) => {
              setBudget(formatAmountInput(changed.target.value))
              resetDraftEdits()
              setError('')
            }}
          />
        </label>

        <div className="assist__field assist__field--wide">
          <span className="filters__label">How should it be spent?</span>
          <div className="assist__styles" role="radiogroup" aria-label="Spending style">
            {(Object.keys(SPEND_STYLES) as SpendStyle[]).map((option) => {
              const on = style === option
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`assist__style${on ? ' assist__style--on' : ''}`}
                  onClick={() => {
                    setStyle(option)
                    resetDraftEdits()
                  }}
                >
                  <span className="assist__style-label">{SPEND_STYLES[option].label}</span>
                  <span className="assist__style-hint">{SPEND_STYLES[option].hint}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {!total && heads > 0 && (
        <p className="assist__nudge">
          Not sure of the total? A {event.type.toLowerCase()} for {heads} guests
          {event.state ? ` in ${event.state}` : ''} usually needs around {formatNairaShort(suggestion)}.{' '}
          <button type="button" onClick={() => setBudget(formatAmountInput(String(suggestion)))}>
            Use {formatNaira(suggestion)}
          </button>
        </p>
      )}

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            className="form-error"
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {!drafted ? (
        <div className="assist__go">
          <PrimaryButton type="button" onClick={start}>
            <SparkleIcon /> Draft my budget
          </PrimaryButton>
        </div>
      ) : (
        <div className="assist__draft" aria-live="polite">
          {(draft.insights.length > 0 || draft.warning) && (
            <div className="assist__why">
              {draft.insights.map((line) => (
                <p key={line}>{line}</p>
              ))}
              {draft.warning && <p className="assist__warning">{draft.warning}</p>}
            </div>
          )}

          {draft.lines.length > 0 && (
            <>
              <ul className="assist__lines">
                {draft.lines.map((line, index) => {
                  const on = !skipped.has(line.key)
                  return (
                    <motion.li
                      key={line.key}
                      className={`assist__line${on ? '' : ' assist__line--off'}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...softSpring, delay: Math.min(index, 16) * 0.03 }}
                    >
                      <label className="assist__pick">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            setSkipped((current) => {
                              const next = new Set(current)
                              if (next.has(line.key)) next.delete(line.key)
                              else next.add(line.key)
                              return next
                            })
                          }
                        />
                        <span className="breakdown__dot" style={{ background: seriesColor(line.category) }} aria-hidden="true" />
                        <span className="assist__line-text">
                          <span className="assist__line-label">{line.label}</span>
                          <span className="assist__line-note">
                            {line.category}
                            {line.note ? ` · ${line.note}` : ''}
                          </span>
                        </span>
                      </label>
                      <AmountField
                        key={`${line.key}-${line.amount}`}
                        label={`Amount for ${line.label}`}
                        value={edits[line.key] ?? line.amount}
                        disabled={!on}
                        onCommit={(amount) => setEdits((current) => ({ ...current, [line.key]: amount }))}
                      />
                    </motion.li>
                  )
                })}
              </ul>

              <div className="assist__foot">
                <div className="assist__tally">
                  <span>
                    <strong>{formatNaira(chosenTotal)}</strong> across {chosen.length}{' '}
                    {chosen.length === 1 ? 'item' : 'items'}
                  </span>
                  <span className={afterAdding > total ? 'assist__over' : 'assist__fits'}>
                    {afterAdding > total
                      ? `${formatNairaShort(afterAdding - total)} over the budget`
                      : `${formatNairaShort(total - afterAdding)} left unplanned`}
                  </span>
                </div>
                <div className="assist__actions">
                  {onClose && (
                    <button type="button" className="ghost-button" onClick={onClose}>
                      Not now
                    </button>
                  )}
                  <PrimaryButton type="button" onClick={apply} disabled={chosen.length === 0}>
                    Add {chosen.length} {chosen.length === 1 ? 'item' : 'items'} to budget
                  </PrimaryButton>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </motion.section>
  )
}

export function AmountField({
  label,
  value,
  disabled,
  onCommit,
}: {
  label: string
  value: number
  disabled?: boolean
  onCommit: (amount: number) => void
}) {
  const [draft, setDraft] = useState(formatAmountInput(String(value)))

  return (
    <label className="amount">
      <span className="sr-only">{label}</span>
      <span className="amount__currency" aria-hidden="true">
        ₦
      </span>
      <input
        value={draft}
        inputMode="numeric"
        disabled={disabled}
        onFocus={(focused) => focused.currentTarget.select()}
        onChange={(changed) => setDraft(formatAmountInput(changed.target.value))}
        // Committed on blur so a half-typed "1,2" never lands in a total.
        onBlur={() => {
          const amount = parseNaira(draft)
          if (amount !== value) onCommit(amount)
        }}
        onKeyDown={(pressed) => {
          if (pressed.key === 'Enter') {
            pressed.preventDefault()
            pressed.currentTarget.blur()
          }
        }}
      />
    </label>
  )
}

export function SparkleIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor">
      <path d="M8 1.5c.3 2.6 1.9 4.2 4.5 4.5-2.6.3-4.2 1.9-4.5 4.5-.3-2.6-1.9-4.2-4.5-4.5 2.6-.3 4.2-1.9 4.5-4.5Z" />
      <path d="M12.6 9.8c.15 1.2.85 1.9 2 2-1.15.15-1.85.85-2 2-.15-1.15-.85-1.85-2-2 1.15-.1 1.85-.8 2-2Z" />
    </svg>
  )
}
