import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { AuthLayout } from '../../components/AuthLayout'
import { Combobox } from '../../components/Combobox'
import { PrimaryButton } from '../../components/Buttons'
import { RoleCard } from '../../components/RoleCard'
import { SegmentedToggle } from '../../components/SegmentedToggle'
import { TextField } from '../../components/TextField'
import { DOOR_CHIP_LABELS, HERO_HEADLINES } from '../../lib/signupFlow'
import type { OperatingMode } from '../../lib/signupFlow'
import { findState } from '../../lib/nigeriaStates'
import { focusFirstInvalid, readFormValues, trimValues } from '../../lib/formValidation'
import { useSignupDraft } from '../../state/SignupDraft'

type WorkErrors = {
  companyName?: string
  location?: string
}

const MODE_OPTIONS = [
  { id: 'solo' as OperatingMode, label: 'On my own' },
  { id: 'company' as OperatingMode, label: 'As a company' },
]

type WorkDetailsScreenProps = {
  onNext: () => void
  onBack: () => void
  onChangeDoor: () => void
}

/**
 * Step 2 of the service door. The solo/company toggle swaps the fields rather
 * than showing both: a freelance MC has no RC number and should not be looking
 * at a field that implies they need one.
 */
export function WorkDetailsScreen({
  onNext,
  onBack,
  onChangeDoor,
}: WorkDetailsScreenProps) {
  const { draft, update } = useSignupDraft()
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<WorkErrors>({})

  const isCompany = draft.mode === 'company'

  function clearError(key: keyof WorkErrors): void {
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (!formRef.current) return

    const values = trimValues(readFormValues(formRef.current))
    const next: WorkErrors = {}

    // Only the company branch has a required name — a solo trading name is
    // genuinely optional, and demanding one turns people away.
    if (isCompany && (values.companyName ?? '').length < 2) {
      next.companyName = 'Tell us the registered company name.'
    }
    if (!findState(values.location ?? '')) {
      next.location = 'Choose a state from the list.'
    }

    setErrors(next)
    if (Object.keys(next).length > 0) {
      focusFirstInvalid(formRef.current, ['companyName', 'location'])
      return
    }

    update({
      tradingName: values.tradingName ?? '',
      companyName: values.companyName ?? '',
      rcNumber: values.rcNumber ?? '',
      location: values.location,
    })
    onNext()
  }

  return (
    <AuthLayout
      screenKey="work"
      headline={HERO_HEADLINES.service}
      eyebrow="Step 2 of 4"
      step={2}
      total={4}
      title="About your work"
      subtitle={`You told us you do ${draft.service.toLowerCase()}. Now the business behind it.`}
      onBack={onBack}
    >
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="signup__fields">
        <RoleCard label={DOOR_CHIP_LABELS.service} onChange={onChangeDoor} />

        <SegmentedToggle
          label="Tell us how you operate."
          name="mode"
          options={MODE_OPTIONS}
          value={draft.mode}
          onChange={(mode) => {
            update({ mode })
            setErrors({})
          }}
        />

        {/* Swapped, not stacked — the inactive branch's inputs leave the form
            entirely so they can never be read at submit. */}
        <AnimatePresence mode="wait" initial={false}>
          {isCompany ? (
            <motion.div
              key="company"
              className="signup__inputs"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <TextField
                label="Company name"
                name="companyName"
                placeholder="Enter your registered name"
                autoComplete="organization"
                value={draft.companyName}
                error={errors.companyName}
                onChange={(companyName) => {
                  update({ companyName })
                  clearError('companyName')
                }}
              />

              <TextField
                label="RC number"
                name="rcNumber"
                placeholder="RC 1234567"
                optional
                hint="You can add this later from your dashboard."
                value={draft.rcNumber}
                onChange={(rcNumber) => update({ rcNumber })}
              />
            </motion.div>
          ) : (
            <motion.div
              key="solo"
              className="signup__inputs"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <TextField
                label="Trading name"
                name="tradingName"
                placeholder="What clients call your business"
                optional
                hint="Leave this blank and we'll use your own name."
                value={draft.tradingName}
                onChange={(tradingName) => update({ tradingName })}
              />
            </motion.div>
          )}
        </AnimatePresence>

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
