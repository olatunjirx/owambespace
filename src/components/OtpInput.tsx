import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { collapse, spring } from '../motion/variants'
import './OtpInput.css'

const OTP_LENGTH = 6

type OtpInputProps = {
  value: string
  onChange: (value: string) => void
  /** Fired once the sixth digit lands, by typing or by paste. */
  onComplete: (code: string) => void
  error?: string
  disabled?: boolean
  label?: string
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  error,
  disabled = false,
  label = 'Verification code',
}: OtpInputProps) {
  const id = useId()
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  // Guards against firing twice when the last digit is typed then re-rendered.
  const completed = useRef(false)

  const digits = value.padEnd(OTP_LENGTH, ' ').slice(0, OTP_LENGTH).split('')

  useEffect(() => {
    if (value.length < OTP_LENGTH) completed.current = false
  }, [value])

  function commit(next: string, caret: number): void {
    const clean = next.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH)
    onChange(clean)

    const target = Math.min(caret, OTP_LENGTH - 1)
    inputs.current[target]?.focus()

    if (clean.length === OTP_LENGTH && !completed.current) {
      completed.current = true
      inputs.current[OTP_LENGTH - 1]?.blur()
      onComplete(clean)
    }
  }

  function onDigitChange(index: number, raw: string): void {
    const typed = raw.replace(/[^0-9]/g, '')
    if (!typed) return

    // Typing over a filled box replaces that digit and moves on.
    if (typed.length === 1) {
      const chars = value.padEnd(OTP_LENGTH, ' ').split('')
      chars[index] = typed
      commit(chars.join('').replace(/ /g, ''), index + 1)
      return
    }

    // Some keyboards deliver a multi-character burst; treat it like a paste.
    const merged = value.slice(0, index) + typed
    commit(merged, index + typed.length)
  }

  function onKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const chars = value.split('')
      if (chars[index]) {
        chars[index] = ''
        commit(chars.join(''), index)
      } else if (index > 0) {
        chars[index - 1] = ''
        commit(chars.join(''), index - 1)
      }
      return
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      inputs.current[index - 1]?.focus()
      return
    }

    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault()
      inputs.current[index + 1]?.focus()
    }
  }

  function onPaste(event: React.ClipboardEvent<HTMLInputElement>): void {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/[^0-9]/g, '')
    if (!pasted) return
    commit(pasted.slice(0, OTP_LENGTH), pasted.length)
  }

  return (
    <div className="otp">
      <span className="sr-only" id={`${id}-label`}>
        {label}
      </span>

      <div
        className="otp__boxes"
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {digits.map((digit, index) => {
          const filled = digit.trim().length > 0
          return (
            <motion.input
              key={index}
              ref={(node) => {
                inputs.current[index] = node
              }}
              className="otp__box"
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={OTP_LENGTH}
              disabled={disabled}
              aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
              aria-invalid={Boolean(error)}
              value={digit.trim()}
              onChange={(event) => onDigitChange(index, event.target.value)}
              onKeyDown={(event) => onKeyDown(index, event)}
              onPaste={onPaste}
              onFocus={(event) => {
                setFocusedIndex(index)
                event.target.select()
              }}
              onBlur={() => setFocusedIndex(null)}
              animate={{
                borderColor: error
                  ? 'var(--danger)'
                  : focusedIndex === index
                    ? 'var(--primary-base)'
                    : filled
                      ? 'rgba(105, 53, 240, 0.35)'
                      : 'var(--stroke-soft)',
                boxShadow:
                  focusedIndex === index
                    ? error
                      ? 'var(--ring-error)'
                      : 'var(--ring-focus)'
                    : 'var(--ring-none)',
              }}
              transition={spring}
            />
          )
        })}
      </div>

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={`${id}-error`}
            className="field__error otp__error"
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

/* Resend countdown */

type ResendTimerProps = {
  seconds?: number
  onResend: () => void
  /** Bumping this restarts the countdown after a successful resend. */
  resetKey: number
}

export function ResendTimer({ seconds = 45, onResend, resetKey }: ResendTimerProps) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    setRemaining(seconds)
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resetKey, seconds])

  if (remaining > 0) {
    return (
      <p className="otp__resend">
        Didn&rsquo;t get it?{' '}
        <span className="otp__countdown" aria-live="polite">
          Send a new code in {remaining}s
        </span>
      </p>
    )
  }

  return (
    <p className="otp__resend">
      Didn&rsquo;t get it?{' '}
      <button type="button" className="otp__resend-button" onClick={onResend}>
        Send a new code
      </button>
    </p>
  )
}
