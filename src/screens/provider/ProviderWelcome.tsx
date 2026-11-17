import { motion } from 'framer-motion'

import { PrimaryButton } from '../../components/Buttons'
import { CheckIcon, ClockIcon, ShieldIcon, WalletIcon } from '../owner/OwnerIcons'
import { PLATFORM_FEE_PERCENT, initialsFor } from '../../lib/owner'
import { categoryLabel, listingProgress } from '../../lib/provider'
import { riseIn, stagger } from '../../motion/variants'
import { navigate } from '../../router/hashRouter'
import { useProvider } from '../../state/Provider'
import { useProfile } from '../../state/Profile'
import { servicesPath } from './providerPaths'
import '../host/host.css'
import '../owner/owner.css'
import './provider.css'

const STEPS = [
  {
    title: 'Build your profile',
    body: 'Who you are, where you work, and the packages hosts can book. It saves as you go.',
    time: '~10 min',
  },
  {
    title: 'Go live',
    body: 'We check every profile before hosts see it, usually within a day.',
    time: 'Within 24 hrs',
  },
  {
    title: 'Get booked, get paid',
    body: 'Hosts book a package on an open date and pay a deposit straight away. Their money is held safely until the job is done.',
    time: 'Ongoing',
  },
]

const HAVE_READY = [
  'Two or three packages with fixed prices',
  'What each package includes',
  'The deposit you want up front',
  'Dates you already can’t do',
]

/**
 * The first screen after a provider signs up. Same shape as the venue
 * owner's welcome: show back what they already told us, say what the next
 * ten minutes involve, and make "start" the obvious press.
 */
export function ProviderWelcome() {
  const { profile } = useProfile()
  const { listing, markWelcomeSeen } = useProvider()
  const firstName = profile.displayName.trim().split(' ')[0]
  const progress = listingProgress(listing)

  function start(): void {
    markWelcomeSeen()
    navigate(servicesPath(progress.next))
  }

  function explore(): void {
    markWelcomeSeen()
    navigate('/provider')
  }

  return (
    <main className="welcome provider-app">
      <motion.div className="welcome__inner" variants={stagger(0.08, 0.05)} initial="hidden" animate="visible">
        <motion.div className="welcome__brand" variants={riseIn}>
          <span className="sidebar__brand-mark" aria-hidden="true" />
          <span>OwambeSpace</span>
          <span className="owner-badge">Vendor</span>
        </motion.div>

        <motion.div className="welcome__hero" variants={riseIn}>
          <motion.span
            className="welcome__check"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.15 }}
            aria-hidden="true"
          >
            <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
              <motion.path
                d="M5 13.4L10.6 19L21 7.5"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.45, delay: 0.3, ease: 'easeOut' }}
              />
            </svg>
          </motion.span>
          <p className="welcome__eyebrow">Your account is ready</p>
          <h1 className="welcome__title">Welcome to Owambe Space{firstName ? `, ${firstName}` : ''}.</h1>
          <p className="welcome__lede">
            {listing.name
              ? `Let’s get ${listing.name} booked by people planning their next owambe.`
              : 'Let’s get your services booked by people planning their next owambe.'}
          </p>
        </motion.div>

        <motion.div className="welcome__venue" variants={riseIn}>
          <span
            className="welcome__venue-tile"
            style={{
              background: `linear-gradient(145deg, hsl(${listing.hue} 72% 52%), hsl(${listing.hue + 24} 68% 32%))`,
            }}
            aria-hidden="true"
          >
            {initialsFor(listing.name || profile.displayName)}
          </span>
          <div className="welcome__venue-text">
            <span className="welcome__venue-name">{listing.name || 'Your business'}</span>
            <span className="welcome__venue-meta">
              {[listing.category ? categoryLabel(listing.category) : '', listing.state].filter(Boolean).join(' · ') ||
                'Details to come'}
            </span>
          </div>
          <span className="tag">
            Draft · {progress.done} of {progress.total} done
          </span>
        </motion.div>

        <motion.ol className="welcome__steps" variants={riseIn} aria-label="How it works">
          {STEPS.map((step, index) => (
            <li key={step.title} className={`welcome__step${index === 0 ? ' welcome__step--now' : ''}`}>
              <span className="welcome__step-index">{index + 1}</span>
              <div>
                <span className="welcome__step-title">{step.title}</span>
                <p className="welcome__step-body">{step.body}</p>
                <span className="welcome__step-time">
                  <ClockIcon size={12} /> {step.time}
                </span>
              </div>
            </li>
          ))}
        </motion.ol>

        <motion.div className="welcome__ready" variants={riseIn}>
          <p className="welcome__ready-title">Good to have to hand</p>
          <ul>
            {HAVE_READY.map((item) => (
              <li key={item}>
                <CheckIcon size={14} />
                {item}
              </li>
            ))}
          </ul>
          <p className="welcome__ready-note">Missing something? Skip it — nothing goes live until you say so.</p>
        </motion.div>

        <motion.div className="welcome__actions" variants={riseIn}>
          <div className="welcome__primary">
            <PrimaryButton type="button" onClick={start}>
              Set up your profile
            </PrimaryButton>
          </div>
          <button type="button" className="button-neutral" onClick={explore}>
            Look around first
          </button>
        </motion.div>

        <motion.ul className="welcome__promises" variants={riseIn}>
          <li>
            <WalletIcon size={14} /> Free to list — {PLATFORM_FEE_PERCENT}% only when you’re booked
          </li>
          <li>
            <ShieldIcon size={14} /> Deposits held in escrow, never chased
          </li>
          <li>
            <CheckIcon size={14} /> Chat opens once the host has paid
          </li>
        </motion.ul>
      </motion.div>
    </main>
  )
}
