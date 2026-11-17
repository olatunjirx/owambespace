import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { Combobox } from '../../components/Combobox'
import { PillGroup } from '../../components/PillGroup'
import { TextField } from '../../components/TextField'
import { ChipSet, ChoiceCards, MoneyField, NumberField, QuickPicks, Switch, TextArea } from '../owner/OwnerFields'
import { StatusTag } from '../owner/ListingPreview'
import { CheckIcon, PlusIcon, TrashIcon } from '../owner/OwnerIcons'
import { PackageCard } from './PackageCard'
import { ProviderShell } from './ProviderShell'
import { servicesPath } from './providerPaths'
import { formatNaira, formatNairaShort } from '../../lib/money'
import { NIGERIA_STATES } from '../../lib/nigeriaStates'
import { CANCELLATION_POLICIES, PLATFORM_FEE_PERCENT, STATUS_LABELS, payoutFor } from '../../lib/owner'
import type { CancellationPolicy } from '../../lib/owner'
import {
  MIN_ABOUT,
  PROVIDER_SECTIONS,
  SERVICE_SUGGESTIONS,
  categoryLabel,
  emptyPackage,
  fromPrice,
  isPackageComplete,
  isReadyToSubmit,
  listingProgress,
  sectionGaps,
  starterPackages,
} from '../../lib/provider'
import type { ProviderListing, ProviderSection } from '../../lib/provider'
import { VENDOR_CATEGORIES } from '../../lib/vendors'
import type { ServicePackage } from '../../lib/vendors'
import { softSpring } from '../../motion/variants'
import { navigate } from '../../router/hashRouter'
import { useProvider } from '../../state/Provider'
import type { ListingPatch } from '../../state/Provider'
import '../owner/setup.css'

export type ServicesStep = ProviderSection | 'review'

const STEPS: { id: ServicesStep; label: string; hint: string }[] = [
  ...PROVIDER_SECTIONS,
  { id: 'review', label: 'Review', hint: 'Check it and go live' },
]

const COPY: Record<ServicesStep, { title: string; intro: string; tip: string }> = {
  profile: {
    title: 'Tell hosts who you are',
    intro: 'Your name, what you do and where you work. This is what hosts see in search.',
    tip: 'Taglines that say who you are for — “Party jollof for 500 guests, served hot” — get more clicks than ones that describe the business.',
  },
  packages: {
    title: 'Your packages',
    intro: 'Hosts book a package at a fixed price and pay a deposit straight away. No quotes, no back-and-forth.',
    tip: 'Two or three packages work best: a simple one, the one most people book, and everything you offer.',
  },
  policies: {
    title: 'Booking rules',
    intro: 'What a host pays up front, what happens if they cancel, and how many jobs you take on one date.',
    tip: 'Moderate cancellation is what most providers choose — it protects you without putting hosts off.',
  },
  review: {
    title: 'Review and go live',
    intro: 'Check everything once more. Nothing goes live until you submit.',
    tip: '',
  },
}

/**
 * Building the provider's listing, one section per screen — the same layout
 * and rules as listing a venue. Sections can be visited in any order and
 * every keystroke is saved; Continue says what is missing, and the review
 * step gathers anything skipped before submitting.
 */
