import { AnimatePresence, motion } from 'framer-motion'

import celebrateIcon from '../assets/icon-celebrate.svg'
import { TextButton } from './Buttons'
import { spring } from '../motion/variants'
import './RoleCard.css'

type RoleCardProps = {
  /** The door the user came through, echoed back on every later screen. */
  label: string
  onChange: () => void
}

/**
 * Confirms the branch without spending a whole screen on it, and gives a way
 * back to screen 1 that does not look like losing progress.
 */
export function RoleCard({ label, onChange }: RoleCardProps) {
  return (
    <div className="role-card">
      <motion.span
        className="role-card__badge"
        // A small kick on every change confirms the tap landed.
        key={label}
        initial={{ scale: 0.7, rotate: -18 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={spring}
      >
        <img src={celebrateIcon} alt="" aria-hidden="true" />
      </motion.span>

      <div className="role-card__info">
        <span className="role-card__text">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={label}
              className="role-card__value"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </span>

        <TextButton accent onClick={onChange}>
          Change
        </TextButton>
      </div>
    </div>
  )
}
