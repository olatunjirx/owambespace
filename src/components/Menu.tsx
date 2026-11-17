import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import './Menu.css'

export type MenuItem = {
  id: string
  label: string
  icon?: ReactNode
  danger?: boolean
  /** Draws a rule above this item, to set destructive actions apart. */
  separated?: boolean
  onSelect: () => void
}

type MenuProps = {
  /** Accessible name for the trigger, e.g. "Actions for Abbas Alli". */
  label: string
  trigger: ReactNode
  items: MenuItem[]
}

/** A trigger button and a short list of actions, keyboard-operable. */
export function Menu({ label, trigger, items }: MenuProps) {
  const [open, setOpen] = useState(false)
  const [upward, setUpward] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (!listRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    listRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function toggle(): void {
    if (!open && triggerRef.current) {
      // Near the bottom of the window the list opens upward instead of off-screen.
      const below = window.innerHeight - triggerRef.current.getBoundingClientRect().bottom
      setUpward(below < items.length * 44 + 24)
    }
    setOpen((current) => !current)
  }

  function close(): void {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function onListKey(event: ReactKeyboardEvent<HTMLDivElement>): void {
    const options = [...(listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
    const index = options.indexOf(document.activeElement as HTMLElement)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      options[(index + 1) % options.length]?.focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      options[(index - 1 + options.length) % options.length]?.focus()
    } else if (event.key === 'Home') {
      event.preventDefault()
      options[0]?.focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      options[options.length - 1]?.focus()
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault()
      close()
    }
  }

  return (
    <div className="menu">
      <button
        ref={triggerRef}
        type="button"
        className={`menu__trigger${open ? ' menu__trigger--open' : ''}`}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault()
            toggle()
          }
        }}
      >
        {trigger}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={listRef}
            id={id}
            role="menu"
            aria-label={label}
            className={`menu__list${upward ? ' menu__list--up' : ''}`}
            onKeyDown={onListKey}
            initial={{ opacity: 0, scale: 0.96, y: upward ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
          >
            {items.map((item) => (
              <div key={item.id}>
                {item.separated && <div className="menu__rule" role="separator" />}
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={`menu__item${item.danger ? ' menu__item--danger' : ''}`}
                  onClick={() => {
                    close()
                    item.onSelect()
                  }}
                >
                  {item.icon && (
                    <span className="menu__icon" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
