import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { EyeIcon } from './EyeIcon'
import { getStrength } from '../lib/password'
import { collapse, spring } from '../motion/variants'
import './Field.css'

type PasswordFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  name?: string
  placeholder?: string
  error?: string
  onBlur?: () => void
  /** Off for sign-in, where a meter on an existing password is just noise. */
  showStrength?: boolean
  autoComplete?: string
  autoFocus?: boolean
}

const SEGMENTS = [1, 2, 3, 4]

export function PasswordField({
  label,
  value,
  onChange,
  name = 'password',
  placeholder = 'Enter your password',
  error,
  onBlur,
  showStrength = true,
  autoComplete = 'new-password',
  autoFocus = false,
}: PasswordFieldProps) {
  const id = useId()
  const [focused, setFocused] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

  const strength = getStrength(value)

  const borderColor = error
    ? 'var(--danger)'
    : focused
      ? 'var(--primary-base)'
      : 'var(--stroke-soft)'

  const describedBy = [
    showStrength ? `${id}-strength` : '',
    error ? `${id}-error` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
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
          type={revealed ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          // getModifierState is the only reliable read of the lock, and it is
          // only available on a key event — hence both handlers.
          onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))}
          onKeyDown={(event) => setCapsLock(event.getModifierState('CapsLock'))}
          onBlur={() => {
            setFocused(false)
            setCapsLock(false)
            onBlur?.()
          }}
        />

        <motion.button
          type="button"
          className="field__toggle"
          onClick={() => setRevealed((current) => !current)}
          aria-pressed={revealed}
          aria-label={revealed ? 'Hide password' : 'Show password'}
          animate={{ color: revealed ? 'var(--primary-base)' : 'var(--icon-soft)' }}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.88 }}
          transition={spring}
        >
          {/* The glyph flips through the horizontal axis on toggle, so the
              eye reads as opening and closing rather than swapping. */}
          <motion.span
            style={{ display: 'grid', placeItems: 'center' }}
            animate={{ rotateX: revealed ? 180 : 0 }}
            transition={spring}
          >
            <EyeIcon />
          </motion.span>
        </motion.button>
      </motion.div>

      <AnimatePresence initial={false}>
        {capsLock && (
          <motion.p
            className="field__caps"
            role="status"
            variants={collapse}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <span className="field__suggestion-text">Caps Lock is on.</span>
          </motion.p>
        )}
      </AnimatePresence>

      {showStrength && (
        <div className="strength" id={`${id}-strength`}>
          <div
            className="strength__bars"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={4}
            aria-valuenow={strength.score}
            aria-label="Password strength"
            aria-valuetext={strength.label || 'Not set'}
          >
            {SEGMENTS.map((segment) => {
              const filled = segment <= strength.score
              return (
                <span className="strength__segment" key={segment}>
                  <motion.span
                    className="strength__fill"
                    initial={false}
                    animate={{
                      scaleX: filled ? 1 : 0,
                      backgroundColor: strength.color,
                    }}
                    transition={{ ...spring, delay: filled ? segment * 0.04 : 0 }}
                  />
                </span>
              )
            })}
          </div>

          <AnimatePresence initial={false} mode="wait">
            {strength.label && (
              <motion.span
                key={strength.label}
                className="strength__label"
                style={{ color: strength.color }}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.18 }}
              >
                {strength.label}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
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
