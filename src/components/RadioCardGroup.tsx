import { useId } from 'react'
import { motion } from 'framer-motion'

import { spring } from '../motion/variants'
import './RadioCardGroup.css'

export type RadioCardOption = {
  id: string
  title: string
  description: string
}

type RadioCardGroupProps = {
  legend: string
  options: RadioCardOption[]
  value: string | null
  onChange: (id: string) => void
  name: string
}

/**
 * The three entry doors. Circles, not checkboxes — the design file drew
 * squares, but only one can ever be chosen and a square says otherwise.
 */
export function RadioCardGroup({
  legend,
  options,
  value,
  onChange,
  name,
}: RadioCardGroupProps) {
  const id = useId()

  return (
    <div className="radio-cards" role="radiogroup" aria-label={legend}>
      {options.map((option) => {
        const selected = value === option.id
        return (
          <motion.label
            key={option.id}
            className={`radio-card${selected ? ' is-selected' : ''}`}
            htmlFor={`${id}-${option.id}`}
            whileTap={{ scale: 0.995 }}
            transition={spring}
          >
            <input
              id={`${id}-${option.id}`}
              className="sr-only"
              type="radio"
              name={name}
              value={option.id}
              checked={selected}
              onChange={() => onChange(option.id)}
            />

            <span className="radio-card__body">
              <span className="radio-card__title">{option.title}</span>
              <span className="radio-card__description">{option.description}</span>
            </span>

            <span className="radio-card__circle" aria-hidden="true">
              <motion.span
                className="radio-card__dot"
                initial={false}
                animate={{ scale: selected ? 1 : 0, opacity: selected ? 1 : 0 }}
                transition={spring}
              />
            </span>
          </motion.label>
        )
      })}
    </div>
  )
}
