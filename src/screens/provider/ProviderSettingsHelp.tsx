import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { motion } from 'framer-motion'

import { TextField } from '../../components/TextField'
import { Switch } from '../owner/OwnerFields'
import { ProviderShell } from './ProviderShell'
import { PLATFORM_FEE_PERCENT } from '../../lib/owner'
import type { OperatingMode } from '../../lib/signupFlow'
import { riseIn } from '../../motion/variants'
import { useProfile } from '../../state/Profile'
import { useProvider } from '../../state/Provider'

export type SettingsTab = 'you' | 'business' | 'notifications'

const TABS: { id: SettingsTab; label: string; icon: ReactNode }[] = [
  {
    id: 'you',
    label: 'You',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="5.5" r="2.75" stroke="currentColor" strokeWidth="1.2" />
        <path d="M2.75 13.5c.6-2.4 2.7-3.75 5.25-3.75s4.65 1.35 5.25 3.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'business',
    label: 'Business',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="4.5" width="12" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5.75 4.5V3.4c0-.5.4-.9.9-.9h2.7c.5 0 .9.4.9.9v1.1M2 8.25h12" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M4 11.5V7.25a4 4 0 1 1 8 0v4.25l1 1H3l1-1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M6.5 14h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
]

/**
 * Settings, laid out as Figma's owner Settings (1129:31046–31151): a "Your
 * details" menu on the left and one panel on the right. You and Business are
 * forms with Cancel / Save; notification switches save as they're flipped.
 */
export function ProviderSettings({ tab = 'you' }: { tab?: SettingsTab }) {
  return (
    <ProviderShell section="settings" pageKey="provider-settings" title="Settings" subtitle="Your details, your business and how we reach you.">
      <motion.div className="pset" variants={riseIn}>
        <nav className="pset__tabs" aria-label="Settings sections">
          <p className="pset__tabs-label">Your details</p>
          {TABS.map((entry) => (
            <a
              key={entry.id}
              className={`pset__tab${entry.id === tab ? ' pset__tab--current' : ''}`}
              href={`#/provider/settings/${entry.id}`}
              aria-current={entry.id === tab ? 'page' : undefined}
            >
              {entry.icon}
              {entry.label}
            </a>
          ))}
        </nav>
        <div key={tab}>
          {tab === 'you' && <YouPanel />}
          {tab === 'business' && <BusinessPanel />}
          {tab === 'notifications' && <NotificationsPanel />}
        </div>
      </motion.div>
    </ProviderShell>
  )
}

/** Cancel/Save row shared by the form panels (Figma Frame 15990). */
function FormActions({ dirty, saved, onCancel }: { dirty: boolean; saved: boolean; onCancel: () => void }) {
  return (
    <div className="pset__actions">
      {saved && !dirty && (
        <span className="pset__saved" role="status">
          Saved
        </span>
      )}
      <button type="button" className="pbtn" onClick={onCancel} disabled={!dirty}>
        Cancel
      </button>
      <button type="submit" className="pbtn-primary" disabled={!dirty}>
        Save
      </button>
    </div>
  )
}

function YouPanel() {
  const { profile, update } = useProfile()
  const { state, updateBusiness } = useProvider()
  const initial = {
    name: profile.displayName,
    phone: state.business.phone,
    email: state.business.email,
    avatar: state.business.avatar,
  }
  const [draft, setDraft] = useState(initial)
  const [saved, setSaved] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)

  function save(event: FormEvent): void {
    event.preventDefault()
    update({ displayName: draft.name.trim() })
    updateBusiness({ phone: draft.phone.trim(), email: draft.email.trim(), avatar: draft.avatar })
    setSaved(true)
  }

  function pickPhoto(file: File | undefined): void {
    if (!file) return
    // Downscaled so it fits in local storage; a backend would take the original.
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 176
        canvas.width = size
        canvas.height = size
        const scale = Math.max(size / image.width, size / image.height)
        const context = canvas.getContext('2d')
        if (!context) return
        context.drawImage(image, (size - image.width * scale) / 2, (size - image.height * scale) / 2, image.width * scale, image.height * scale)
        setDraft((current) => ({ ...current, avatar: canvas.toDataURL('image/jpeg', 0.85) }))
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <form className="pset__panel" onSubmit={save} noValidate>
      <h2 className="pset__title">About me</h2>
      <label className="pavatar" style={draft.avatar ? { backgroundImage: `url(${draft.avatar})`, borderStyle: 'solid' } : undefined}>
        <input type="file" accept="image/*" className="sr-only" onChange={(event) => pickPhoto(event.target.files?.[0])} />
        {!draft.avatar && (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        )}
        <span className="pavatar__edit" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7.5 2.5 9.5 4.5 4 10H2V8l5.5-5.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="sr-only">Upload a profile photo</span>
      </label>
      <div className="pset__fields">
        <TextField
          label="Full name"
          name="providerFullName"
          autoComplete="name"
          placeholder="Your full name"
          value={draft.name}
          onChange={(name) => {
            setDraft((current) => ({ ...current, name }))
            setSaved(false)
          }}
        />
        <div className="field">
          <label className="field__label" htmlFor="provider-phone">
            Phone
          </label>
          <div className="pphone">
            <span className="pphone__code">
              <span className="pphone__flag" aria-hidden="true" />
              +234
            </span>
            <input
              id="provider-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="0803 000 0000"
              value={draft.phone}
              onChange={(event) => {
                setDraft((current) => ({ ...current, phone: event.target.value }))
                setSaved(false)
              }}
            />
          </div>
        </div>
        <TextField
          label="Email"
          name="providerEmail"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={draft.email}
          onChange={(email) => {
            setDraft((current) => ({ ...current, email }))
            setSaved(false)
          }}
        />
      </div>
      <FormActions dirty={dirty} saved={saved} onCancel={() => setDraft(initial)} />
    </form>
  )
}

