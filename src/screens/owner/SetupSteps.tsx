import { AnimatePresence, motion } from 'framer-motion'

import { Combobox } from '../../components/Combobox'
import { PillGroup } from '../../components/PillGroup'
import { TextField } from '../../components/TextField'
import { ChipSet, ChoiceCards, MoneyField, NumberField, QuickPicks, TextArea } from './OwnerFields'
import { PlusIcon, TrashIcon } from './OwnerIcons'
import { formatNaira } from '../../lib/money'
import {
  CANCELLATION_POLICIES,
  MIN_DESCRIPTION,
  PLATFORM_FEE_PERCENT,
  SEATING_LAYOUTS,
  headlineCapacity,
  payoutFor,
} from '../../lib/owner'
import type { CancellationPolicy, OwnerVenue } from '../../lib/owner'
import { SPACE_TYPES } from '../../lib/signupFlow'
import { AMENITIES } from '../../lib/venues'
import type { EventDayGuide } from '../../lib/venues'
import { softSpring } from '../../motion/variants'
import type { VenuePatch } from '../../state/Owner'

export type StepProps = {
  venue: OwnerVenue
  update: (patch: VenuePatch) => void
}

const rowMotion = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, height: 0, marginTop: 0 },
  transition: softSpring,
}

/* ── Basics ──────────────────────────────────────────────── */

export function BasicsStep({ venue, update }: StepProps) {
  return (
    <div className="setup__form">
      <TextField
        label="Venue name"
        name="venueName"
        placeholder="The Grand Pavilion"
        value={venue.name}
        onChange={(name) => update({ name })}
      />

      <PillGroup
        label="What kind of space is it?"
        name="spaceType"
        options={SPACE_TYPES}
        value={venue.spaceType}
        onChange={(spaceType) => update({ spaceType })}
      />

      <TextArea
        label="Tagline"
        rows={2}
        max={90}
        value={venue.tagline}
        placeholder="Garden terrace for intimate engagements and naming ceremonies."
        hint="One line that tells a host who the venue is for."
        onChange={(tagline) => update({ tagline: tagline.replace(/\n/g, ' ') })}
      />

      <TextArea
        label="Description"
        rows={6}
        min={MIN_DESCRIPTION}
        max={1500}
        value={venue.description}
        placeholder="What makes it special? Mention the feel of the room, parking, power, access for older guests, and anything hosts always ask about."
        hint="Write it the way you would describe it on the phone."
        onChange={(description) => update({ description })}
      />
    </div>
  )
}

/* ── Location ────────────────────────────────────────────── */

export function LocationStep({ venue, update }: StepProps) {
  return (
    <div className="setup__form">
      <div className="setup__row">
        <Combobox
          label="State"
          name="venueState"
          value={venue.state}
          placeholder="Start typing a state"
          onChange={(state) => update({ state })}
        />
        <TextField
          label="Area or neighbourhood"
          name="venueArea"
          placeholder="Lekki Phase 1"
          value={venue.area}
          hint="This is what hosts see in search."
          onChange={(area) => update({ area })}
        />
      </div>

      <TextField
        label="Street address"
        name="venueAddress"
        placeholder="12 Admiralty Way"
        autoComplete="street-address"
        value={venue.address}
        hint="Only shared with a host once their booking is confirmed."
        onChange={(address) => update({ address })}
      />

      <TextArea
        label="Directions or landmark"
        optional
        rows={3}
        max={300}
        value={venue.directions}
        placeholder="Opposite Mega Plaza, second gate on the left. Guest parking is behind the hall."
        onChange={(directions) => update({ directions })}
      />
    </div>
  )
}

/* ── Spaces & capacity ───────────────────────────────────── */

