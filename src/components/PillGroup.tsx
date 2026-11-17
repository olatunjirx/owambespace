import { useId } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { collapse, spring } from '../motion/variants'
import './PillGroup.css'

type PillGroupProps = {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
  name: string
  error?: string
  /** Rendered above the grid, separated — used for "Event planning". */
  featured?: string
  featuredHint?: string
}

/**
 * Single-select, so these are radios under the hood rather than buttons —
 * arrow keys move between them and screen readers announce "3 of 8".
 */
export function PillGroup({
  label,
  options,
  value,
  onChange,
  name,
  error,
  featured,
  featuredHint,
}: PillGroupProps) {
  const id = useId()

  function renderPill(option: string, key: string) {
    const selected = value === option
    // The input is visually hidden, so the label needs an explicit htmlFor:
    // relying on nesting alone does not reliably activate a clipped control.
    const optionId = `${id}-${key.replace(/\W+/g, '-')}`
    return (
      <motion.label
        key={key}
        htmlFor={optionId}
        className={`pill${selected ? ' is-selected' : ''}`}
        whileTap={{ scale: 0.97 }}
        transition={spring}
      >
        <input
          id={optionId}
          type="radio"
          className="sr-only"
          name={name}
          value={option}
          checked={selected}
          onChange={() => onChange(option)}
        />
        <span className="pill__label">{option}</span>
      </motion.label>
    )
  }

  return (
    <div
      className="field pill-group"
      role="radiogroup"
      aria-labelledby={`${id}-label`}
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <span className="field__label" id={`${id}-label`}>
        {label}
      </span>

      {featured && (
        <div className="pill-group__featured">
          {renderPill(featured, 'featured')}
          {featuredHint && <p className="pill-group__hint">{featuredHint}</p>}
        </div>
      )}

      <div className="pill-group__grid">
        {options.map((option) => renderPill(option, option))}
      </div>

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
