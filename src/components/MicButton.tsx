import { motion } from 'framer-motion'

import './mic-button.css'

type MicButtonProps = {
  listening: boolean
  onClick: () => void
  label?: string
}

/**
 * The dictation control — spec §10.12.
 *
 * Renders nothing when the browser has no recogniser, which is why callers
 * gate on `dictation.supported` rather than this hiding itself: a search box
 * should not reserve space for a button that will never appear.
 */
export function MicButton({ listening, onClick, label = 'Dictate' }: MicButtonProps) {
  return (
    <button
      type="button"
      className={`mic${listening ? ' mic--live' : ''}`}
      onClick={onClick}
      aria-pressed={listening}
      aria-label={listening ? 'Stop dictating' : label}
      title={listening ? 'Stop dictating' : label}
    >
      {listening && (
        <motion.span
          className="mic__pulse"
          aria-hidden="true"
          animate={{ scale: [1, 1.5], opacity: [0.45, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
        <path
          d="M8 2.5a1.8 1.8 0 0 1 1.8 1.8v3.4a1.8 1.8 0 1 1-3.6 0V4.3A1.8 1.8 0 0 1 8 2.5Z"
          fill="currentColor"
        />
        <path
          d="M4 7.4v.4a4 4 0 0 0 8 0v-.4M8 11.8v1.7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}
