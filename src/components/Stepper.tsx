import { motion } from 'framer-motion'

import { softSpring } from '../motion/variants'
import './Stepper.css'

type StepperProps = {
  /** 1-based index of the step the user is on. */
  step: number
  total: number
}

export function Stepper({ step, total }: StepperProps) {
  return (
    <div
      className="stepper"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step}
      aria-valuetext={`Step ${step} of ${total}`}
    >
      {Array.from({ length: total }, (_, index) => {
        const isActive = index + 1 === step
        return (
          <motion.span
            key={index}
            className="stepper__bar"
            animate={{
              width: isActive ? 34 : 26,
              backgroundColor: isActive
                ? 'var(--primary-base)'
                : 'var(--bg-muted)',
            }}
            transition={softSpring}
          >
            {/* A single sweep of light across the active bar on arrival —
                enough to say "you are here" and then get out of the way. */}
            {isActive && (
              <motion.span
                className="stepper__sheen"
                initial={{ x: '-120%' }}
                animate={{ x: '220%' }}
                transition={{ duration: 0.9, delay: 0.5, ease: 'easeInOut' }}
              />
            )}
          </motion.span>
        )
      })}
    </div>
  )
}
