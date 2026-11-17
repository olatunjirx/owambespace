import { useEffect } from 'react'
import { motion } from 'framer-motion'

import { AuthLayout } from '../../components/AuthLayout'
import { PrimaryButton } from '../../components/Buttons'
import { HERO_HEADLINES, ROLE_LABELS } from '../../lib/signupFlow'
import type { AccountRole } from '../../lib/signupFlow'
import { useSignupDraft } from '../../state/SignupDraft'

const DASHBOARD_NAMES: Record<AccountRole, string> = {
  host: 'your event dashboard',
  venue_owner: 'your venue dashboard',
  planner: 'your planner dashboard',
  vendor: 'your vendor dashboard',
}

type VerifiedScreenProps = {
  onContinue: () => void
}

/**
 * A short beat between verifying and the dashboard, so the account creation
 * has a visible ending. It routes itself after a moment; the button is there
 * for anyone who does not want to wait.
 */
export function VerifiedScreen({ onContinue }: VerifiedScreenProps) {
  const { draft, role } = useSignupDraft()
  const door = draft.door ?? 'host'
  const destination = DASHBOARD_NAMES[role ?? 'host']

  useEffect(() => {
    const timer = window.setTimeout(onContinue, 2200)
    return () => window.clearTimeout(timer)
  }, [onContinue])

  return (
    <AuthLayout
      screenKey="verified"
      headline={HERO_HEADLINES[door]}
      title="Account verified"
      subtitle={`Taking you to ${destination}.`}
    >
      <div className="signup__fields">
        <motion.span
          className="success__check"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.1 }}
        >
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
            <motion.path
              d="M5 13.4L10.6 19L21 7.5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.45, delay: 0.25, ease: 'easeOut' }}
            />
          </svg>
        </motion.span>

        <p className="signup__subtitle">
          You&rsquo;re signed in as{' '}
          <strong className="signup__sent-to">{ROLE_LABELS[role ?? 'host']}</strong>.
        </p>

        <div className="signup__actions">
          <PrimaryButton type="button" onClick={onContinue}>
            Go to dashboard
          </PrimaryButton>
        </div>
      </div>
    </AuthLayout>
  )
}