export function ServicesScreen({ step }: { step: ServicesStep }) {
  const { listing, updateListing, submitListing, setPaused } = useProvider()
  const [attempted, setAttempted] = useState(false)
  const [saved, setSaved] = useState(false)
  const firstRender = useRef(true)
  const gapsRef = useRef<HTMLDivElement>(null)

  const index = STEPS.findIndex((entry) => entry.id === step)
  const gaps = step === 'review' ? [] : sectionGaps(listing, step)
  const progress = listingProgress(listing)
  const next = STEPS[index + 1]
  const isLive = listing.status === 'live' || listing.status === 'paused'
  const ready = isReadyToSubmit(listing)

  useEffect(() => setAttempted(false), [step])

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setSaved(true)
    const timer = window.setTimeout(() => setSaved(false), 1600)
    return () => window.clearTimeout(timer)
  }, [listing])

  function goTo(target: ServicesStep): void {
    navigate(servicesPath(target as ProviderSection))
  }

  function onContinue(): void {
    if (gaps.length > 0 && !attempted) {
      setAttempted(true)
      window.setTimeout(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        gapsRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
      }, 60)
      return
    }
    if (next) goTo(next.id)
  }

  const copy = COPY[step]

  return (
    <ProviderShell
      section="services"
      pageKey={`services-${step}`}
      wide
      crumbs={[
        { label: 'My services', href: '#/provider/services' },
        { label: `${isLive ? 'Editing' : 'Listing'} ${listing.name || 'your profile'}` },
      ]}
    >
      <div className={`psetup${step === 'review' ? ' psetup--review' : ''}`}>
        <nav className="psetup__steps" aria-label="Profile sections">
          <p className="psetup__count">
            {progress.done} of {progress.total} sections complete
          </p>
          <ol className="psetup__list">
            {STEPS.map((entry, position) => {
              const current = entry.id === step
              const done =
                entry.id === 'review' ? listing.status !== 'draft' : sectionGaps(listing, entry.id).length === 0
              return (
                <li key={entry.id}>
                  <a
                    className={`psetup__step${current ? ' psetup__step--current' : ''}${done && !current ? ' psetup__step--done' : ''}`}
                    href={`#${servicesPath(entry.id as ProviderSection)}`}
                    aria-current={current ? 'step' : undefined}
                  >
                    <span className="psetup__badge" aria-hidden="true">
                      {done && !current ? <CheckIcon size={10} /> : position + 1}
                    </span>
                    <span>
                      <span className="psetup__label">{entry.label}</span>
                      <span className="psetup__hint">{entry.hint}</span>
                    </span>
                  </a>
                </li>
              )
            })}
          </ol>
        </nav>

        <div>
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="psetup__eyebrow">
              Step {index + 1} of {STEPS.length}
            </p>
            <h1 className="psetup__title">{copy.title}</h1>
            <p className="psetup__intro">{copy.intro}</p>

            <div className="psetup__form">
              {step === 'profile' && <ProfileStep listing={listing} update={updateListing} />}
              {step === 'packages' && <PackagesStep listing={listing} update={updateListing} />}
              {step === 'policies' && <PoliciesStep listing={listing} update={updateListing} />}
              {step === 'review' && <ReviewStep listing={listing} onPause={setPaused} />}
            </div>
          </motion.div>

          <AnimatePresence>
            {attempted && gaps.length > 0 && (
              <motion.div
                ref={gapsRef}
                className="setup__gaps"
                role="alert"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={softSpring}
              >
                <p className="setup__gaps-title">Still needed before you can go live</p>
                <ul>
                  {gaps.map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
                <p className="setup__gaps-note">You can fill these in now, or skip and come back — your progress is saved.</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="psetup__actions">
            <AnimatePresence mode="wait" initial={false}>
              {saved && (
                <motion.span
                  key="saved"
                  className="pset__saved"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  aria-live="polite"
                >
                  Saved
                </motion.span>
              )}
            </AnimatePresence>
            {step === 'review' ? (
              isLive || listing.status === 'review' ? (
                <button type="button" className="pbtn-primary pbtn--wide" onClick={() => navigate('/provider/services')}>
                  Done
                </button>
              ) : (
                <>
                  <button type="button" className="pbtn" onClick={() => navigate('/provider/services')}>
                    Save &amp; Exit
                  </button>
                  <button type="button" className="pbtn-primary pbtn--wide" disabled={!ready} onClick={submitListing}>
                    Submit for review
                  </button>
                </>
              )
            ) : (
              <>
                {attempted && gaps.length > 0 && next && (
                  <button type="button" className="pbtn" onClick={() => goTo(next.id)}>
                    Skip for now
                  </button>
                )}
                <button type="button" className="pbtn" onClick={() => navigate('/provider/services')}>
                  Save &amp; Exit
                </button>
                <button type="button" className="pbtn-primary pbtn--wide" onClick={onContinue}>
                  Continue
                </button>
              </>
            )}
          </div>
        </div>

        {step !== 'review' && (
          <aside className="psetup__aside" aria-label="Live preview">
            <p className="psetup__aside-title">How hosts will see it</p>
            <ProviderPreview listing={listing} />
            {copy.tip && (
              <div className="ptip">
                <strong>Tip</strong>
                <p>{copy.tip}</p>
              </div>
            )}
          </aside>
        )}
      </div>
    </ProviderShell>
  )
}

type StepProps = {
  listing: ProviderListing
  update: (patch: ListingPatch) => void
}

const rowMotion = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, height: 0, marginTop: 0 },
  transition: softSpring,
}

