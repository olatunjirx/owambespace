import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { parseIdentifier, suggestEmailFix } from '../lib/identifier'
import { collapse, spring } from '../motion/variants'
import './Field.css'

type IdentifierFieldProps = {
  label?: string
  value: string
  onChange: (value: string) => void
  name?: string
  placeholder?: string
  error?: string
  autoFocus?: boolean
  onBlur?: () => void
}

/**
 * One field for either an email address or a phone number.
 *
 * Nigeria is phone-first — plenty of users have no email they check — so
 * forcing an email here would cost real signups. The kind is inferred from
 * what gets typed rather than from a toggle the user has to find.
 */
export function IdentifierField({
  label = 'Email or phone',
  value,
  onChange,
  name = 'identifier',
  placeholder = 'you@example.com or 0803 123 4567',
  error,
  autoFocus = false,
  onBlur,
}: IdentifierFieldProps) {
  const id = useId()
  const [focused, setFocused] = useState(false)
  const [dismissedSuggestion, setDismissedSuggestion] = useState('')

  const parsed = parseIdentifier(value)
  const suggestion = value.includes('@') ? suggestEmailFix(value) : null
  const showSuggestion =
    Boolean(suggestion) && suggestion !== dismissedSuggestion && !focused && !error

  const borderColor = error
    ? 'var(--danger)'
    : focused
      ? 'var(--primary-base)'
      : 'var(--stroke-soft)'

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {parsed.kind === 'phone' && (
          <span className="field__badge">Phone</span>
        )}
        {parsed.kind === 'email' && (
          <span className="field__badge">Email</span>
        )}
      </label>

      <motion.div
        className="field__control"
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
          type="text"
          inputMode="email"
          autoComplete="username"
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            onBlur?.()
          }}
        />
      </motion.div>

      <AnimatePresence initial={false}>
        {showSuggestion && suggestion && (
          <motion.p
            className="field__suggestion"
            variants={collapse}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <span className="field__suggestion-text">
              Did you mean{' '}
              <button
                type="button"
                className="field__suggestion-button"
                onClick={() => onChange(suggestion)}
              >
                {suggestion}
              </button>
              ?{' '}
              <button
                type="button"
                className="field__suggestion-dismiss"
                onClick={() => setDismissedSuggestion(suggestion)}
              >
                No, it&rsquo;s right
              </button>
            </span>
          </motion.p>
        )}
      </AnimatePresence>

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
