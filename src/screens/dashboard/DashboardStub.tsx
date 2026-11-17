import { motion } from 'framer-motion'

import dashboardLogo from '../../assets/logo.svg'
import { PrimaryButton } from '../../components/Buttons'
import { ROLE_LABELS } from '../../lib/signupFlow'
import type { AccountRole } from '../../lib/signupFlow'
import { riseIn, stagger } from '../../motion/variants'
import './DashboardStub.css'

/**
 * Placeholder landing pages — enough to prove each flow routes to the right
 * dashboard, and to carry the "complete your profile" task that sign-up
 * deliberately defers (the full service list, KYC, payouts).
 */
const NEXT_TASKS: Record<AccountRole, string[]> = {
  host: [
    'Tell us about your first event',
    'Browse venues near you',
    'Invite your co-planner',
  ],
  venue_owner: [
    'Add photos and capacity for your spaces',
    'Set your pricing and cancellation policy',
    'Complete KYC to receive payouts',
  ],
  planner: [
    'Add the services you offer',
    'Upload a portfolio of past events',
    'Complete KYC to receive payouts',
  ],
  vendor: [
    'Add every service you offer',
    'Upload your portfolio',
    'Complete KYC to receive payouts',
  ],
}

type DashboardStubProps = {
  role: AccountRole
  name: string
  onStartOver: () => void
}

export function DashboardStub({ role, name, onStartOver }: DashboardStubProps) {
  const firstName = name.trim().split(' ')[0] || 'there'

  return (
    <main className="dashboard">
      <motion.div
        className="dashboard__inner"
        variants={stagger(0.07, 0.1)}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="brand" variants={riseIn}>
          <img className="brand__mark" src={dashboardLogo} alt="" aria-hidden="true" />
          <span className="brand__name">Owambe Space</span>
        </motion.div>

        <motion.div variants={riseIn}>
          <span className="dashboard__role">{ROLE_LABELS[role]}</span>
          <h1 className="dashboard__title">Welcome, {firstName}.</h1>
          <p className="dashboard__subtitle">
            Your account is live. This is where your dashboard will be.
          </p>
        </motion.div>

        <motion.section className="dashboard__card" variants={riseIn}>
          <h2 className="dashboard__card-title">Complete your profile</h2>
          <ul className="dashboard__tasks">
            {NEXT_TASKS[role].map((task) => (
              <li className="dashboard__task" key={task}>
                <span className="dashboard__task-dot" aria-hidden="true" />
                {task}
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.div className="dashboard__actions" variants={riseIn}>
          <PrimaryButton type="button" onClick={onStartOver}>
            Start another sign-up
          </PrimaryButton>
        </motion.div>
      </motion.div>
    </main>
  )
}
