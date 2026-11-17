import { useId } from 'react'
import { motion } from 'framer-motion'

import { softSpring } from '../motion/variants'
import './SegmentedToggle.css'

export type SegmentOption<T extends string> = {
  id: T
  label: string
}

type SegmentedToggleProps<T extends string> = {
  label: string
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  name: string
}

/**
 * Solo vs company. The purple pill is a single shared element moved with a
 * layout animation, so it slides between segments instead of blinking.
 */
export function SegmentedToggle<T extends string>({
  label,
  options,
  value,
  onChange,
  name,
}: SegmentedToggleProps<T>) {
  const id = useId()

  return (
    <div className="field segmented">
      <span className="field__label" id={`${id}-label`}>
        {label}
      </span>

      <div className="segmented__track" role="radiogroup" aria-labelledby={`${id}-label`}>
        {options.map((option) => {
          const selected = option.id === value
          const optionId = `${id}-${option.id}`
          return (
            <label
              key={option.id}
              htmlFor={optionId}
              className={`segmented__option${selected ? ' is-selected' : ''}`}
            >
              <input
                id={optionId}
                type="radio"
                className="sr-only"
                name={name}
                value={option.id}
                checked={selected}
                onChange={() => onChange(option.id)}
              />
              {selected && (
                <motion.span
                  className="segmented__indicator"
                  layoutId={`${id}-indicator`}
                  transition={softSpring}
                />
              )}
              <span className="segmented__label">{option.label}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