function BusinessPanel() {
  const { state, listing, updateBusiness, updateListing } = useProvider()
  const initial = {
    mode: state.business.mode,
    tradingName: listing.name,
    companyName: state.business.companyName,
    rcNumber: state.business.rcNumber,
  }
  const [draft, setDraft] = useState(initial)
  const [saved, setSaved] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const company = draft.mode === 'company'

  function set(patch: Partial<typeof draft>): void {
    setDraft((current) => ({ ...current, ...patch }))
    setSaved(false)
  }

  function save(event: FormEvent): void {
    event.preventDefault()
    updateBusiness({ mode: draft.mode, companyName: draft.companyName.trim(), rcNumber: draft.rcNumber.trim() })
    if (!company && draft.tradingName.trim()) updateListing({ name: draft.tradingName.trim() })
    setSaved(true)
  }

  return (
    <form className="pset__panel" onSubmit={save} noValidate>
      <h2 className="pset__title">Business</h2>
      <div className="pset__fields">
        <div className="field">
          <span className="field__label">You operate as</span>
          <div className="pchoice" role="group" aria-label="You operate as">
            <button type="button" aria-pressed={!company} onClick={() => set({ mode: 'solo' as OperatingMode })}>
              An individual
            </button>
            <button type="button" aria-pressed={company} onClick={() => set({ mode: 'company' as OperatingMode })}>
              A registered company
            </button>
          </div>
        </div>
        {company ? (
          <>
            <TextField
              label="Registered company name"
              name="providerCompany"
              autoComplete="organization"
              placeholder="As on your CAC certificate"
              value={draft.companyName}
              onChange={(companyName) => set({ companyName })}
            />
            <TextField
              label="CAC RC number"
              name="providerRc"
              placeholder="RC 123456"
              value={draft.rcNumber}
              onChange={(rcNumber) => set({ rcNumber })}
            />
          </>
        ) : (
          <TextField
            label="Trading name"
            name="providerTrading"
            placeholder="What clients call your business"
            hint="This is the name hosts see on your profile."
            value={draft.tradingName}
            onChange={(tradingName) => set({ tradingName })}
          />
        )}
      </div>
      <FormActions dirty={dirty} saved={saved} onCancel={() => setDraft(initial)} />
    </form>
  )
}

