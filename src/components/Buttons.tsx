import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import backIcon from '../assets/icon-back.svg'
import googleIcon from '../assets/icon-google.svg'
import { commitOpenComboboxes } from './Combobox'
import { spring } from '../motion/variants'
import './Buttons.css'

/* ── Primary action ──────────────────────────────────────── */

export type SubmitState = 'idle' | 'loading' | 'done'

type PrimaryButtonProps = {
  children: ReactNode
  state?: SubmitState
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  loadingLabel?: string
  doneLabel?: string
}

export function PrimaryButton({
  children,
  state = 'idle',
  onClick,
  type = 'submit',
  disabled = false,
  loadingLabel = 'Just a moment…',
  doneLabel = 'Done',
}: PrimaryButtonProps) {
  const busy = state !== 'idle'
  const inert = busy || disabled

  const label =
    state === 'loading' ? loadingLabel : state === 'done' ? doneLabel : children

  return (
    <motion.button
      className="button"
      type={type}
      onClick={onClick}
      // Before the click: a combobox with its list open would otherwise eat
      // this first press as a dismissal and the button would need two taps.
      onPointerDown={() => commitOpenComboboxes()}
      disabled={inert}
      aria-busy={state === 'loading'}
      initial={false}
      animate={{
        backgroundColor:
          state === 'done' ? 'var(--strength-strong)' : 'var(--primary-base)',
        opacity: disabled && !busy ? 0.45 : 1,
      }}
      whileHover={inert ? undefined : { y: -1, backgroundColor: 'var(--primary-hover)' }}
      whileTap={inert ? undefined : { scale: 0.985, y: 0 }}
      transition={spring}
    >
      {/* Each state gets its own node so the swap can cross-fade in place
          instead of the label jumping when the width changes. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={state}
          className="button__label"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {state === 'loading' && (
            <motion.span
              className="button__spinner"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          )}
          {label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}

/* ── Text button ─────────────────────────────────────────── */

type TextButtonProps = {
  children: ReactNode
  onClick?: () => void
  accent?: boolean
  withBackIcon?: boolean
}

export function TextButton({
  children,
  onClick,
  accent = false,
  withBackIcon = false,
}: TextButtonProps) {
  const rest = accent ? 'var(--primary-base)' : 'var(--text-soft)'

  return (
    <motion.button
      type="button"
      className={`text-button${accent ? ' text-button--accent' : ''}`}
      onClick={onClick}
      // Named variants rather than an inline `whileHover` object, so the
      // chevron can react to the parent's hover state as well.
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap={{ scale: 0.96 }}
      variants={{ rest: { color: rest }, hover: { color: 'var(--primary-base)' } }}
      transition={spring}
    >
      {withBackIcon && (
        <motion.img
          className="text-button__icon"
          src={backIcon}
          alt=""
          aria-hidden="true"
          variants={{ rest: { x: 0 }, hover: { x: -3 } }}
        />
      )}
      {children}
    </motion.button>
  )
}

/* ── Google button ───────────────────────────────────────── */

type GoogleButtonProps = {
  onClick?: () => void
  busy?: boolean
  label?: string
}

export function GoogleButton({
  onClick,
  busy = false,
  label = 'Continue with Google',
}: GoogleButtonProps) {
  return (
    <motion.button
      type="button"
      className="oauth-button"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      whileHover={
        busy
          ? undefined
          : {
              backgroundColor: 'var(--primary-lighter)',
              borderColor: 'rgba(105, 53, 240, 0.22)',
              y: -1,
            }
      }
      whileTap={busy ? undefined : { scale: 0.99, y: 0 }}
      transition={spring}
    >
      <img className="oauth-button__icon" src={googleIcon} alt="" aria-hidden="true" />
      {busy ? 'Connecting to Google…' : label}
    </motion.button>
  )
}

/* ── Divider ─────────────────────────────────────────────── */

export function Divider({ label = 'or' }: { label?: string }) {
  return (
    <div className="divider" role="separator" aria-label={label}>
      <motion.span
        className="divider__line"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        style={{ transformOrigin: 'right center' }}
      />
      <span className="divider__label" aria-hidden="true">
        {label}
      </span>
      <motion.span
        className="divider__line"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        style={{ transformOrigin: 'left center' }}
      />
    </div>
  )
}
