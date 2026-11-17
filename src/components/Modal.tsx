import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import './Modal.css'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: ReactNode
  footer?: ReactNode
  /** Danger dialogs are narrower: one question, two answers. */
  size?: 'default' | 'small'
  children?: ReactNode
}

/**
 * A centred dialog for one short decision or one record. Behaves like the
 * Drawer: Escape and the backdrop close it, Tab stays inside, focus returns
 * to whatever opened it.
 */
export function Modal({ open, onClose, title, subtitle, footer, size = 'default', children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocusTo = useRef<Element | null>(null)
  // Read through a ref so a parent re-rendering mid-dialog (typing into a
  // field) does not re-run the effect and steal focus back to the first input.
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return

    returnFocusTo.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return

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

    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current
      if (!panel) return
      const target =
        panel.querySelector<HTMLElement>('.modal__body input:not([type="radio"]), .modal__body textarea') ??
        panel.querySelector<HTMLElement>('.modal__body input:checked') ??
        panel.querySelector<HTMLElement>('.modal__foot button')
      target?.focus()
    }, 80)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      window.clearTimeout(focusTimer)
      if (returnFocusTo.current instanceof HTMLElement) returnFocusTo.current.focus()
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div className="modal" role="presentation">
          <motion.div
            className="modal__scrim"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />

          <motion.div
            ref={panelRef}
            className={`modal__panel${size === 'small' ? ' modal__panel--small' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <header className="modal__head">
              <div>
                <h2 className="modal__title">{title}</h2>
                {subtitle && <p className="modal__subtitle">{subtitle}</p>}
              </div>
              <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            {children && <div className="modal__body">{children}</div>}
            {footer && <footer className="modal__foot">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
