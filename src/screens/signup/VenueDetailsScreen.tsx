import { useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { AuthLayout } from '../../components/AuthLayout'
import { Combobox } from '../../components/Combobox'
import { PillGroup } from '../../components/PillGroup'
import { PrimaryButton } from '../../components/Buttons'
import { RoleCard } from '../../components/RoleCard'
import { TextField } from '../../components/TextField'
import { DOOR_CHIP_LABELS, HERO_HEADLINES, SPACE_TYPES } from '../../lib/signupFlow'
import { findState } from '../../lib/nigeriaStates'
import { focusFirstInvalid, readFormValues, trimValues } from '../../lib/formValidation'
import { useSignupDraft } from '../../state/SignupDraft'

type VenueErrors = {
  venueName?: string
  spaceType?: string
  location?: string
}

const VENUE_FIELD_ORDER = ['venueName', 'spaceType', 'location']

type VenueDetailsScreenProps = {
  onNext: () => void
  onBack: () => void
  onChangeDoor: () => void
}

/** Step 2 of the venue door — the business, kept apart from the person. */
export function VenueDetailsScreen({
  onNext,
  onBack,
  onChangeDoor,
}: VenueDetailsScreenProps) {
  const { draft, update } = useSignupDraft()
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<VenueErrors>({})

  function clearError(key: keyof VenueErrors): void {
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (!formRef.current) return

    const values = trimValues(readFormValues(formRef.current))
    const next: VenueErrors = {}

    if ((values.venueName ?? '').length < 2) {
      next.venueName = 'Tell us what the venue is called.'
    }
    if (!values.spaceType) {
      next.spaceType = 'Pick the kind of space this is.'
    }
    // Free text that is not a real state is rejected here, not silently kept.
    if (!findState(values.location ?? '')) {
      next.location = 'Choose a state from the list.'
    }

    setErrors(next)
    if (Object.keys(next).length > 0) {
      focusFirstInvalid(formRef.current, VENUE_FIELD_ORDER)
      return
    }

    // Commit the DOM's values, which may differ from state after autofill.
    update({
      venueName: values.venueName,
      spaceType: values.spaceType,
      location: values.location,
    })
    onNext()
  }

  return (
    <AuthLayout
      screenKey="venue"
      headline={HERO_HEADLINES.venue}
      eyebrow="Step 2 of 4"
      step={2}
      total={4}
      title="About your venue"
      subtitle="The business first — the full listing comes later."
      onBack={onBack}
    >
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="signup__fields">
        <RoleCard label={DOOR_CHIP_LABELS.venue} onChange={onChangeDoor} />

        <TextField
          label="Venue name"
          name="venueName"
          placeholder="Enter your venue name"
          autoComplete="organization"
          value={draft.venueName}
          error={errors.venueName}
          onChange={(venueName) => {
            update({ venueName })
            clearError('venueName')
          }}
        />

        <PillGroup
          label="What kind of space is it?"
          name="spaceType"
          options={SPACE_TYPES}
          value={draft.spaceType}
          onChange={(spaceType) => {
            update({ spaceType })
            clearError('spaceType')
          }}
          error={errors.spaceType}
        />

        <Combobox
          label="Location"
          name="location"
          value={draft.location}
          onChange={(location) => {
            update({ location })
            clearError('location')
          }}
          hint="Available in all 36 states and the FCT."
          error={errors.location}
        />

        <div className="signup__actions">
          <PrimaryButton>Continue</PrimaryButton>
        </div>
      </form>
    </AuthLayout>
  )
}
