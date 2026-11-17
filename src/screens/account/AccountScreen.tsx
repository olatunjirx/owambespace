import { useState } from 'react'
import { motion } from 'framer-motion'

import { AppShell } from '../host/AppShell'
import { VendorTile } from '../discover/VendorTile'
import { eventPath } from '../host/EventShell'
import { countdownLabel, eventStage, formatShortDate } from '../../lib/events'
import { findVendor } from '../../lib/vendors'
import { findVenue } from '../../lib/venues'
import { formatNairaShort } from '../../lib/money'
import { riseIn } from '../../motion/variants'
import { useEvents } from '../../state/Events'
import { useProfile } from '../../state/Profile'
import type { CommunicationPrefs } from '../../state/Profile'
import './account.css'
import '../host/host.css'
import '../discover/explore.css'

const PREFS: { id: keyof CommunicationPrefs; label: string; hint: string }[] = [
  {
    id: 'emailUpdates',
    label: 'Email updates',
    hint: 'Booking confirmations, receipts and RSVP summaries',
  },
  {
    id: 'smsReminders',
    label: 'SMS reminders',
    hint: 'Payment deadlines and event-day reminders',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp messages',
    hint: 'The same reminders, on WhatsApp instead',
  },
]

/**
 * The host's profile — spec §4.1.
 *
 * Display name and bio edit in place and commit on blur; preferences flip
 * instantly. Payment is simulated end to end and says so, because a card
 * form with no Paystack behind it would be a lie with fields.
 */
