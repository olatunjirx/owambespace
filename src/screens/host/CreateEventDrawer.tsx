import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'

import { eventPath } from './EventShell'
import { Combobox } from '../../components/Combobox'
import { Drawer } from '../../components/Drawer'
import { PillGroup } from '../../components/PillGroup'
import { commitOpenComboboxes } from '../../components/Combobox'
import { TextField } from '../../components/TextField'
import { buildChecklist } from '../../lib/checklist'
import { EVENT_TYPES, todayISO } from '../../lib/events'
import type { EventType } from '../../lib/events'
import { formatAmountInput, parseNaira } from '../../lib/money'
import { navigate } from '../../router/hashRouter'
import { useEvents } from '../../state/Events'
import './create-event.css'

type CreateEventDrawerProps = {
  open: boolean
  onClose: () => void
}

type Errors = {
  name?: string
  date?: string
  guests?: string
  state?: string
  budget?: string
}

/**
 * Creating an event, in a side panel rather than on its own page.
 *
 * The events list stays visible behind it, so starting an event never means
 * leaving the place you were — and abandoning it costs one Escape rather than
 * a back navigation. The checklist preview folds under the form here instead
 * of sitting beside it, because the panel is one column.
 */
export function CreateEventDrawer({ open, onClose }: CreateEventDrawerProps) {
  const { createEvent } = useEvents()

  const [name, setName] = useState('')
  const [type, setType] = useState<EventType>('Wedding')
  const [date, setDate] = useState('')
  const [guestEstimate, setGuestEstimate] = useState('')
  const [state, setState] = useState('')
  const [city, setCity] = useState('')
  const [budget, setBudget] = useState('')
  const [errors, setErrors] = useState<Errors>({})

  const checklist = useMemo(() => buildChecklist(type), [type])

  function clear(field: keyof Errors) {
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
  }

  function validate(): Errors {
    const next: Errors = {}

    if (name.trim().length < 2) next.name = 'Give the event a name you will recognise.'

    if (date) {
      const chosen = new Date(`${date}T00:00:00`)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (chosen < today) next.date = 'Pick a date that has not passed.'
    }

    const guests = Number(guestEstimate.replace(/\D/g, ''))
    if (!guests) next.guests = 'Roughly how many people are you expecting?'
    else if (guests > 100_000) next.guests = 'That is more than any venue on here holds.'

    if (!state) next.state = 'Where is it happening?'
    if (!parseNaira(budget)) next.budget = 'Put a number in, even a rough one.'

    return next
  }

  function handleSubmit(submitted: FormEvent<HTMLFormElement>): void {
    submitted.preventDefault()

    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const parsedBudget = parseNaira(budget)

    const created = createEvent({
      name: name.trim(),
      type,
      date,
      guestEstimate: Number(guestEstimate.replace(/\D/g, '')),
      state,
      city: city.trim(),
      budget: parsedBudget,
      // Rebuilt rather than reusing the preview, so the steps this form has
      // already handled arrive ticked off.
      checklist: buildChecklist(type, {
        date: Boolean(date),
        budget: parsedBudget > 0,
      }),
    })

    navigate(eventPath(created.id).replace(/^#/, ''))
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Plan a new event"
      subtitle="Six answers and you get a workspace with a checklist built for this kind of event."
      footer={
        <>
          <button type="button" className="button-neutral" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="create-event"
            className="button-primary"
            onPointerDown={() => commitOpenComboboxes()}
          >
            Create event
          </button>
        </>
      }
    >
      <form id="create-event" className="create__form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Event name"
          name="eventName"
          placeholder="Tolu & Ada's wedding"
          value={name}
          error={errors.name}
          onChange={(value) => {
            setName(value)
            clear('name')
          }}
        />

        <PillGroup
          label="What kind of event?"
          name="eventType"
          options={EVENT_TYPES}
          value={type}
          onChange={(value) => setType(value as EventType)}
        />

        <div className="create__row">
          <TextField
            label="Date"
            name="eventDate"
            type="date"
            min={todayISO()}
            value={date}
            error={errors.date}
            optional
            hint="Leave blank if you are still checking availability."
            onChange={(value) => {
              setDate(value)
              clear('date')
            }}
          />

          <TextField
            label="Guests you expect"
            name="guestEstimate"
            placeholder="250"
            value={guestEstimate}
            error={errors.guests}
            hint="An estimate is fine."
            onChange={(value) => {
              setGuestEstimate(formatAmountInput(value))
              clear('guests')
            }}
          />
        </div>

        <div className="create__row">
          <Combobox
            label="State"
            name="eventState"
            value={state}
            placeholder="Start typing a state"
            error={errors.state}
            onChange={(value) => {
              setState(value)
              clear('state')
            }}
          />

          <TextField
            label="Town or area"
            name="eventCity"
            placeholder="Lekki"
            value={city}
            optional
            onChange={setCity}
          />
        </div>

        <TextField
          label="Total budget"
          name="eventBudget"
          placeholder="5,000,000"
          suffix="₦"
          value={budget}
          error={errors.budget}
          hint="What you are willing to spend in total. Only you see this."
          onChange={(value) => {
            setBudget(formatAmountInput(value))
            clear('budget')
          }}
        />
      </form>

      <section className="create__preview" aria-live="polite">
        <h3 className="create__preview-title">
          Your checklist · {checklist.length} steps
        </h3>
        <p className="create__preview-hint">
          Built for a {type.toLowerCase()}. You can add your own and tick them
          off as you go.
        </p>

        {/*
          Keyed by type with no exit animation: the old list goes at once and
          the new one animates in, so two answers are never on screen while
          someone clicks through the options.
        */}
        <motion.ol
          key={type}
          className="create__checklist"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
          {checklist.map((item) => (
            <li className="create__checklist-item" key={item.id}>
              <span className="create__checklist-when">
                {item.weeksBefore >= 2 ? `${item.weeksBefore}w` : '1w'}
              </span>
              <span>
                <span className="create__checklist-label">{item.label}</span>
                <span className="create__checklist-note">{item.note}</span>
              </span>
            </li>
          ))}
        </motion.ol>
      </section>
    </Drawer>
  )
}
