import { motion } from 'framer-motion'

import { PrimaryButton } from '../../components/Buttons'
import { CheckIcon, ClockIcon, ShieldIcon, WalletIcon } from './OwnerIcons'
import { PLATFORM_FEE_PERCENT, initialsFor, listingProgress } from '../../lib/owner'
import { riseIn, stagger } from '../../motion/variants'
import { navigate } from '../../router/hashRouter'
import { useOwner } from '../../state/Owner'
import { useProfile } from '../../state/Profile'
import { setupPath } from './ownerPaths'
import '../host/host.css'
import './owner.css'

const STEPS = [
  {
    title: 'List your venue',
    body: 'Photos, spaces, pricing and house rules. About 10 minutes — it saves as you go.',
    time: '~10 min',
  },
  {
    title: 'Go live',
    body: 'We check every listing before hosts see it, usually within a day.',
    time: 'Within 24 hrs',
  },
  {
    title: 'Get booked, get paid',
    body: 'Hosts book your open dates instantly, and their money is held safely until the event is done.',
    time: 'Ongoing',
  },
]

const HAVE_READY = [
  'At least 3 good photos of the space',
  'How many guests each room seats',
  'Your day rate and deposit',
  'Your cancellation terms',
]

/**
 * The first screen after sign-up.
 *
 * The owner has just named their venue, so this does not ask again — it
 * shows the venue back to them as a draft that already exists, says plainly
 * what the next ten minutes involve, and makes "start" the obvious press.
 * Anyone who would rather look around first can, without losing the draft.
 */
export function WelcomeScreen() {
  const { profile } = useProfile()
  const { state, markWelcomeSeen, createVenue } = useOwner()
  const firstName = profile.displayName.trim().split(' ')[0]
  const venue = state.venues[0]
  const progress = venue ? listingProgress(venue) : null

  function start(): void {
    markWelcomeSeen()
    const target = venue ?? createVenue({})
    navigate(setupPath(target.id, progress?.nextStep ?? 'basics'))
  }

  function explore(): void {
    markWelcomeSeen()
    navigate('/owner')
  }

  return (
    <main className="welcome">
      <motion.div
        className="welcome__inner"
        variants={stagger(0.08, 0.05)}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="welcome__brand" variants={riseIn}>
          <span className="sidebar__brand-mark" aria-hidden="true" />
          <span>OwambeSpace</span>
          <span className="owner-badge">Venues</span>
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
          <h1 className="welcome__title">
            Welcome to Owambe Space{firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="welcome__lede">
            {venue?.name
              ? `Let’s get ${venue.name} in front of people planning their next owambe.`
              : 'Let’s get your venue in front of people planning their next owambe.'}
          </p>
        </motion.div>

        {venue && (
          <motion.div className="welcome__venue" variants={riseIn}>
            <span
              className="welcome__venue-tile"
              style={{
                background: `linear-gradient(145deg, hsl(${venue.hue} 72% 52%), hsl(${venue.hue + 24} 68% 32%))`,
              }}
              aria-hidden="true"
            >
              {initialsFor(venue.name)}
            </span>
            <div className="welcome__venue-text">
              <span className="welcome__venue-name">{venue.name || 'Your venue'}</span>
              <span className="welcome__venue-meta">
                {[venue.spaceType, venue.state].filter(Boolean).join(' · ') || 'Details to come'}
              </span>
            </div>
            <span className="tag">Draft · {progress?.done ?? 0} of {progress?.total ?? 7} done</span>
          </motion.div>
        )}

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
          <p className="welcome__ready-note">
            Missing something? Skip it — nothing goes live until you say so.
          </p>
        </motion.div>

        <motion.div className="welcome__actions" variants={riseIn}>
          <div className="welcome__primary">
            <PrimaryButton type="button" onClick={start}>
              {venue?.name ? `Set up ${venue.name}` : 'Add your venue'}
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
            <CheckIcon size={14} /> Progress saves automatically
          </li>
        </motion.ul>
      </motion.div>
    </main>
  )
}