export function SpacesStep({ venue, update }: StepProps) {
  function setSpace(index: number, patch: Partial<{ name: string; capacity: number }>): void {
    update({
      spaces: venue.spaces.map((space, position) =>
        position === index ? { ...space, ...patch } : space,
      ),
    })
  }

  function toggleLayout(name: string): void {
    const on = venue.seating.some((layout) => layout.name === name)
    update({
      seating: on
        ? venue.seating.filter((layout) => layout.name !== name)
        : [...venue.seating, { name, capacity: 0 }],
    })
  }

  function setLayoutCapacity(name: string, capacity: number): void {
    update({
      seating: venue.seating.map((layout) => (layout.name === name ? { ...layout, capacity } : layout)),
    })
  }

  const capacity = headlineCapacity(venue)

  return (
    <div className="setup__form">
      <section className="setup__group">
        <div className="setup__group-head">
          <h2 className="setup__group-title">Bookable spaces</h2>
          <p className="setup__group-hint">
            Each room, hall or lawn a host can hire. One is enough to start.
          </p>
        </div>

        <ul className="rows">
          <AnimatePresence initial={false}>
            {venue.spaces.map((space, index) => (
              <motion.li key={index} className="rows__item" {...rowMotion}>
                <label className="rows__field rows__field--grow">
                  <span className="filters__label">Space name</span>
                  <input
                    className="filters__input"
                    value={space.name}
                    placeholder={index === 0 ? 'Main hall' : 'Garden lawn'}
                    onChange={(event) => setSpace(index, { name: event.target.value })}
                  />
                </label>
                <label className="rows__field">
                  <span className="filters__label">Max guests</span>
                  <input
                    className="filters__input"
                    inputMode="numeric"
                    value={space.capacity ? space.capacity.toLocaleString('en-NG') : ''}
                    placeholder="300"
                    onChange={(event) =>
                      setSpace(index, { capacity: Number(event.target.value.replace(/\D/g, '')) || 0 })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="row-remove"
                  aria-label={`Remove ${space.name || 'this space'}`}
                  onClick={() => update({ spaces: venue.spaces.filter((_, position) => position !== index) })}
                >
                  <TrashIcon />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <button
          type="button"
          className="ghost-button ghost-button--small rows__add"
          onClick={() => update({ spaces: [...venue.spaces, { name: venue.spaces.length ? '' : 'Main hall', capacity: 0 }] })}
        >
          <PlusIcon size={14} /> {venue.spaces.length ? 'Add another space' : 'Add a space'}
        </button>
      </section>

      <section className="setup__group">
        <div className="setup__group-head">
          <h2 className="setup__group-title">Seating layouts</h2>
          <p className="setup__group-hint">
            The same room holds different numbers depending on how it is set. Turn on each layout you offer.
          </p>
        </div>

        <ul className="layouts">
          {SEATING_LAYOUTS.map((name) => {
            const layout = venue.seating.find((entry) => entry.name === name)
            return (
              <li key={name} className={`layouts__item${layout ? ' layouts__item--on' : ''}`}>
                <label className="layouts__toggle">
                  <input type="checkbox" checked={Boolean(layout)} onChange={() => toggleLayout(name)} />
                  <span>
                    <span className="layouts__name">{name}</span>
                    <span className="layouts__hint">{LAYOUT_HINTS[name]}</span>
                  </span>
                </label>
                {layout && (
                  <input
                    className="filters__input layouts__input"
                    inputMode="numeric"
                    aria-label={`${name} capacity`}
                    placeholder="Guests"
                    value={layout.capacity ? layout.capacity.toLocaleString('en-NG') : ''}
                    onChange={(event) =>
                      setLayoutCapacity(name, Number(event.target.value.replace(/\D/g, '')) || 0)
                    }
                  />
                )}
              </li>
            )
          })}
        </ul>

        {capacity > 0 && (
          <p className="setup__callout setup__callout--quiet">
            Hosts will see <strong>Seats {capacity.toLocaleString('en-NG')}</strong> on your listing
            {venue.seating.some((layout) => layout.name === 'Banquet' && layout.capacity)
              ? ' — your banquet number, the one hosts compare.'
              : ' — your largest space.'}
          </p>
        )}
      </section>
    </div>
  )
}

const LAYOUT_HINTS: Record<string, string> = {
  Banquet: 'Round tables, dinner served',
  Theatre: 'Rows of chairs facing a stage',
  Cocktail: 'Standing, high tables',
  Classroom: 'Tables in rows, facing front',
}

/* ── Amenities ───────────────────────────────────────────── */

export function AmenitiesStep({ venue, update }: StepProps) {
  function toggle(amenity: string): void {
    update({
      amenities: venue.amenities.includes(amenity)
        ? venue.amenities.filter((item) => item !== amenity)
        : [...venue.amenities, amenity],
    })
  }

  return (
    <div className="setup__form">
      <ChipSet
        label="Included with the hire"
        hint={`${venue.amenities.length} selected`}
        options={AMENITIES}
        selected={venue.amenities}
        onToggle={toggle}
      />
    </div>
  )
}

/* ── Pricing ─────────────────────────────────────────────── */

export function PricingStep({ venue, update }: StepProps) {
  const weekendRate = Math.round(venue.pricePerDay * (1 + venue.weekendPremium / 100))
  const weekday = payoutFor(venue.pricePerDay)
  const weekend = payoutFor(weekendRate)

  function setService(index: number, patch: Partial<OwnerVenue['inHouse'][number]>): void {
    update({
      inHouse: venue.inHouse.map((service, position) => (position === index ? { ...service, ...patch } : service)),
    })
  }

  return (
    <div className="setup__form">
      <MoneyField
        label="Day rate"
        value={venue.pricePerDay}
        placeholder="750,000"
        suffix="per day"
        hint="What a host pays to hire the venue for one weekday, before extras."
        onChange={(pricePerDay) => update({ pricePerDay })}
      />

      <div className="setup__row">
        <div>
          <NumberField
            label="Weekend premium"
            value={venue.weekendPremium}
            suffix="%"
            max={100}
            placeholder="0"
            onChange={(weekendPremium) => update({ weekendPremium })}
          />
          <QuickPicks
            label="Common weekend premiums"
            options={['0%', '10%', '15%', '20%', '25%']}
            onPick={(pick) => update({ weekendPremium: Number(pick.replace('%', '')) })}
          />
        </div>
        <div>
          <NumberField
            label="Deposit to hold the date"
            value={venue.depositPercent}
            suffix="%"
            max={100}
            placeholder="30"
            onChange={(depositPercent) => update({ depositPercent })}
          />
          <QuickPicks
            label="Common deposits"
            options={['25%', '30%', '40%', '50%']}
            onPick={(pick) => update({ depositPercent: Number(pick.replace('%', '')) })}
          />
        </div>
      </div>

      {venue.pricePerDay > 0 && (
        <div className="setup__callout">
          <p className="setup__callout-title">What you would take home</p>
          <dl className="takehome">
            <div>
              <dt>Weekday booking</dt>
              <dd>{formatNaira(weekday.net)}</dd>
            </div>
            <div>
              <dt>Saturday or Sunday</dt>
              <dd>{formatNaira(weekend.net)}</dd>
            </div>
          </dl>
          <p className="setup__callout-note">
            After our {PLATFORM_FEE_PERCENT}% fee. The host pays {venue.depositPercent || 0}% up front into escrow
            and the rest before the event; you are paid 24 hours after it ends.
          </p>
        </div>
      )}

      <section className="setup__group">
        <div className="setup__group-head">
          <h2 className="setup__group-title">In-house services <span className="field__optional">Optional</span></h2>
          <p className="setup__group-hint">
            Extras you sell yourself — catering, decor, generator hire. Hosts add them at checkout.
          </p>
        </div>

        <ul className="rows">
          <AnimatePresence initial={false}>
            {venue.inHouse.map((service, index) => (
              <motion.li key={index} className="rows__item rows__item--wrap" {...rowMotion}>
                <label className="rows__field rows__field--grow">
                  <span className="filters__label">Service</span>
                  <input
                    className="filters__input"
                    value={service.name}
                    placeholder="In-house catering"
                    onChange={(event) => setService(index, { name: event.target.value })}
                  />
                </label>
                <label className="rows__field">
                  <span className="filters__label">Price (₦)</span>
                  <input
                    className="filters__input"
                    inputMode="numeric"
                    value={service.price ? service.price.toLocaleString('en-NG') : ''}
                    placeholder="15,000"
                    onChange={(event) =>
                      setService(index, { price: Number(event.target.value.replace(/\D/g, '')) || 0 })
                    }
                  />
                </label>
                <label className="rows__check">
                  <input
                    type="checkbox"
                    checked={service.perGuest}
                    onChange={(event) => setService(index, { perGuest: event.target.checked })}
                  />
                  Per guest
                </label>
                <button
                  type="button"
                  className="row-remove"
                  aria-label={`Remove ${service.name || 'this service'}`}
                  onClick={() => update({ inHouse: venue.inHouse.filter((_, position) => position !== index) })}
                >
                  <TrashIcon />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <button
          type="button"
          className="ghost-button ghost-button--small rows__add"
          onClick={() => update({ inHouse: [...venue.inHouse, { name: '', price: 0, perGuest: false }] })}
        >
          <PlusIcon size={14} /> Add a service
        </button>
      </section>
    </div>
  )
}

/* ── Policies ────────────────────────────────────────────── */

const CURFEW_PICKS = [
  'Hall cleared by midnight',
  'Music off at 1:00am, hall cleared by 2:00am',
  'Outdoor music off at 10:30pm',
]

const ALCOHOL_OPTIONS = ['Permitted', 'Permitted, corkage applies', 'Venue bar only', 'Not permitted']
const VENDOR_OPTIONS = ['All vendors welcome', 'Outside caterers need approval', 'In-house catering only']

const SUGGESTED_FAQ = [
  'What time can we start setting up?',
  'Is there parking for guests?',
  'Can we bring our own caterer?',
  'Is the generator included?',
]

export function PoliciesStep({ venue, update }: StepProps) {
  const policyOptions = (Object.keys(CANCELLATION_POLICIES) as CancellationPolicy[]).map((id) => ({
    id,
    title: CANCELLATION_POLICIES[id].label,
    summary: CANCELLATION_POLICIES[id].summary,
    body: CANCELLATION_POLICIES[id].text,
  }))

  const unasked = SUGGESTED_FAQ.filter((question) => !venue.faq.some((entry) => entry.question === question))

  function setFaq(index: number, patch: Partial<{ question: string; answer: string }>): void {
    update({ faq: venue.faq.map((entry, position) => (position === index ? { ...entry, ...patch } : entry)) })
  }

  return (
    <div className="setup__form">
      <ChoiceCards
        label="Cancellation policy"
        name="cancellation"
        options={policyOptions}
        value={venue.cancellation}
        onChange={(cancellation) => update({ cancellation })}
      />

      <div>
        <TextField
          label="When does the event have to end?"
          name="curfew"
          placeholder="Music off at 1:00am, hall cleared by 2:00am"
          value={venue.curfew}
          onChange={(curfew) => update({ curfew })}
        />
        <QuickPicks label="Common curfews" options={CURFEW_PICKS} onPick={(curfew) => update({ curfew })} />
      </div>

      <PillGroup
        label="Alcohol"
        name="alcohol"
        options={ALCOHOL_OPTIONS}
        value={venue.alcohol}
        onChange={(alcohol) => update({ alcohol })}
      />

      <PillGroup
        label="Outside vendors"
        name="outsideVendors"
        options={VENDOR_OPTIONS}
        value={venue.outsideVendors}
        onChange={(outsideVendors) => update({ outsideVendors })}
      />

      <TextArea
        label="House rules"
        optional
        rows={4}
        max={800}
        value={venue.houseRules}
        placeholder="No confetti cannons indoors. Decorators must not nail into walls. Children supervised near the pool."
        onChange={(houseRules) => update({ houseRules })}
      />

      <section className="setup__group">
        <div className="setup__group-head">
          <h2 className="setup__group-title">
            Questions hosts always ask <span className="field__optional">Optional</span>
          </h2>
          <p className="setup__group-hint">Answer them once here instead of on every call.</p>
        </div>

        <ul className="rows">
          <AnimatePresence initial={false}>
            {venue.faq.map((entry, index) => (
              <motion.li key={index} className="rows__item rows__item--stack" {...rowMotion}>
                <div className="rows__stack">
                  <input
                    className="filters__input"
                    aria-label="Question"
                    value={entry.question}
                    placeholder="Question"
                    onChange={(event) => setFaq(index, { question: event.target.value })}
                  />
                  <textarea
                    className="filters__input rows__textarea"
                    aria-label="Answer"
                    rows={2}
                    value={entry.answer}
                    placeholder="Your answer"
                    onChange={(event) => setFaq(index, { answer: event.target.value })}
                  />
                </div>
                <button
                  type="button"
                  className="row-remove"
                  aria-label="Remove this question"
                  onClick={() => update({ faq: venue.faq.filter((_, position) => position !== index) })}
                >
                  <TrashIcon />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {unasked.length > 0 && (
          <QuickPicks
            label="Suggested questions"
            options={unasked.map((question) => `+ ${question}`)}
            onPick={(pick) => update({ faq: [...venue.faq, { question: pick.slice(2), answer: '' }] })}
          />
        )}
        <button
          type="button"
          className="ghost-button ghost-button--small rows__add"
          onClick={() => update({ faq: [...venue.faq, { question: '', answer: '' }] })}
        >
          <PlusIcon size={14} /> Write your own question
        </button>
      </section>
    </div>
  )
}

/* ── Event day ───────────────────────────────────────────── */

const GUIDE_FIELDS: { key: keyof EventDayGuide; label: string; placeholder: string }[] = [
  {
    key: 'arrival',
    label: 'Arrival and gates',
    placeholder: 'Guests use the main gate on Adeola Road. Tell security the event name on arrival.',
  },
  {
    key: 'parking',
    label: 'Parking and vendor vehicles',
    placeholder: 'Space for 60 cars. Vendor vans park and unload at the side gate.',
  },
  {
    key: 'setup',
    label: 'Set-up and clear-down times',
    placeholder: 'Vendors can enter from 8am. Everything must be cleared by midnight.',
  },
  {
    key: 'power',
    label: 'Power',
    placeholder: 'Generator included for 10 hours. Outdoor sockets are by the stage.',
  },
]

export function EventDayStep({ venue, update }: StepProps) {
  function setGuide(key: keyof EventDayGuide, value: string): void {
    update((current) => ({ guide: { ...current.guide, [key]: value } }))
  }

  return (
    <div className="setup__form">
      {GUIDE_FIELDS.map((field) => (
        <TextArea
          key={field.key}
          label={field.label}
          rows={3}
          max={400}
          value={venue.guide[field.key]}
          placeholder={field.placeholder}
          onChange={(value) => setGuide(field.key, value)}
        />
      ))}

      <div>
        <TextField
          label="Event-day phone number"
          name="eventDayPhone"
          placeholder="0803 000 0000"
          value={venue.eventDayPhone}
          onChange={(eventDayPhone) => update({ eventDayPhone })}
        />
        <p className="setup__group-hint">
          Hosts see this 7 days before their event, once they have paid in full. Use the number of whoever runs the
          venue on the day.
        </p>
      </div>
    </div>
  )
}
