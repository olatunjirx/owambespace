import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { filterStates, findState } from '../lib/nigeriaStates'
import { collapse, spring } from '../motion/variants'
import './Combobox.css'
import './Field.css'

/**
 * Any combobox that currently has its list open registers a commit function
 * here. The primary button calls `commitOpenComboboxes` on pointerdown —
 * before the click lands — because otherwise the first tap only closes the
 * list (blur) and the button appears to need pressing twice.
 */
const openComboboxes = new Set<() => void>()

export function commitOpenComboboxes(): void {
  for (const commit of Array.from(openComboboxes)) commit()
}

type ComboboxProps = {
  label: string
  /** The committed state name, or '' when nothing is chosen yet. */
  value: string
  onChange: (value: string) => void
  name: string
  placeholder?: string
  hint?: string
  error?: string
}

export function Combobox({
  label,
  value,
  onChange,
  name,
  placeholder = 'Search your state',
  hint,
  error,
}: ComboboxProps) {
  const id = useId()
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const options = useMemo(() => filterStates(open ? query : ''), [query, open])

  // A value chosen elsewhere (or restored on Back) must show up in the box.
  useEffect(() => {
    setQuery(value)
  }, [value])

  /**
   * Resolve whatever is in the box. An exact match that was typed but never
   * clicked still counts — insisting on a click is the classic way to lose a
   * keyboard user's answer.
   */
  function commit(): void {
    const typed = findState(query)
    // Only fall back to the highlighted row when the user has actually typed
    // something. Committing options[0] on an empty box would silently pick
    // whatever sorts first — a state they never chose.
    const highlighted =
      open && query.trim() && options[activeIndex] ? options[activeIndex] : null
    const resolved = typed ?? highlighted

    if (resolved) {
      onChange(resolved.name)
      setQuery(resolved.name)
    } else if (!query.trim()) {
      onChange('')
    }
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return undefined
    openComboboxes.add(commit)
    return () => {
      openComboboxes.delete(commit)
    }
  })

  function select(stateName: string): void {
    onChange(stateName)
    setQuery(stateName)
    setOpen(false)
    inputRef.current?.focus()
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        setActiveIndex(0)
        return
      }
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((current) => {
        const next = current + step
        if (next < 0) return options.length - 1
        if (next >= options.length) return 0
        return next
      })
      return
    }

    if (event.key === 'Enter') {
      if (open && options[activeIndex]) {
        event.preventDefault()
        select(options[activeIndex].name)
      }
      return
    }

    if (event.key === 'Escape') {
      setOpen(false)
      return
    }

    if (event.key === 'Tab') commit()
  }

  // Keep the highlighted row inside the scroll box as arrows move through it.
  useEffect(() => {
    if (!open || !listRef.current) return
    const row = listRef.current.children[activeIndex] as HTMLElement | undefined
    row?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  const borderColor = error
    ? 'var(--danger)'
    : focused
      ? 'var(--primary-base)'
      : 'var(--stroke-soft)'

  const listId = `${id}-list`

  return (
    <div className="field combobox">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>

      <div className="combobox__anchor">
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
            ref={inputRef}
            name={name}
            className="field__input"
            type="text"
            role="combobox"
            autoComplete="off"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && options[activeIndex] ? `${id}-opt-${activeIndex}` : undefined}
            aria-invalid={Boolean(error)}
            aria-describedby={[hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined}
            placeholder={placeholder}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
              setOpen(true)
              // Typing past a committed choice invalidates it until re-resolved.
              if (value) onChange('')
            }}
            onFocus={() => {
              setFocused(true)
              setOpen(true)
            }}
            onBlur={() => {
              setFocused(false)
              commit()
            }}
            onKeyDown={onKeyDown}
          />

          <motion.span
            className="combobox__chevron"
            aria-hidden="true"
            animate={{ rotate: open ? 180 : 0 }}
            transition={spring}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.span>
        </motion.div>

        {/* `hidden` rather than unmounting, so the listbox keeps its identity
            for assistive tech across opens. The global [hidden] rule is what
            stops the CSS display from winning here. */}
        <ul
          id={listId}
          ref={listRef}
          className="combobox__list"
          role="listbox"
          aria-label={label}
          hidden={!open || options.length === 0}
        >
          {options.map((option, index) => (
            <li
              key={option.name}
              id={`${id}-opt-${index}`}
              role="option"
              aria-selected={option.name === value}
              className={`combobox__option${index === activeIndex ? ' is-active' : ''}`}
              // pointerdown, not click: blur would close the list first.
              onPointerDown={(event) => {
                event.preventDefault()
                select(option.name)
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="combobox__option-name">{option.name}</span>
              {option.live ? (
                <span className="combobox__tag combobox__tag--live">Live</span>
              ) : (
                <span className="combobox__tag">Coming soon</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {hint && !error && (
        <p className="field__hint" id={`${id}-hint`}>
          <span className="field__hint-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
              <path d="M7 6.2V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="7" cy="4.2" r="0.8" fill="currentColor" />
            </svg>
          </span>
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