function NotificationsPanel() {
  const { state, setPref } = useProvider()
  const { prefs } = state
  return (
    <div className="pset__panel">
      <h2 className="pset__title">Notifications</h2>
      <div className="pswitch-list">
        <Switch
          label="New bookings by SMS"
          description="A text the moment a host books a package."
          checked={prefs.bookingSms}
          onChange={(on) => setPref('bookingSms', on)}
        />
        <Switch label="New bookings by email" checked={prefs.bookingEmail} onChange={(on) => setPref('bookingEmail', on)} />
        <Switch
          label="WhatsApp updates"
          description="New bookings, messages from hosts and payout confirmations."
          checked={prefs.whatsapp}
          onChange={(on) => setPref('whatsapp', on)}
        />
        <Switch
          label="Weekly summary"
          description="Monday morning: the week’s jobs, open weekend dates and earnings."
          checked={prefs.weeklySummary}
          onChange={(on) => setPref('weeklySummary', on)}
        />
      </div>
    </div>
  )
}

const TOPICS: { title: string; questions: { q: string; a: string }[] }[] = [
  {
    title: 'Your profile and packages',
    questions: [
      {
        q: 'Why packages instead of quotes?',
        a: 'Hosts book and pay straight away, the same as booking a venue. A quote needs a conversation first, and on Owambe Space chat only opens once a host has paid — that is what keeps both of you protected.',
      },
      {
        q: 'What if an event needs something custom?',
        a: 'Make your packages cover what most hosts ask for. Once a host has booked and paid, you can agree the details — menu, colours, timings — in the booking chat.',
      },
      {
        q: 'How long does review take?',
        a: 'Usually within 24 hours. Edits to a live profile show straight away.',
      },
    ],
  },
  {
    title: 'Bookings and chat',
    questions: [
      {
        q: 'Do I have to approve bookings?',
        a: 'No. Every provider is instant book. Close dates you can’t do on your calendar, and set how many events you can cover on one day.',
      },
      {
        q: 'When can a host message me?',
        a: 'Only after they have paid. Chat opens on the booking, closes if it is cancelled and goes read-only 3 days after the event. Phone numbers, emails, links and social handles are blocked.',
      },
    ],
  },
  {
    title: 'Money',
    questions: [
      {
        q: 'What does it cost?',
        a: `Listing is free. We take ${PLATFORM_FEE_PERCENT}% of each completed booking.`,
      },
      {
        q: 'When do I get paid?',
        a: 'The deposit is held in escrow from the moment the host books. Everything is released 24 hours after the event, and you can withdraw any time.',
      },
      {
        q: 'What if I need to cancel?',
        a: `The host is refunded in full and ${PLATFORM_FEE_PERCENT}% of the booking comes out of your next payout. A second cancellation in 12 months lowers your ranking and a third suspends your profile. Emergencies go through support with no penalty.`,
      },
    ],
  },
]

export function ProviderHelp() {
  return (
    <ProviderShell section="help" pageKey="provider-help" title="Help" subtitle="Answers to what service providers ask most.">
      {TOPICS.map((topic) => (
        <motion.section key={topic.title} className="card help-topic" variants={riseIn}>
          <h2 className="card__title">{topic.title}</h2>
          <div className="help-topic__list">
            {topic.questions.map((entry) => (
              <details key={entry.q} className="help-q">
                <summary>{entry.q}</summary>
                <p>{entry.a}</p>
              </details>
            ))}
          </div>
        </motion.section>
      ))}
    </ProviderShell>
  )
}