export function AccountScreen() {
  const { profile, update, setPref } = useProfile()
  const { events } = useEvents()

  const [name, setName] = useState(profile.displayName)
  const [bio, setBio] = useState(profile.bio)

  const history = [...events].sort((a, b) => b.createdISO.localeCompare(a.createdISO))

  // Saved venues live on events; the profile view aggregates them so the host
  // has one place to see everything they have shortlisted anywhere.
  const savedVenues = events.flatMap((event) =>
    event.saved
      .map((venueId) => ({ venue: findVenue(venueId), event }))
      .filter((entry): entry is { venue: NonNullable<ReturnType<typeof findVenue>>; event: typeof event } =>
        Boolean(entry.venue),
      ),
  )

  const savedVendors = profile.savedVendors
    .map(findVendor)
    .filter((vendor): vendor is NonNullable<typeof vendor> => Boolean(vendor))

  return (
    <AppShell
      section="account"
      pageKey="account"
      title="My account"
      subtitle="Who you are on Owambe Space, and everything you have saved."
    >
      <motion.section className="card acct" variants={riseIn}>
        <div className="acct__identity">
          <span className="acct__avatar" aria-hidden="true">
            {(name.trim()[0] ?? 'H').toUpperCase()}
          </span>
          <p className="acct__photo-note">
            Photo upload arrives with the real backend — the initial stands in.
          </p>
        </div>

        <div className="acct__fields">
          <label className="acct__field">
            <span className="filters__label">Display name</span>
            <input
              className="filters__input"
              value={name}
              placeholder="How your name appears to providers"
              onChange={(changed) => setName(changed.target.value)}
              onBlur={() => update({ displayName: name.trim() })}
            />
          </label>

          <label className="acct__field">
            <span className="filters__label">
              Bio <span className="acct__optional">optional</span>
            </span>
            <textarea
              className="filters__input acct__bio"
              value={bio}
              rows={3}
              placeholder="A line about you, shown to providers you contact."
              onChange={(changed) => setBio(changed.target.value)}
              onBlur={() => update({ bio: bio.trim() })}
            />
          </label>
        </div>
      </motion.section>

      <motion.div className="split" variants={riseIn}>
        <section className="card">
          <div className="card__header">
            <div>
              <h2 className="card__title">How we reach you</h2>
              <p className="card__hint">Change these any time.</p>
            </div>
          </div>

          <ul className="prefs">
            {PREFS.map((pref) => (
              <li className="prefs__row" key={pref.id}>
                <span className="prefs__text">
                  <span className="prefs__label">{pref.label}</span>
                  <span className="prefs__hint">{pref.hint}</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.prefs[pref.id]}
                  aria-label={pref.label}
                  className={`switch${profile.prefs[pref.id] ? ' switch--on' : ''}`}
                  onClick={() => setPref(pref.id, !profile.prefs[pref.id])}
                >
                  <span className="switch__thumb" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="acct__stack">
          <section className="card">
            <div className="card__header">
              <div>
                <h2 className="card__title">Payment method</h2>
                <p className="card__hint">Used for deposits at checkout.</p>
              </div>
            </div>

            {profile.payment ? (
              <div className="pay">
                <span className="pay__card" aria-hidden="true" />
                <span className="pay__text">
                  <span className="pay__brand">
                    {profile.payment.brand} ···· {profile.payment.last4}
                  </span>
                  <span className="pay__note">Simulated — no charge can occur.</span>
                </span>
                <button
                  type="button"
                  className="ghost-button ghost-button--small ghost-button--danger"
                  onClick={() => update({ payment: null })}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="pay pay--none">
                <span className="pay__text">
                  <span className="pay__brand">No card on file</span>
                  <span className="pay__note">
                    Real cards need Paystack, which is not connected — this adds
                    a simulated one.
                  </span>
                </span>
                <button
                  type="button"
                  className="ghost-button ghost-button--small"
                  onClick={() => update({ payment: { brand: 'Visa', last4: '4242' } })}
                >
                  Add card
                </button>
              </div>
            )}
          </section>

          <section className="card">
            <div className="card__header">
              <div>
                <h2 className="card__title">Delivery address</h2>
                <p className="card__hint">Where rentals and printing get sent.</p>
              </div>
            </div>

            <div className="acct__fields">
              <label className="acct__field">
                <span className="filters__label">Street</span>
                <input
                  className="filters__input"
                  value={profile.address.street}
                  placeholder="12 Admiralty Way"
                  onChange={(changed) =>
                    update({ address: { ...profile.address, street: changed.target.value } })
                  }
                />
              </label>
              <div className="acct__row">
                <label className="acct__field">
                  <span className="filters__label">City</span>
                  <input
                    className="filters__input"
                    value={profile.address.city}
                    placeholder="Lekki"
                    onChange={(changed) =>
                      update({ address: { ...profile.address, city: changed.target.value } })
                    }
                  />
                </label>
                <label className="acct__field">
                  <span className="filters__label">State</span>
                  <input
                    className="filters__input"
                    value={profile.address.state}
                    placeholder="Lagos"
                    onChange={(changed) =>
                      update({ address: { ...profile.address, state: changed.target.value } })
                    }
                  />
                </label>
              </div>
            </div>
          </section>
        </div>
      </motion.div>

      <motion.section className="card" variants={riseIn}>
        <div className="card__header">
          <div>
            <h2 className="card__title">Event history</h2>
            <p className="card__hint">
              {history.length === 0
                ? 'Events you plan will collect here.'
                : `${history.length} event${history.length === 1 ? '' : 's'} on this account.`}
            </p>
          </div>
          <a className="ghost-button ghost-button--small" href="#/host">
            Open events
          </a>
        </div>

        {history.length > 0 && (
          <ul className="hist">
            {history.map((event) => {
              const stage = eventStage(event)
              return (
                <li key={event.id}>
                  <a className="hist__row" href={eventPath(event.id)}>
                    <span className="hist__main">
                      <span className="hist__name">{event.name}</span>
                      <span className="hist__meta">
                        {event.type} · {formatShortDate(event.date)} ·{' '}
                        {formatNairaShort(event.budget)} budget
                      </span>
                    </span>
                    <span
                      className={`tag ${
                        stage === 'past'
                          ? 'tag--muted'
                          : stage === 'upcoming'
                            ? 'tag--good'
                            : 'tag--accent'
                      }`}
                    >
                      {stage === 'past' ? 'Past' : countdownLabel(event.date)}
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </motion.section>

      <motion.section className="card" variants={riseIn}>
        <div className="card__header">
          <div>
            <h2 className="card__title">Saved</h2>
            <p className="card__hint">
              Venues you shortlisted for events, and services saved for later.
            </p>
          </div>
          <a className="ghost-button ghost-button--small" href="#/explore">
            Explore more
          </a>
        </div>

        {savedVenues.length === 0 && savedVendors.length === 0 ? (
          <p className="acct__blank">
            Nothing saved yet. Hearts on venues and services collect here.
          </p>
        ) : (
          <>
            {savedVenues.length > 0 && (
              <div className="hits">
                <h3 className="hits__head">Venues</h3>
                <ul className="hits__list">
                  {savedVenues.map(({ venue, event }) => (
                    <li key={`${event.id}-${venue.id}`}>
                      <a className="hit" href={`#/venues/${venue.id}`}>
                        <span
                          className="hit__thumb"
                          style={{
                            background: `linear-gradient(145deg, hsl(${venue.hue} 72% 52%), hsl(${venue.hue + 24} 68% 32%))`,
                          }}
                          aria-hidden="true"
                        >
                          {venue.initials}
                        </span>
                        <span className="hit__body">
                          <span className="hit__name">{venue.name}</span>
                          <span className="hit__meta">Saved for {event.name}</span>
                        </span>
                        <span className="hit__price">
                          {formatNairaShort(venue.pricePerDay)} / day
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {savedVendors.length > 0 && (
              <div className="hits">
                <h3 className="hits__head">Services</h3>
                <ul className="vendor-grid">
                  {savedVendors.map((vendor) => (
                    <VendorTile key={vendor.id} vendor={vendor} />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </motion.section>
    </AppShell>
  )
}
