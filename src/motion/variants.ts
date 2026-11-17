import type { Transition, Variants } from 'framer-motion'

/**
 * Shared motion language for the signup screen.
 *
 * Two curves do most of the work:
 *  - `easeOut` for entrances — fast start, long settle, so content feels like
 *    it is arriving rather than being pushed.
 *  - `spring` for anything the user drives directly (steps, toggles, presses).
 */
export const easeOut: Transition = {
  duration: 0.55,
  ease: [0.16, 1, 0.3, 1],
}

export const spring: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.9,
}

export const softSpring: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 30,
}

/** Parent of a column that reveals its children one after another. */
export const stagger = (staggerChildren = 0.06, delayChildren = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren, delayChildren },
  },
})

/** The default child entrance: rise a little, fade in. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: easeOut },
}

/**
 * Headline lines wipe up from behind a mask. The delay rides on `custom`
 * rather than a `transition` prop — a transition defined inside a variant
 * wins over the component's, which would drop the stagger.
 */
export const lineReveal: Variants = {
  hidden: { y: '110%' },
  visible: (index: number) => ({
    y: '0%',
    transition: {
      duration: 0.85,
      ease: [0.16, 1, 0.3, 1],
      delay: 0.35 + index * 0.09,
    },
  }),
}

/** Panels slide in from their own edge of the screen. */
export const panelIn = (from: 'left' | 'right'): Variants => ({
  hidden: { opacity: 0, x: from === 'left' ? -24 : 24, scale: 0.99 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
})

/** Collapsing helper for validation messages. */
export const collapse: Variants = {
  hidden: { opacity: 0, height: 0, y: -4 },
  visible: { opacity: 1, height: 'auto', y: 0 },
  exit: { opacity: 0, height: 0, y: -4 },
}
