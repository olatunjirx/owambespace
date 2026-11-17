import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { PrimaryButton } from '../../components/Buttons'
import { ListingPreview } from './ListingPreview'
import { CheckIcon } from './OwnerIcons'
import { PhotosStep } from './PhotosStep'
import { ReviewStep } from './ReviewStep'
import {
  AmenitiesStep,
  BasicsStep,
  EventDayStep,
  LocationStep,
  PoliciesStep,
  PricingStep,
  SpacesStep,
} from './SetupSteps'
import { setupPath, venuePath } from './ownerPaths'
import { SETUP_STEPS, isReadyToPublish, listingProgress, stepGaps } from '../../lib/owner'
import type { OwnerVenue, SetupStep } from '../../lib/owner'
import { softSpring } from '../../motion/variants'
import { navigate } from '../../router/hashRouter'
import { useOwner } from '../../state/Owner'
import type { VenuePatch } from '../../state/Owner'
import '../host/host.css'
import '../host/events-list.css'
import './owner.css'
import './setup.css'

const COPY: Record<SetupStep, { title: string; intro: string; tip: string }> = {
  basics: {
    title: 'Tell hosts what your venue is',
    intro: 'The name, the kind of space, and the line that makes someone click.',
    tip: 'Taglines that say who the venue is for — “Garden terrace for intimate engagements” — get more clicks than ones that describe the building.',
  },
  location: {
    title: 'Where is it?',
    intro: 'Hosts search by state and area first. Your exact address is only shared once a booking is confirmed.',
    tip: 'Add a landmark. Guests navigate by “opposite Mega Plaza” far more than by street numbers.',
  },
  spaces: {
    title: 'Spaces and capacity',
    intro: 'Capacity is the first filter every host uses. Add each bookable space and how many it seats.',
    tip: 'Banquet — round tables with dinner served — is the number hosts compare between venues.',
  },
  amenities: {
    title: 'What comes with the hire?',
    intro: 'Tick everything included in your day rate. Hosts filter on these.',
    tip: 'Backup power is the most-filtered amenity on Owambe Space. If you have a generator, say so.',
  },
  photos: {
    title: 'Show it off',
    intro: 'Bright, wide photos sell the date. The first one is your cover — it is what hosts see in search.',
    tip: 'Shoot in daylight from the corners of the room, ideally dressed for an event. Eight or more photos get the most bookings.',
  },
  pricing: {
    title: 'Set your price',
    intro: 'Your day rate, what a host pays to hold the date, and anything extra you sell.',
    tip: 'Weekend dates go first. A weekend premium of 15–25% is typical for halls in Lagos and Abuja.',
  },
  policies: {
    title: 'Policies and house rules',
    intro: 'Clear rules up front mean fewer awkward conversations on the day.',
    tip: 'Moderate cancellation is what most venues choose — it protects you without putting hosts off.',
  },
  eventday: {
    title: 'Event day',
    intro: 'Hosts see this as soon as they book, so you aren’t answering the same questions for every event.',
    tip: 'Be specific about times and gates. Good answers here mean fewer messages later.',
  },
  review: {
    title: 'Review and publish',
    intro: 'Check everything once more. Nothing goes live until you submit.',
    tip: '',
  },
}

type SetupScreenProps = {
  venue: OwnerVenue
  step: SetupStep
}

/**
 * Listing a venue, one step per screen.
 *
 * Steps are free to visit in any order — owners rarely have the photos and
 * the prices to hand at the same moment — and every keystroke is saved, so
 * leaving costs nothing. Continue checks the step and says what is missing;
 * the owner can still skip ahead, and the review step gathers whatever was
 * skipped into one list before anything is submitted.
 */
