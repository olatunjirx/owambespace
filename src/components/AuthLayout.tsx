import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

import logo from '../assets/logo.svg'
import { Hero } from './Hero'
import { TextButton } from './Buttons'
import { Stepper } from './Stepper'
import { panelIn, riseIn, stagger } from '../motion/variants'
import './SignupPanel.css'

type AuthLayoutProps = {
  headline: string[]
  eyebrow?: string
  title: string
  subtitle?: ReactNode
  children: ReactNode
  /** Rendered under the form — legal text, sign-in link, resend timer. */
  footer?: ReactNode
  onBack?: () => void
  step?: number
  total?: number
  /** Remounts the panel body so each screen animates in on its own. */
  screenKey: string
}

/**
 * The shell every auth screen sits in: hero on the left, a 392px panel on the
 * right holding brand, back, stepper, heading and whatever the screen needs.
 */
export function AuthLayout({
  headline,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  onBack,
  step,
  total,
  screenKey,
}: AuthLayoutProps) {
  const showStepper = typeof step === 'number' && typeof total === 'number'

  return (
    <main className="page">
      <Hero headline={headline} />

      <motion.section
        className="panel"
        variants={panelIn('right')}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="panel__inner"
          variants={stagger(0.07, 0.2)}
          initial="hidden"
          animate="visible"
        >
          <motion.a className="brand" href="#/signup" variants={riseIn}>
            <img className="brand__mark" src={logo} alt="" aria-hidden="true" />
            <span className="brand__name">Owambe Space</span>
          </motion.a>

          <motion.div
            key={screenKey}
            className="signup"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="signup__body">
              {/* Kept mounted but empty on screen 1, so the heading below it
                  does not jump when Back appears on screen 2. */}
              <div className="signup__back" hidden={!onBack}>
                {onBack && (
                  <TextButton withBackIcon onClick={onBack}>
                    Back
                  </TextButton>
                )}
              </div>

              {showStepper && <Stepper step={step} total={total} />}

              <div className="signup__form">
                <div className="signup__content">
                  <header className="signup__header">
                    {eyebrow && <p className="signup__eyebrow">{eyebrow}</p>}
                    <div>
                      <h1 className="signup__title">{title}</h1>
                      {subtitle && <p className="signup__subtitle">{subtitle}</p>}
                    </div>
                  </header>

                  {children}
                </div>
              </div>
            </div>

            {footer && <div className="signup__footer">{footer}</div>}
          </motion.div>
        </motion.div>
      </motion.section>
    </main>
  )
}
