import { useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { EventShell } from './EventShell'
import { PrimaryButton } from '../../components/Buttons'
import { Menu } from '../../components/Menu'
import { Modal } from '../../components/Modal'
import { RadioCardGroup } from '../../components/RadioCardGroup'
import addIcon from '../../assets/guests/add.svg'
import avatarImage from '../../assets/guests/avatar.svg'
import groupIcon from '../../assets/guests/group.svg'
import moreIcon from '../../assets/guests/more.svg'
import searchIcon from '../../assets/guests/search.svg'
import userAddIcon from '../../assets/guests/user-add.svg'
import userQuestionIcon from '../../assets/guests/user-question.svg'
import {
  RSVP_HINTS,
  RSVP_LABELS,
  RSVP_ORDER,
  guestEmail,
  guestPhone,
  guestTotals,
} from '../../lib/events'
import type { EventRecord, Guest, RsvpStatus } from '../../lib/events'
import { riseIn, softSpring } from '../../motion/variants'
import { useEvents } from '../../state/Events'
import './guests.css'
import './host.css'

type Filter = RsvpStatus | 'all'

type Dialog =
  | { kind: 'add' }
  | { kind: 'status'; guestId: string }
  | { kind: 'details'; guestId: string }
  | { kind: 'remove'; guestId: string }

const STATUS_TONE: Record<RsvpStatus, string> = {
  coming: 'tag--good',
  maybe: 'tag--warn',
  invited: 'tag--accent',
  waitlist: 'tag--muted',
  declined: 'tag--danger',
}

const SECTION_LABEL: Record<Filter, string> = {
  all: 'Everyone invited',
  coming: 'Going',
  maybe: 'Maybe',
  invited: 'Invited, no reply yet',
  waitlist: 'On the waitlist',
  declined: 'Not going',
}

function formatDay(iso: string | undefined): string {
  if (!iso) return 'Not recorded'
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function GuestsScreen({ event }: { event: EventRecord }) {
  const { setGuestStatus, removeGuest } = useEvents()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState<Dialog | null>(null)

  const totals = guestTotals(event.guests)
  const noAnswer = event.guests.filter((guest) => guest.status === 'invited').length
  const overEstimate = event.guestEstimate > 0 && totals.headCount > event.guestEstimate

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return event.guests.filter(
      (guest) =>
        (filter === 'all' || guest.status === filter) &&
        (!needle ||
          [guest.name, guestEmail(guest), guestPhone(guest)].some((field) =>
            field.toLowerCase().includes(needle),
          )),
    )
  }, [event.guests, filter, query])

  const target =
    dialog && dialog.kind !== 'add' ? event.guests.find((guest) => guest.id === dialog.guestId) : undefined
  const closeDialog = () => setDialog(null)

  return (
    <EventShell
      event={event}
      tab="guests"
      title="Guest list"
      subtitle="Add the names first. Invitations and RSVP tracking follow."
      actions={
        <button type="button" className="guests-add" onClick={() => setDialog({ kind: 'add' })}>
          <img src={addIcon} width={18} height={18} alt="" aria-hidden="true" />
          Add guest
        </button>
      }
    >
      <motion.div className="guest-stats" variants={riseIn}>
        <Stat icon={groupIcon} label="Heads confirmed" value={totals.headCount}>
          {totals.coming} going, including plus-ones
        </Stat>
        <Stat icon={userQuestionIcon} label="Awaiting reply" value={totals.awaiting}>
          {noAnswer} no answer · {totals.maybe} maybe
        </Stat>
        <Stat icon={userAddIcon} label="Guests invited" value={totals.invited}>
          {overEstimate
            ? `${totals.headCount - event.guestEstimate} heads over your estimate`
            : totals.waitlist > 0
              ? `${totals.waitlist} on the waitlist`
              : event.guestEstimate > 0
                ? `You estimated ${event.guestEstimate}`
                : 'Everyone on the list'}
        </Stat>
      </motion.div>

      {event.guests.length === 0 ? (
        <motion.div className="empty" variants={riseIn}>
          <p className="empty__title">No guests yet</p>
          <p className="empty__body">
            Start with the people you would call first. The head count here is what venues and
            caterers will ask you for.
          </p>
          <div className="empty__action">
            <button type="button" className="guests-add" onClick={() => setDialog({ kind: 'add' })}>
              <img src={addIcon} width={18} height={18} alt="" aria-hidden="true" />
              Add your first guest
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.section className="guest-board" variants={riseIn}>
          <div className="guest-toolbar">
            <label className="guest-search">
              <img src={searchIcon} width={16} height={16} alt="" aria-hidden="true" />
              <span className="sr-only">Search guests</span>
              <input
                type="search"
                value={query}
                placeholder="Search guest"
                onChange={(changed) => setQuery(changed.target.value)}
              />
            </label>

            <div className="guest-filters" role="tablist" aria-label="Filter by status">
              {(['all', ...RSVP_ORDER] as Filter[]).map((option) => {
                const count =
                  option === 'all'
                    ? event.guests.length
                    : event.guests.filter((guest) => guest.status === option).length
                const current = filter === option
                return (
                  <button
                    key={option}
                    type="button"
                    role="tab"
                    aria-selected={current}
                    className={`guest-filters__tab${current ? ' guest-filters__tab--on' : ''}`}
                    onClick={() => setFilter(option)}
                  >
                    {option === 'all' ? 'Everyone' : RSVP_LABELS[option]}
                    <span className="guest-filters__count">{count}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <p className="guest-section">{SECTION_LABEL[filter]}</p>

          {visible.length === 0 ? (
            <p className="guest-list__blank">
              {query.trim() ? `No guests match “${query.trim()}”.` : 'Nobody in this group yet.'}
            </p>
          ) : (
            <ul className="guest-list">
              <AnimatePresence initial={false}>
                {visible.map((guest) => (
                  <motion.li
                    key={guest.id}
                    className="guest"
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
                    transition={softSpring}
                  >
                    <img className="guest__avatar" src={avatarImage} width={40} height={40} alt="" />

                    <span className="guest__identity">
                      <span className="guest__name">
                        {guest.name}
                        {guest.plusOnes > 0 && <span className="guest__plus">+{guest.plusOnes}</span>}
                      </span>
                      {(guestEmail(guest) || guestPhone(guest)) && (
                        <span className="guest__contact">{guestEmail(guest) || guestPhone(guest)}</span>
                      )}
                    </span>

                    <span className={`tag ${STATUS_TONE[guest.status]}`}>{RSVP_LABELS[guest.status]}</span>

                    <Menu
                      label={`Actions for ${guest.name}`}
                      trigger={<img src={moreIcon} width={20} height={20} alt="" aria-hidden="true" />}
                      items={[
                        {
                          id: 'status',
                          label: 'Change status',
                          icon: <StatusGlyph />,
                          onSelect: () => setDialog({ kind: 'status', guestId: guest.id }),
                        },
                        {
                          id: 'details',
                          label: 'View details',
                          icon: <DetailsGlyph />,
                          onSelect: () => setDialog({ kind: 'details', guestId: guest.id }),
                        },
                        {
                          id: 'remove',
                          label: 'Remove guest',
                          icon: <RemoveGlyph />,
                          danger: true,
                          separated: true,
                          onSelect: () => setDialog({ kind: 'remove', guestId: guest.id }),
                        },
                      ]}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </motion.section>
      )}

      <AddGuestModal event={event} open={dialog?.kind === 'add'} onClose={closeDialog} />

      <StatusModal
        guest={dialog?.kind === 'status' ? target : undefined}
        onClose={closeDialog}
        onSave={(status) => {
          if (target) setGuestStatus(event.id, target.id, status)
          closeDialog()
        }}
      />

      <DetailsModal event={event} guest={dialog?.kind === 'details' ? target : undefined} onClose={closeDialog} />

      <Modal
        open={dialog?.kind === 'remove' && Boolean(target)}
        onClose={closeDialog}
        size="small"
        title={`Remove ${target?.name ?? 'guest'}?`}
        subtitle="They come off the guest list and the head count. This cannot be undone."
        footer={
          <>
            <button type="button" className="ghost-button" onClick={closeDialog}>
              Cancel
            </button>
            <button
              type="button"
              className="button-danger"
              onClick={() => {
                if (target) removeGuest(event.id, target.id)
                closeDialog()
                // The menu button that opened this is gone with the row.
                window.setTimeout(
                  () => document.querySelector<HTMLElement>('.guest-search input, .guests-add')?.focus(),
                  50,
                )
              }}
            >
              Remove guest
            </button>
          </>
        }
      />
    </EventShell>
  )
}

function Stat({ icon, label, value, children }: { icon: string; label: string; value: number; children: ReactNode }) {
  return (
    <div className="guest-stat">
      <div className="guest-stat__head">
        <span className="guest-stat__icon">
          <img src={icon} width={20} height={20} alt="" aria-hidden="true" />
        </span>
        <span className="guest-stat__label">{label}</span>
      </div>
      <span className="guest-stat__value">{value}</span>
      <span className="guest-stat__meta">{children}</span>
    </div>
  )
}

/* ── Status ───────────────────────────────────────────────── */

type StatusModalProps = {
  guest: Guest | undefined
  onClose: () => void
  onSave: (status: RsvpStatus) => void
}

function StatusModal({ guest, onClose, onSave }: StatusModalProps) {
  return (
    <Modal open={Boolean(guest)} onClose={onClose} title="Change status" subtitle={guest?.name}>
      {guest && <StatusPicker key={guest.id} guest={guest} onClose={onClose} onSave={onSave} />}
    </Modal>
  )
}

function StatusPicker({ guest, onClose, onSave }: StatusModalProps & { guest: Guest }) {
  const [choice, setChoice] = useState<RsvpStatus>(guest.status)

  return (
    <form
      onSubmit={(submitted) => {
        submitted.preventDefault()
        onSave(choice)
      }}
    >
      <RadioCardGroup
        legend={`Status for ${guest.name}`}
        name={`status-${guest.id}`}
        value={choice}
        onChange={(id) => setChoice(id as RsvpStatus)}
        options={RSVP_ORDER.map((status) => ({
          id: status,
          title: RSVP_LABELS[status],
          description: RSVP_HINTS[status],
        }))}
      />
      <div className="guest-form__actions">
        <button type="button" className="ghost-button" onClick={onClose}>
          Cancel
        </button>
        <PrimaryButton disabled={choice === guest.status}>Update status</PrimaryButton>
      </div>
    </form>
  )
}

/* ── Details and adding ───────────────────────────────────── */

type Draft = {
  name: string
  email: string
  phone: string
  plusOnes: string
  dietary: string
  note: string
}

function draftFor(guest?: Guest): Draft {
  return {
    name: guest?.name ?? '',
    email: guest ? guestEmail(guest) : '',
    phone: guest ? guestPhone(guest) : '',
    plusOnes: String(guest?.plusOnes ?? 0),
    dietary: guest?.dietary ?? '',
    note: guest?.note ?? '',
  }
}

/** Shared by adding and editing; returns an error message or the clean values. */
function validate(draft: Draft): string | Omit<Guest, 'id' | 'status'> {
  const name = draft.name.trim()
  const email = draft.email.trim()
  const phone = draft.phone.trim()
  if (name.length < 2) return 'Add the guest’s name.'
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'That email does not look right.'
  return {
    name,
    email,
    phone,
    contact: email || phone,
    plusOnes: Math.max(0, Math.min(10, Number(draft.plusOnes) || 0)),
    dietary: draft.dietary.trim(),
    note: draft.note.trim(),
  }
}

function GuestFields({ draft, onChange }: { draft: Draft; onChange: (patch: Partial<Draft>) => void }) {
  return (
    <div className="guest-form">
      <label className="guest-form__field guest-form__field--wide">
        <span className="filters__label">Full name</span>
        <input
          className="filters__input"
          value={draft.name}
          placeholder="Aunty Bisi Adeyemi"
          onChange={(changed) => onChange({ name: changed.target.value })}
        />
      </label>
      <label className="guest-form__field">
        <span className="filters__label">Email</span>
        <input
          className="filters__input"
          type="email"
          value={draft.email}
          placeholder="Optional"
          onChange={(changed) => onChange({ email: changed.target.value })}
        />
      </label>
      <label className="guest-form__field">
        <span className="filters__label">Phone</span>
        <input
          className="filters__input"
          type="tel"
          value={draft.phone}
          placeholder="Optional"
          onChange={(changed) => onChange({ phone: changed.target.value })}
        />
      </label>
      <label className="guest-form__field">
        <span className="filters__label">Plus-ones</span>
        <input
          className="filters__input"
          type="number"
          min={0}
          max={10}
          value={draft.plusOnes}
          onChange={(changed) => onChange({ plusOnes: changed.target.value })}
        />
      </label>
      <label className="guest-form__field">
        <span className="filters__label">Dietary needs</span>
        <input
          className="filters__input"
          value={draft.dietary}
          placeholder="Vegetarian, no pork…"
          onChange={(changed) => onChange({ dietary: changed.target.value })}
        />
      </label>
      <label className="guest-form__field guest-form__field--wide">
        <span className="filters__label">Note</span>
        <textarea
          className="filters__input guest-form__note"
          value={draft.note}
          rows={2}
          placeholder="Seat with the family, arriving late…"
          onChange={(changed) => onChange({ note: changed.target.value })}
        />
      </label>
    </div>
  )
}

function FormError({ message }: { message: string }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          className="form-error"
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

function DetailsModal({ event, guest, onClose }: { event: EventRecord; guest: Guest | undefined; onClose: () => void }) {
  return (
    <Modal open={Boolean(guest)} onClose={onClose} title="Guest details" subtitle={guest?.name}>
      {guest && <DetailsForm key={guest.id} event={event} guest={guest} onClose={onClose} />}
    </Modal>
  )
}

function DetailsForm({ event, guest, onClose }: { event: EventRecord; guest: Guest; onClose: () => void }) {
  const { updateGuest } = useEvents()
  const [draft, setDraft] = useState(() => draftFor(guest))
  const [error, setError] = useState('')

  function save(submitted: FormEvent<HTMLFormElement>): void {
    submitted.preventDefault()
    const result = validate(draft)
    if (typeof result === 'string') {
      setError(result)
      return
    }
    updateGuest(event.id, guest.id, result)
    onClose()
  }

  return (
    <form onSubmit={save} noValidate>
      <section className="guest-registration" aria-label="Registration">
        <h3 className="guest-registration__title">Registration</h3>
        <dl>
          <div>
            <dt>Status</dt>
            <dd>
              <span className={`tag ${STATUS_TONE[guest.status]}`}>{RSVP_LABELS[guest.status]}</span>
              {guest.statusISO && (
                <span className="guest-registration__since">since {formatDay(guest.statusISO)}</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Registered</dt>
            <dd>{formatDay(guest.addedISO)}</dd>
          </div>
          <div>
            <dt>Added by</dt>
            <dd>{guest.source === 'rsvp' ? 'Guest, through the RSVP link' : 'You'}</dd>
          </div>
          <div>
            <dt>Party size</dt>
            <dd>
              {1 + guest.plusOnes} {guest.plusOnes === 0 ? 'person' : 'people'}
            </dd>
          </div>
        </dl>
      </section>

      <GuestFields
        draft={draft}
        onChange={(patch) => {
          setDraft((current) => ({ ...current, ...patch }))
          setError('')
        }}
      />
      <FormError message={error} />

      <div className="guest-form__actions">
        <button type="button" className="ghost-button" onClick={onClose}>
          Cancel
        </button>
        <PrimaryButton>Save changes</PrimaryButton>
      </div>
    </form>
  )
}

function AddGuestModal({ event, open, onClose }: { event: EventRecord; open: boolean; onClose: () => void }) {
  const { addGuest } = useEvents()
  const [draft, setDraft] = useState(() => draftFor())
  const [status, setStatus] = useState<RsvpStatus>('invited')
  const [error, setError] = useState('')
  const [added, setAdded] = useState('')

  function close(): void {
    setDraft(draftFor())
    setStatus('invited')
    setError('')
    setAdded('')
    onClose()
  }

  function add(submitted: FormEvent<HTMLFormElement>): void {
    submitted.preventDefault()
    const result = validate(draft)
    if (typeof result === 'string') {
      setError(result)
      return
    }
    addGuest(event.id, { ...result, status })
    // Stays open: a host adds names in a run, not one at a time.
    setAdded(result.name)
    setDraft(draftFor())
    setError('')
    window.setTimeout(() => document.querySelector<HTMLInputElement>('.modal .guest-form input')?.focus(), 0)
  }

  return (
    <Modal open={open} onClose={close} title="Add guest" subtitle="Add as many as you like. Each one is saved as you go.">
      <form onSubmit={add} noValidate>
        <GuestFields
          draft={draft}
          onChange={(patch) => {
            setDraft((current) => ({ ...current, ...patch }))
            setError('')
            setAdded('')
          }}
        />

        <label className="guest-form__field guest-form__status">
          <span className="filters__label">Status</span>
          <select
            className="filters__input"
            value={status}
            onChange={(changed) => setStatus(changed.target.value as RsvpStatus)}
          >
            {RSVP_ORDER.map((option) => (
              <option key={option} value={option}>
                {RSVP_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <FormError message={error} />
        {added && (
          <p className="guest-form__added" role="status">
            Added {added}. Add the next one, or close when you are done.
          </p>
        )}

        <div className="guest-form__actions">
          <button type="button" className="ghost-button" onClick={close}>
            {added ? 'Done' : 'Cancel'}
          </button>
          <PrimaryButton>Add guest</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}

/* ── Menu glyphs ──────────────────────────────────────────── */

function StatusGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M5.5 8.2 7.2 9.8 10.6 6.4" />
    </svg>
  )
}

function DetailsGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="10" rx="2" />
      <circle cx="6" cy="7.2" r="1.6" />
      <path d="M3.8 11c.5-1.2 1.3-1.8 2.2-1.8s1.7.6 2.2 1.8M10 6.5h2.2M10 9h2.2" />
    </svg>
  )
}

function RemoveGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.8 4.5h10.4M6.3 4.5V3.2h3.4v1.3M4.2 4.5l.6 8.3h6.4l.6-8.3M6.8 7v3.6M9.2 7v3.6" />
    </svg>
  )
}