/* ── Profile ─────────────────────────────────────────────── */

function ProfileStep({ listing, update }: StepProps) {
  const suggestions = SERVICE_SUGGESTIONS[listing.category] ?? []
  const [tag, setTag] = useState('')

  function addTag(value: string): void {
    const clean = value.trim()
    if (!clean || listing.services.includes(clean)) return
    update({ services: [...listing.services, clean] })
    setTag('')
  }

  return (
    <div className="setup__form">
      <TextField
        label="Business name"
        name="providerName"
        placeholder="Iya Oyo’s Kitchen"
        value={listing.name}
        hint="What clients call you. Your own name is fine."
        onChange={(name) => update({ name })}
      />

      <PillGroup
        label="What do you mainly do?"
        name="category"
        options={VENDOR_CATEGORIES.map((category) => category.label)}
        value={listing.category ? categoryLabel(listing.category) : ''}
        onChange={(label) => update({ category: VENDOR_CATEGORIES.find((category) => category.label === label)?.slug ?? '' })}
      />

      <TextArea
        label="Tagline"
        rows={2}
        max={90}
        value={listing.tagline}
        placeholder="Party jollof that ends arguments, plus full buffet service."
        hint="One line that tells a host why they should pick you."
        onChange={(tagline) => update({ tagline: tagline.replace(/\n/g, ' ') })}
      />

      <TextArea
        label="About your work"
        rows={5}
        min={MIN_ABOUT}
        max={1200}
        value={listing.about}
        placeholder="How long you’ve been doing this, the events you love, how big a crowd you can handle, and what hosts always thank you for."
        onChange={(about) => update({ about })}
      />

      <div className="setup__row">
        <Combobox
          label="State"
          name="providerState"
          value={listing.state}
          placeholder="Start typing a state"
          onChange={(state) => update({ state })}
        />
        <TextField
          label="Area or city"
          name="providerArea"
          placeholder="Surulere"
          value={listing.area}
          onChange={(area) => update({ area })}
        />
      </div>

      <ChipSet
        label="Other states you travel to"
        hint="Optional. Hosts in these states will also find you."
        options={NIGERIA_STATES.map((entry) => entry.name).filter((name) => name !== listing.state).slice(0, 12)}
        selected={listing.travelStates}
        onToggle={(state) =>
          update({
            travelStates: listing.travelStates.includes(state)
              ? listing.travelStates.filter((entry) => entry !== state)
              : [...listing.travelStates, state],
          })
        }
      />

      <section className="setup__group">
        <div className="setup__group-head">
          <h2 className="setup__group-title">Services you offer</h2>
          <p className="setup__group-hint">Short tags hosts scan in search, like “Small chops” or “Drone coverage”.</p>
        </div>
        {listing.services.length > 0 && (
          <ul className="pkg-edit__includes">
            {listing.services.map((service) => (
              <li key={service} className="pkg-chip">
                {service}
                <button
                  type="button"
                  aria-label={`Remove ${service}`}
                  onClick={() => update({ services: listing.services.filter((entry) => entry !== service) })}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="pkg-edit__add"
          onSubmit={(event) => {
            event.preventDefault()
            addTag(tag)
          }}
        >
          <input
            className="filters__input"
            value={tag}
            placeholder="Add a service"
            aria-label="Add a service"
            onChange={(event) => setTag(event.target.value)}
          />
          <button type="submit" className="ghost-button ghost-button--small" disabled={!tag.trim()}>
            Add
          </button>
        </form>
        {suggestions.length > 0 && (
          <QuickPicks options={suggestions.filter((entry) => !listing.services.includes(entry))} onPick={addTag} />
        )}
      </section>
    </div>
  )
}

/* ── Packages ────────────────────────────────────────────── */

function PackagesStep({ listing, update }: StepProps) {
  function setPackage(id: string, patch: Partial<ServicePackage>): void {
    update((current) => ({
      packages: current.packages.map((pkg) => (pkg.id === id ? { ...pkg, ...patch } : pkg)),
    }))
  }

  return (
    <div className="setup__form">
      <div className="setup__callout setup__callout--quiet">
        <p className="setup__callout-title">How packages work</p>
        <p className="setup__callout-note">
          A host picks a package and a date, then pays your deposit to book it — there is no quote step. Chat with the
          host opens only after they’ve paid, and phone numbers, emails and links are blocked in chat.
        </p>
      </div>

      {listing.packages.length === 0 && (
        <button
          type="button"
          className="ghost-button"
          onClick={() => update({ packages: starterPackages(listing.category) })}
        >
          <PlusIcon size={14} /> Start with two suggested packages
        </button>
      )}

      <ul className="pkg-list">
        <AnimatePresence initial={false}>
          {listing.packages.map((pkg, position) => (
            <motion.li key={pkg.id} {...rowMotion}>
              <PackageEditor
                pkg={pkg}
                position={position}
                suggestions={SERVICE_SUGGESTIONS[listing.category] ?? listing.services}
                onChange={(patch) => setPackage(pkg.id, patch)}
                onRemove={() => update({ packages: listing.packages.filter((entry) => entry.id !== pkg.id) })}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {listing.packages.length > 0 && listing.packages.length < 5 && (
        <button
          type="button"
          className="ghost-button ghost-button--small rows__add"
          onClick={() =>
            update({
              packages: [...listing.packages, emptyPackage({ priceUnit: listing.packages[0]?.priceUnit ?? 'per event' })],
            })
          }
        >
          <PlusIcon size={14} /> Add a package
        </button>
      )}
    </div>
  )
}

function PackageEditor({
  pkg,
  position,
  suggestions,
  onChange,
  onRemove,
}: {
  pkg: ServicePackage
  position: number
  suggestions: string[]
  onChange: (patch: Partial<ServicePackage>) => void
  onRemove: () => void
}) {
  const [item, setItem] = useState('')
  const perGuest = pkg.priceUnit === 'per guest'

  function addItem(value: string): void {
    const clean = value.trim()
    if (!clean || pkg.includes.includes(clean)) return
    onChange({ includes: [...pkg.includes, clean] })
    setItem('')
  }

  return (
    <div className="pkg-edit">
      <div className="pkg-edit__head">
        <span className="pkg-edit__index">
          Package {position + 1}
          {isPackageComplete(pkg) && ' · Ready'}
        </span>
        <button type="button" className="row-remove" aria-label={`Remove ${pkg.name || 'this package'}`} onClick={onRemove}>
          <TrashIcon />
        </button>
      </div>

      <div className="setup__row">
        <TextField
          label="Package name"
          name={`pkg-name-${pkg.id}`}
          placeholder="Classic"
          value={pkg.name}
          onChange={(name) => onChange({ name })}
        />
        <MoneyField
          label={perGuest ? 'Price per guest' : 'Price'}
          value={pkg.price}
          placeholder={perGuest ? '6,500' : '250,000'}
          onChange={(price) => onChange({ price })}
        />
      </div>

      <TextField
        label="Short description"
        name={`pkg-summary-${pkg.id}`}
        placeholder="What most hosts book."
        value={pkg.summary}
        optional
        onChange={(summary) => onChange({ summary })}
      />

      <Switch
        label="Priced per guest"
        description={
          perGuest
            ? 'The host pays this price for every guest, never below your minimum.'
            : 'One price for the whole event, whatever the guest count.'
        }
        checked={perGuest}
        onChange={(on) => onChange({ priceUnit: on ? 'per guest' : 'per event', minGuests: on ? pkg.minGuests || 50 : 0 })}
      />

      <div className="setup__row">
        {perGuest ? (
          <NumberField
            label="Minimum guests"
            value={pkg.minGuests}
            suffix="guests"
            onChange={(minGuests) => onChange({ minGuests })}
          />
        ) : (
          <span />
        )}
        <NumberField
          label="Hours on the day"
          value={pkg.hours}
          suffix="hours"
          max={24}
          hint="Leave empty if it isn’t time-bound."
          onChange={(hours) => onChange({ hours: Math.min(24, hours) })}
        />
      </div>

      <div className="field">
        <span className="field__label">What’s included</span>
        {pkg.includes.length > 0 && (
          <ul className="pkg-edit__includes">
            {pkg.includes.map((entry) => (
              <li key={entry} className="pkg-chip">
                {entry}
                <button
                  type="button"
                  aria-label={`Remove ${entry}`}
                  onClick={() => onChange({ includes: pkg.includes.filter((value) => value !== entry) })}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="pkg-edit__add"
          onSubmit={(event) => {
            event.preventDefault()
            addItem(item)
          }}
        >
          <input
            className="filters__input"
            value={item}
            placeholder="e.g. Jollof rice, 2 proteins, serving staff"
            aria-label="Add something this package includes"
            onChange={(event) => setItem(event.target.value)}
          />
          <button type="submit" className="ghost-button ghost-button--small" disabled={!item.trim()}>
            Add
          </button>
        </form>
        {suggestions.length > 0 && (
          <QuickPicks options={suggestions.filter((entry) => !pkg.includes.includes(entry)).slice(0, 6)} onPick={addItem} />
        )}
      </div>
    </div>
  )
}

/* ── Booking rules ───────────────────────────────────────── */

function PoliciesStep({ listing, update }: StepProps) {
  const example = listing.packages.find(isPackageComplete)
  const exampleTotal = example ? (example.priceUnit === 'per guest' ? example.price * Math.max(150, example.minGuests) : example.price) : 0
  const take = payoutFor(exampleTotal)

  return (
    <div className="setup__form">
      <NumberField
        label="Deposit to book"
        value={listing.depositPercent}
        suffix="%"
        max={100}
        hint="Paid by the host the moment they book. The rest is due 14 days before the event."
        onChange={(depositPercent) => update({ depositPercent: Math.min(100, depositPercent) })}
      />
      <QuickPicks label="Common deposits" options={['30%', '50%', '70%']} onPick={(value) => update({ depositPercent: Number(value.replace('%', '')) })} />

      <ChoiceCards
        label="Cancellation policy"
        name="cancellation"
        options={(Object.keys(CANCELLATION_POLICIES) as CancellationPolicy[]).map((id) => ({
          id,
          title: CANCELLATION_POLICIES[id].label,
          summary: CANCELLATION_POLICIES[id].summary,
          body: CANCELLATION_POLICIES[id].text,
        }))}
        value={listing.cancellation}
        onChange={(cancellation) => update({ cancellation })}
      />

      <NumberField
        label="Events you can cover on one date"
        value={listing.perDay}
        suffix={listing.perDay === 1 ? 'event' : 'events'}
        max={20}
        hint="Once a date has this many bookings, hosts see it as unavailable."
        onChange={(perDay) => update({ perDay: Math.max(1, Math.min(20, perDay)) })}
      />

      <TextArea
        label="What you need on the day"
        optional
        rows={3}
        max={400}
        value={listing.needs}
        placeholder="Two power points near the stage, a 6×3m space, access from 2 hours before."
        hint="Shared with the host once they’ve paid, so they can arrange it with the venue."
        onChange={(needs) => update({ needs })}
      />

      {example && (
        <div className="setup__callout">
          <p className="setup__callout-title">What you would take home</p>
          <dl className="takehome">
            <div>
              <dt>{example.name}{example.priceUnit === 'per guest' ? `, ${Math.max(150, example.minGuests)} guests` : ''}</dt>
              <dd>{formatNaira(take.gross)}</dd>
            </div>
            <div>
              <dt>Owambe Space fee ({PLATFORM_FEE_PERCENT}%)</dt>
              <dd>−{formatNaira(take.fee)}</dd>
            </div>
            <div>
              <dt>You receive</dt>
              <dd>{formatNaira(take.net)}</dd>
            </div>
          </dl>
          <p className="setup__callout-note">Released to you 24 hours after the event.</p>
        </div>
      )}
    </div>
  )
}

/* ── Review ──────────────────────────────────────────────── */

function ReviewStep({ listing, onPause }: { listing: ProviderListing; onPause: (paused: boolean) => void }) {
  const missing = PROVIDER_SECTIONS.flatMap((section) =>
    sectionGaps(listing, section.id).map((gap) => ({ gap, section })),
  )
  const isLive = listing.status === 'live' || listing.status === 'paused'

  return (
    <div className="setup__form">
      <div className="status-card">
        <div className="status-card__text">
          <StatusTag status={listing.status} />
          <p className="card__hint">
            {listing.status === 'draft' && 'Not visible to hosts yet.'}
            {listing.status === 'review' && 'We’re checking your profile — usually within 24 hours.'}
            {listing.status === 'live' && 'Hosts can find and book your packages.'}
            {listing.status === 'paused' && 'Hidden from search. Existing bookings are unaffected.'}
          </p>
        </div>
      </div>

      {isLive && (
        <Switch
          label="Taking new bookings"
          description="Turn this off to hide your profile from search for a while. Paid bookings stay as they are."
          checked={listing.status === 'live'}
          onChange={(on) => onPause(!on)}
        />
      )}

      {missing.length > 0 && (
        <div className="setup__gaps" role="alert">
          <p className="setup__gaps-title">Still needed before you can go live</p>
          <ul>
            {missing.map(({ gap, section }) => (
              <li key={gap}>
                <a href={`#${servicesPath(section.id)}`}>{gap}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ProviderPreview listing={listing} />

      <section className="setup__group">
        <div className="setup__group-head">
          <h2 className="setup__group-title">Packages hosts can book</h2>
        </div>
        <div className="pkg-grid">
          {listing.packages.filter(isPackageComplete).map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      </section>

      <dl className="checkout__lines">
        <div>
          <dt>Deposit to book</dt>
          <dd>{listing.depositPercent}%</dd>
        </div>
        <div>
          <dt>Cancellation</dt>
          <dd>{listing.cancellation ? CANCELLATION_POLICIES[listing.cancellation].label : '—'}</dd>
        </div>
        <div>
          <dt>Events per date</dt>
          <dd>{listing.perDay}</dd>
        </div>
      </dl>
    </div>
  )
}

/** The listing as a host meets it in search (Figma preview card 1129:32394), built live from the draft. */
export function ProviderPreview({ listing }: { listing: ProviderListing }) {
  const from = fromPrice(listing)
  const where = [listing.area, listing.state].filter(Boolean).join(', ')
  const initials = listing.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'S'
  return (
    <article className="pcard">
      <div className="pcard__cover">
        <span className={`pcard__status${listing.status === 'live' ? ' pcard__status--live' : ''}`}>
          {STATUS_LABELS[listing.status]}
        </span>
        {initials}
      </div>
      <div className="pcard__body">
        <div className="pcard__head">
          <h3 className="pcard__name">{listing.name || 'Your business name'}</h3>
          <span className="pcard__new">New</span>
        </div>
        <p className="pcard__meta">
          {[where || 'Area, State', listing.category ? categoryLabel(listing.category) : 'Category'].join(' · ')}
        </p>
        <p className="pcard__tagline">{listing.tagline || 'Your one-line tagline appears here.'}</p>
        <div className="pcard__chips">
          <span className="pcard__chip">{listing.packages.filter(isPackageComplete).length} packages</span>
          <span className="pcard__chip pcard__chip--accent">
            {from.price ? `From ${formatNairaShort(from.price)} ${from.unit === 'per guest' ? '/ guest' : '/ event'}` : '₦- / event'}
          </span>
        </div>
      </div>
    </article>
  )
}
