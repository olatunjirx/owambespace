import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { collapse, spring } from '../motion/variants'
import './Field.css'

type TextFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  name: string
  placeholder?: string
  type?: 'text' | 'email' | 'tel' | 'date'
  /** Passed through for date inputs, so past dates cannot be picked. */
  min?: string
  autoComplete?: string
  /** Static text pinned to the right of the input, e.g. a mail domain. */
  suffix?: string
  error?: string
  hint?: string
  optional?: boolean
  autoFocus?: boolean
  onBlur?: () => void
}

export function TextField({
  label,
  value,
  onChange,
  name,
  placeholder,
  type = 'text',
  min,
  autoComplete,
  suffix,
  error,
  hint,
  optional = false,
  autoFocus = false,
  onBlur,
}: TextFieldProps) {
  const id = useId()
  const [focused, setFocused] = useState(false)

  const borderColor = error
    ? 'var(--danger)'
    : focused
      ? 'var(--primary-base)'
      : 'var(--stroke-soft)'

  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {optional && <span className="field__optional">Optional</span>}
      </label>

      <motion.div
        className={`field__control${suffix ? ' field__control--affix' : ''}`}
        animate={{
          borderColor,
          boxShadow: focused
            ? error
              ? 'var(--ring-error)'
              : 'var(--ring-focus)'
            : 'var(--ring-none)',
        }}
        transition={spring}
      >
        <input
          id={id}
          name={name}
          className="field__input"
          type={type}
          min={min}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            onBlur?.()
          }}
        />

        {suffix && (
          <>
            <span className="field__divider" aria-hidden="true" />
            <span className="field__suffix">{suffix}</span>
          </>
        )}
      </motion.div>

      {hint && !error && (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={`${id}-error`}
            className="field__error"
            role="alert"
            variants={collapse}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <span className="field__error-text">{error}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
