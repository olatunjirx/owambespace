import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { AuthLayout } from '../../components/AuthLayout'
import { PillGroup } from '../../components/PillGroup'
import { PrimaryButton } from '../../components/Buttons'
import { RadioCardGroup } from '../../components/RadioCardGroup'
import { DOOR_OPTIONS, HERO_HEADLINES, PLANNING_SERVICE, VENDOR_CATEGORIES, stepTotal } from '../../lib/signupFlow'
import type { Door } from '../../lib/signupFlow'
import { readFormValues } from '../../lib/formValidation'
import { useSignupDraft } from '../../state/SignupDraft'
import { collapse } from '../../motion/variants'

type ChooseTypeScreenProps = {
  onNext: () => void
}

/**
 * Screen 1 for every door. Choosing "I offer a service" reveals the service
 * picker in place rather than pushing a fourth screen — the choice of service
 * is what decides planner vs vendor, so it belongs with the door.
 */
export function ChooseTypeScreen({ onNext }: ChooseTypeScreenProps) {
  const { draft, update } = useSignupDraft()
  const formRef = useRef<HTMLFormElement>(null)
  const [serviceError, setServiceError] = useState('')

  const door = draft.door
  // Before a door is picked the shortest flow is the honest default; it only
  // changes in response to the user's own selection, never between screens.
  const total = stepTotal(door ?? 'host')

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (!formRef.current || !door) return

    // Read the DOM rather than state — see lib/formValidation.
    const values = readFormValues(formRef.current)
    const chosenDoor = (values.door as Door) ?? door
    const chosenService = values.service ?? draft.service

    if (chosenDoor === 'service' && !chosenService) {
      setServiceError('Pick the service you mainly offer.')
      document
        .querySelector('.pill-group')
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }

    setServiceError('')
    update({ door: chosenDoor, service: chosenDoor === 'service' ? chosenService : '' })
    onNext()
  }

  return (
    <AuthLayout
      screenKey="type"
      headline={HERO_HEADLINES[door ?? 'host']}
      eyebrow={`Step 1 of ${total}`}
      step={1}
      total={total}
      title="What brings you to Owambe Space?"
      subtitle="Pick one. We'll only ask for what your account actually needs."
      footer={
        <p className="signup__alt">
          Already have an account? <a href="#/signin">Sign in</a>
        </p>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="signup__fields">
        <RadioCardGroup
          legend="What brings you to Owambe Space?"
          name="door"
          options={DOOR_OPTIONS}
          value={door}
          onChange={(id) => {
            update({ door: id as Door })
            setServiceError('')
          }}
        />

        {/* Unmounted rather than hidden: the service radios must not be part
            of the form at all when another door is selected. */}
        <AnimatePresence initial={false}>
          {door === 'service' && (
            <motion.div
              variants={collapse}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <PillGroup
                label="What kind of service do you offer?"
                name="service"
                options={VENDOR_CATEGORIES}
                featured={PLANNING_SERVICE}
                featuredHint="Planners coordinate the whole event and hire other vendors."
                value={draft.service}
                onChange={(service) => {
                  update({ service })
                  setServiceError('')
                }}
                error={serviceError}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="signup__actions">
          <PrimaryButton disabled={!door}>Continue</PrimaryButton>
        </div>
      </form>
    </AuthLayout>
  )
}