export function SetupScreen({ venue, step }: SetupScreenProps) {
  const { updateVenue, submitVenue, storageFull } = useOwner()
  const [attempted, setAttempted] = useState(false)
  const [saved, setSaved] = useState(false)
  const firstRender = useRef(true)
  const gapsRef = useRef<HTMLDivElement>(null)

  const index = SETUP_STEPS.findIndex((entry) => entry.id === step)
  const gaps = stepGaps(venue, step)
  const progress = listingProgress(venue)
  const previous = SETUP_STEPS[index - 1]
  const next = SETUP_STEPS[index + 1]
  const isLive = venue.status === 'live' || venue.status === 'paused'

  // A new step starts with a clean slate — no complaints before Continue.
  useEffect(() => setAttempted(false), [step])

  // "Saved" flashes after each change, so autosave is visible, not assumed.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setSaved(true)
    const timer = window.setTimeout(() => setSaved(false), 1600)
    return () => window.clearTimeout(timer)
  }, [venue])

  function update(patch: VenuePatch): void {
    updateVenue(venue.id, patch)
  }

  function goTo(target: SetupStep): void {
    navigate(setupPath(venue.id, target))
  }

  function onContinue(): void {
    if (gaps.length > 0 && !attempted) {
      setAttempted(true)
      // The list renders below the form; bring it to the owner rather than
      // leaving a button that seemingly did nothing.
      window.setTimeout(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        gapsRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
      }, 60)
      return
    }
    if (next) goTo(next.id)
  }

  function exit(): void {
    navigate(isLive || venue.status === 'review' ? venuePath(venue.id) : '/owner')
  }

  const copy = COPY[step]
  const ready = isReadyToPublish(venue)

  return (
    <div className="setup">
      <header className="setup__bar">
        <a className="setup__brand" href="#/owner" aria-label="Owambe Space home">
          <span className="sidebar__brand-mark" aria-hidden="true" />
          <span className="setup__brand-name">OwambeSpace</span>
        </a>

        <p className="setup__heading">
          {isLive ? 'Editing' : 'Listing'} <strong>{venue.name || 'your venue'}</strong>
        </p>

        <div className="setup__bar-end">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={storageFull ? 'full' : saved ? 'saved' : 'idle'}
              className={`setup__saved${storageFull ? ' setup__saved--warn' : ''}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              aria-live="polite"
            >
              {storageFull ? 'Not saved — device storage full' : saved ? 'Saved' : 'All changes saved'}
            </motion.span>
          </AnimatePresence>
          <button type="button" className="ghost-button ghost-button--small" onClick={exit}>
            Save &amp; exit
          </button>
        </div>
      </header>

      <div className="setup__progress" aria-hidden="true">
        <motion.span
          className="setup__progress-fill"
          initial={false}
          animate={{ width: `${((index + 1) / SETUP_STEPS.length) * 100}%` }}
          transition={softSpring}
        />
      </div>

      <div className="setup__layout">
        <nav className="setup__steps" aria-label="Listing steps">
          <p className="setup__steps-count">
            {progress.done} of {progress.total} sections complete
          </p>
          <ol>
            {SETUP_STEPS.map((entry, position) => {
              const current = entry.id === step
              const done = entry.id === 'review' ? venue.status !== 'draft' : stepGaps(venue, entry.id).length === 0
              return (
                <li key={entry.id}>
                  <a
                    className={`setup__step${current ? ' setup__step--current' : ''}${done ? ' setup__step--done' : ''}`}
                    href={`#${setupPath(venue.id, entry.id)}`}
                    aria-current={current ? 'step' : undefined}
                  >
                    <span className="setup__step-mark" aria-hidden="true">
                      {done && !current ? <CheckIcon size={12} /> : position + 1}
                    </span>
                    <span className="setup__step-text">
                      <span className="setup__step-label">{entry.label}</span>
                      <span className="setup__step-hint">{entry.hint}</span>
                    </span>
                  </a>
                </li>
              )
            })}
          </ol>
        </nav>

        <main className="setup__main">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="setup__eyebrow">
              Step {index + 1} of {SETUP_STEPS.length}
            </p>
            <h1 className="setup__title">{copy.title}</h1>
            <p className="setup__intro">
              {step === 'review' && venue.status !== 'draft'
                ? 'Everything hosts see, section by section. Edits to a live listing show straight away.'
                : copy.intro}
            </p>

            {step === 'basics' && <BasicsStep venue={venue} update={update} />}
            {step === 'location' && <LocationStep venue={venue} update={update} />}
            {step === 'spaces' && <SpacesStep venue={venue} update={update} />}
            {step === 'amenities' && <AmenitiesStep venue={venue} update={update} />}
            {step === 'photos' && <PhotosStep venue={venue} update={update} />}
            {step === 'pricing' && <PricingStep venue={venue} update={update} />}
            {step === 'policies' && <PoliciesStep venue={venue} update={update} />}
            {step === 'eventday' && <EventDayStep venue={venue} update={update} />}
            {step === 'review' && <ReviewStep venue={venue} />}
          </motion.div>

          <AnimatePresence>
            {attempted && gaps.length > 0 && step !== 'review' && (
              <motion.div
                ref={gapsRef}
                className="setup__gaps"
                role="alert"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={softSpring}
              >
                <p className="setup__gaps-title">Still needed before you can publish</p>
                <ul>
                  {gaps.map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
                <p className="setup__gaps-note">
                  You can fill these in now, or skip and come back — your progress is saved.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {step !== 'review' && (
          <aside className="setup__aside" aria-label="Live preview">
            <div className="setup__aside-sticky">
              <p className="setup__aside-title">How hosts will see it</p>
              <ListingPreview venue={venue} />
              {copy.tip && (
                <div className="setup__tip">
                  <span className="setup__tip-label">Tip</span>
                  <p>{copy.tip}</p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      <footer className="setup__foot">
        <div className="setup__foot-inner">
          {previous ? (
            <button type="button" className="button-neutral" onClick={() => goTo(previous.id)}>
              Back
            </button>
          ) : (
            <span />
          )}

          <div className="setup__foot-end">
            {step === 'review' ? (
              isLive || venue.status === 'review' ? (
                <div className="setup__primary">
                  <PrimaryButton type="button" onClick={() => navigate(venuePath(venue.id))}>
                    {isLive ? 'Done' : 'Go to my venue'}
                  </PrimaryButton>
                </div>
              ) : (
                <>
                  {!ready && <span className="setup__foot-note">Fix the items marked above to submit</span>}
                  <div className="setup__primary">
                    <PrimaryButton type="button" disabled={!ready} onClick={() => submitVenue(venue.id)}>
                      Submit for review
                    </PrimaryButton>
                  </div>
                </>
              )
            ) : (
              <>
                {attempted && gaps.length > 0 && next && (
                  <button type="button" className="button-neutral" onClick={() => goTo(next.id)}>
                    Skip for now
                  </button>
                )}
                <div className="setup__primary">
                  <PrimaryButton type="button" onClick={onContinue}>
                    {next?.id === 'review' ? 'Review listing' : 'Continue'}
                  </PrimaryButton>
                </div>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
