import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { AmountField, BudgetAssistant, SparkleIcon } from './BudgetAssistant'
import { BudgetChart, seriesColor } from './BudgetChart'
import { EventShell } from './EventShell'
import { PrimaryButton } from '../../components/Buttons'
import { BUDGET_CATEGORIES, budgetTotals } from '../../lib/events'
import type { BudgetCategory, EventRecord } from '../../lib/events'
import { formatAmountInput, formatNaira, parseNaira } from '../../lib/money'
import { riseIn, softSpring } from '../../motion/variants'
import { useEvents } from '../../state/Events'
import './budget.css'
import './host.css'

/**
 * The budget for one event: a total, and the expenses that make it up.
 *
 * One amount per expense — this page answers "where is the money going?",
 * not "what have I paid?". A first visit opens on the assistant, because a
 * blank list is the hardest place to start.
 */
export function BudgetScreen({ event }: { event: EventRecord }) {
  const { addExpense, updateExpense, removeExpense, updateEvent } = useEvents()
  const totals = budgetTotals(event)
  const empty = event.expenses.length === 0

  const [assistantOpen, setAssistantOpen] = useState(empty)
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetDraft, setBudgetDraft] = useState('')

  const [label, setLabel] = useState('')
  const [category, setCategory] = useState<BudgetCategory>('Catering')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  const ordered = useMemo(
    () =>
      [...event.expenses].sort(
        (a, b) =>
          BUDGET_CATEGORIES.indexOf(a.category) - BUDGET_CATEGORIES.indexOf(b.category) ||
          b.amount - a.amount,
      ),
    [event.expenses],
  )

  function saveBudget(): void {
    const next = parseNaira(budgetDraft)
    if (next > 0) updateEvent(event.id, { budget: next })
    setEditingBudget(false)
  }

  function handleAdd(submitted: FormEvent<HTMLFormElement>): void {
    submitted.preventDefault()
    const trimmed = label.trim()
    const value = parseNaira(amount)
    if (trimmed.length < 2) {
      setError('What is the money for?')
      return
    }
    if (!value) {
      setError('Add the amount.')
      return
    }
    addExpense(event.id, { label: trimmed, category, amount: value })
    setLabel('')
    setAmount('')
    setError('')
    document.getElementById('expense-label')?.focus()
  }

  return (
    <EventShell
      event={event}
      tab="budget"
      title="Budget"
      subtitle={
        totals.budget > 0
          ? `${formatNaira(totals.spent)} planned of ${formatNaira(totals.budget)}.`
          : 'Set a total, then list what each part of the day will cost.'
      }
      actions={
        <>
          {!empty && !assistantOpen && (
            <button type="button" className="assist-launch" onClick={() => setAssistantOpen(true)}>
              <SparkleIcon /> Budget assistant
            </button>
          )}
          {editingBudget ? (
            <div className="budget-edit">
              <input
                className="filters__input budget-edit__input"
                value={budgetDraft}
                autoFocus
                aria-label="Total budget"
                onChange={(changed) => setBudgetDraft(formatAmountInput(changed.target.value))}
                onKeyDown={(pressed) => {
                  if (pressed.key === 'Enter') saveBudget()
                  if (pressed.key === 'Escape') setEditingBudget(false)
                }}
              />
              <button type="button" className="ghost-button" onClick={saveBudget}>
                Save
              </button>
            </div>
          ) : (
            totals.budget > 0 && (
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setBudgetDraft(formatAmountInput(String(event.budget)))
                  setEditingBudget(true)
                }}
              >
                Edit budget
              </button>
            )
          )}
        </>
      }
    >
      <AnimatePresence initial={false}>
        {assistantOpen && (
          <BudgetAssistant
            key="assistant"
            event={event}
            onClose={() => setAssistantOpen(false)}
            onApplied={() => setAssistantOpen(false)}
          />
        )}
      </AnimatePresence>

      {!empty && totals.budget > 0 && <BudgetChart event={event} />}

      {totals.over > 0 && (
        <motion.p className="budget-alert" variants={riseIn} role="status">
          Your expenses come to {formatNaira(totals.over)} more than the budget. Trim a line or
          raise the budget.
        </motion.p>
      )}

      <motion.section className="card" variants={riseIn}>
        <div className="card__header">
          <div>
            <h2 className="card__title">Expenses</h2>
            <p className="card__hint">
              {empty
                ? 'Everything the day will cost, one line each.'
                : `${event.expenses.length} ${event.expenses.length === 1 ? 'item' : 'items'}. Click an amount to change it.`}
            </p>
          </div>
        </div>

        <form className="budget-add" onSubmit={handleAdd} noValidate>
          <label className="budget-add__field budget-add__field--grow">
            <span className="filters__label">What for</span>
            <input
              id="expense-label"
              className="filters__input"
              value={label}
              placeholder="Small chops"
              onChange={(changed) => {
                setLabel(changed.target.value)
                setError('')
              }}
            />
          </label>
          <label className="budget-add__field">
            <span className="filters__label">Category</span>
            <select
              className="filters__input"
              value={category}
              onChange={(changed) => setCategory(changed.target.value as BudgetCategory)}
            >
              {BUDGET_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="budget-add__field">
            <span className="filters__label">Amount (₦)</span>
            <input
              className="filters__input"
              value={amount}
              placeholder="250,000"
              inputMode="numeric"
              onChange={(changed) => {
                setAmount(formatAmountInput(changed.target.value))
                setError('')
              }}
            />
          </label>
          <div className="budget-add__submit">
            <PrimaryButton>Add</PrimaryButton>
          </div>
        </form>

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

        {empty ? (
          <p className="budget-empty">
            Nothing listed yet.{' '}
            {!assistantOpen && (
              <button type="button" onClick={() => setAssistantOpen(true)}>
                Let the assistant draft it
              </button>
            )}
          </p>
        ) : (
          <ul className="expense-list">
            <AnimatePresence initial={false}>
              {ordered.map((expense) => (
                <motion.li
                  key={expense.id}
                  className="expense"
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
                  transition={softSpring}
                >
                  <span className="breakdown__dot" style={{ background: seriesColor(expense.category) }} aria-hidden="true" />
                  <span className="expense__text">
                    <span className="expense__label">
                      {expense.label}
                      {expense.bookingId && <span className="tag tag--accent">Booked</span>}
                    </span>
                    <span className="expense__category">{expense.category}</span>
                  </span>
                  <AmountField
                    key={`${expense.id}-${expense.amount}`}
                    label={`Amount for ${expense.label}`}
                    value={expense.amount}
                    onCommit={(next) => updateExpense(event.id, expense.id, { amount: next })}
                  />
                  <button
                    type="button"
                    className="row-remove"
                    onClick={() => removeExpense(event.id, expense.id)}
                    aria-label={`Remove ${expense.label}`}
                  >
                    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </motion.section>
    </EventShell>
  )
}
