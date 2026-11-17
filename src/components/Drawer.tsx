import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import './Drawer.css'

type DrawerProps = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: ReactNode
  /** Pinned to the bottom of the panel, out of the scrolling area. */
  footer?: ReactNode
  children: ReactNode
}

/**
 * A right-hand side panel.
 *
 * Used instead of a route for work that belongs *to* the page behind it —
 * creating an event from the events list keeps the list visible, so the host
 * never loses their place and closing costs nothing.
 *
 * Escape closes, the backdrop closes, focus moves in on open and returns to
 * whatever opened it on close, and the page behind cannot scroll underneath.
 */
export function Drawer({ open, onClose, title, subtitle, footer, children }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocusTo = useRef<Element | null>(null)

  useEffect(() => {
    if (!open) return

    returnFocusTo.current = document.activeElement

    // The page behind must not scroll while the panel is over it.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      // A dialog opened from inside the panel owns the keyboard until it
      // closes — Escape there must not take the panel down with it.
      if (document.querySelector('.modal')) return

      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return

      // Keep Tab inside the panel; a focus ring wandering onto the list
      // behind an open drawer is how people lose track of where they are.
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    // Focus the first field, not the close button — scoped to the body
    // because the header's close sits earlier in document order.
    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current
      if (!panel) return

      const body = panel.querySelector('.drawer__body')
      const target =
        body?.querySelector<HTMLElement>('input, select, textarea') ??
        panel.querySelector<HTMLElement>('button')

      target?.focus()
    }, 120)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      window.clearTimeout(focusTimer)
      if (returnFocusTo.current instanceof HTMLElement) returnFocusTo.current.focus()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="drawer" role="presentation">
          <motion.div
            className="drawer__scrim"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          <motion.div
            ref={panelRef}
            className="drawer__panel"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }}
          >
            <header className="drawer__head">
              <div>
                <h2 className="drawer__title">{title}</h2>
                {subtitle && <p className="drawer__subtitle">{subtitle}</p>}
              </div>

              <button
                type="button"
                className="drawer__close"
                onClick={onClose}
                aria-label="Close"
              >
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </header>

            <div className="drawer__body">{children}</div>

            {footer && <footer className="drawer__foot">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
