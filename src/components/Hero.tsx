import { motion, useReducedMotion } from 'framer-motion'

import heroImage from '../assets/hero.jpg'
import { lineReveal, panelIn } from '../motion/variants'
import './Hero.css'

type HeroProps = {
  /** One entry per rendered line — each wipes up from behind its own mask. */
  headline: string[]
}

export function Hero({ headline }: HeroProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.aside
      className="hero"
      variants={panelIn('left')}
      initial="hidden"
      animate="visible"
      aria-label="Owambe Space"
    >
      {/* Slow push-in on the photo keeps the panel alive without asking for
          attention. Held still when the user prefers reduced motion. */}
      <motion.img
        className="hero__image"
        src={heroImage}
        alt="A man dancing under stage lights at a party"
        initial={reduceMotion ? false : { scale: 1.12 }}
        animate={{ scale: 1 }}
        transition={{ duration: 14, ease: 'easeOut' }}
      />

      <div className="hero__tint" aria-hidden="true" />
      <div className="hero__scrim" aria-hidden="true" />

      <div className="hero__headline">
        {headline.map((line, index) => (
          <span className="hero__line" key={line}>
            <motion.span
              className="hero__line-inner"
              custom={index}
              variants={lineReveal}
              initial="hidden"
              animate="visible"
            >
              {line}
            </motion.span>
          </span>
        ))}
      </div>
    </motion.aside>
  )
}
