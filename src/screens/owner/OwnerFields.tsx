import { useId } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

import { CheckIcon } from './OwnerIcons'
import { formatAmountInput } from '../../lib/money'
import { spring } from '../../motion/variants'
import '../../components/Field.css'

/*
 * Form pieces the owner screens need and sign-up did not: long text, money,
 * switches and multi-select chips. All of them sit on the same .field
 * furniture as TextField so the two sides of the product look like one.
 */

type TextAreaProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: ReactNode
  /** Shows a live count, and caps the input at this length. */
  max?: number
  /** Shows how many characters are still needed until this is met. */
  min?: number
  optional?: boolean
  rows?: number
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  hint,
  max,
  min,
  optional = false,
  rows = 4,
}: TextAreaProps) {
  const id = useId()
  const length = value.trim().length
  const short = min ? Math.max(0, min - length) : 0

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {optional && <span className="field__optional">Optional</span>}
      </label>
      <textarea
        id={id}
        className="field__control field__textarea"
        value={value}
        rows={rows}
        maxLength={max}
        placeholder={placeholder}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="field__meta">
        {hint ? (
          <p className="field__hint" id={`${id}-hint`}>
            {hint}
          </p>
        ) : (
          <span />
        )}
        {(max || min) && (
          <span className={`field__count${short > 0 ? ' field__count--short' : ''}`} aria-live="polite">
            {short > 0 ? `${short} more to go` : max ? `${value.length}/${max}` : `${length} characters`}
          </span>
        )}
      </div>
    </div>
  )
}

type MoneyFieldProps = {
  label: string
  value: number
  onChange: (value: number) => void
  placeholder?: string
  hint?: ReactNode
  suffix?: string
  compact?: boolean
}

/** Naira, grouped as you type. Stored as a whole number. */
export function MoneyField({ label, value, onChange, placeholder, hint, suffix, compact = false }: MoneyFieldProps) {
  const id = useId()
  return (
    <div className={`field${compact ? ' field--compact' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control field__control--affix field__control--focusable">
        <span className="field__prefix" aria-hidden="true">
          ₦
        </span>
        <input
          id={id}
          className="field__input"
          inputMode="numeric"
          value={value ? formatAmountInput(String(value)) : ''}
          placeholder={placeholder}
          onChange={(event) => onChange(Number(event.target.value.replace(/\D/g, '')) || 0)}
        />
        {suffix && <span className="field__suffix">{suffix}</span>}
      </div>
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  )
}

type NumberFieldProps = {
  label: string
  value: number
  onChange: (value: number) => void
  placeholder?: string
  suffix?: string
  hint?: ReactNode
  compact?: boolean
  max?: number
}

/** A whole-number input that never holds anything but digits. */
export function NumberField({ label, value, onChange, placeholder, suffix, hint, compact = false, max }: NumberFieldProps) {
  const id = useId()
  return (
    <div className={`field${compact ? ' field--compact' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control field__control--affix field__control--focusable">
        <input
          id={id}
          className="field__input"
          inputMode="numeric"
          value={value ? value.toLocaleString('en-NG') : ''}
          placeholder={placeholder}
          onChange={(event) => {
            const next = Number(event.target.value.replace(/\D/g, '')) || 0
            onChange(max ? Math.min(max, next) : next)
          }}
        />
        {suffix && <span className="field__suffix">{suffix}</span>}
      </div>
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  )
}

type SwitchProps = {
  label: string
  description?: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
}

/** An on/off setting with its consequence written underneath. */
export function Switch({ label, description, checked, onChange }: SwitchProps) {
  const id = useId()
  return (
    <div className="switch-row">
      <div className="switch-row__text">
        <label className="switch-row__label" htmlFor={id}>
          {label}
        </label>
        {description && <p className="switch-row__description">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={`oswitch${checked ? ' oswitch--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <motion.span className="oswitch__thumb" layout transition={spring} />
      </button>
    </div>
  )
}

type ChipSetProps = {
  label: string
  options: string[]
  selected: string[]
  onToggle: (option: string) => void
  hint?: ReactNode
}

/** Multi-select as checkboxes, so screen readers say "checked". */
export function ChipSet({ label, options, selected, onToggle, hint }: ChipSetProps) {
  const id = useId()
  return (
    <fieldset className="field chips">
      <legend className="field__label">{label}</legend>
      {hint && <p className="field__hint">{hint}</p>}
      <div className="chips__grid">
        {options.map((option) => {
          const on = selected.includes(option)
          const optionId = `${id}-${option.replace(/\W+/g, '-')}`
          return (
            <label key={option} htmlFor={optionId} className={`chip${on ? ' chip--on' : ''}`}>
              <input
                id={optionId}
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={() => onToggle(option)}
              />
              <span className="chip__box" aria-hidden="true">
                {on && <CheckIcon size={12} />}
              </span>
              {option}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

type ChoiceCardsProps<T extends string> = {
  label: string
  name: string
  options: { id: T; title: string; summary?: string; body?: string }[]
  value: T | ''
  onChange: (value: T) => void
}

/** A single choice where each option needs a sentence to explain itself. */
export function ChoiceCards<T extends string>({ label, name, options, value, onChange }: ChoiceCardsProps<T>) {
  const id = useId()
  return (
    <fieldset className="field">
      <legend className="field__label">{label}</legend>
      <div className="choice-cards">
        {options.map((option) => {
          const selected = option.id === value
          const optionId = `${id}-${option.id}`
          return (
            <label
              key={option.id}
              htmlFor={optionId}
              className={`choice-card${selected ? ' choice-card--on' : ''}`}
            >
              <input
                id={optionId}
                type="radio"
                name={name}
                className="sr-only"
                checked={selected}
                onChange={() => onChange(option.id)}
              />
              <span className="choice-card__radio" aria-hidden="true" />
              <span className="choice-card__text">
                <span className="choice-card__title">
                  {option.title}
                  {option.summary && <span className="choice-card__summary">{option.summary}</span>}
                </span>
                {option.body && <span className="choice-card__body">{option.body}</span>}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

type QuickPicksProps = {
  options: string[]
  onPick: (value: string) => void
  label?: string
}

/** One-tap suggestions under a free-text field. */
export function QuickPicks({ options, onPick, label = 'Suggestions' }: QuickPicksProps) {
  return (
    <div className="quick-picks" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option} type="button" className="quick-pick" onClick={() => onPick(option)}>
          {option}
        </button>
      ))}
    </div>
  )
}
