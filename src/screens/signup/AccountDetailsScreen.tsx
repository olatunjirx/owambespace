import { useRef, useState } from 'react'
import type { FormEvent } from 'react'

import type { SubmitState } from '../../components/Buttons'
import { AuthLayout } from '../../components/AuthLayout'
import { Divider, GoogleButton, PrimaryButton } from '../../components/Buttons'
import { IdentifierField } from '../../components/IdentifierField'
import { PasswordField } from '../../components/PasswordField'
import { RoleCard } from '../../components/RoleCard'
import { TextField } from '../../components/TextField'
import { DOOR_CHIP_LABELS, HERO_HEADLINES, stepTotal } from '../../lib/signupFlow'
import { isValidIdentifier } from '../../lib/identifier'
import { focusFirstInvalid, readFormValues, trimValues } from '../../lib/formValidation'
import { googleAuth } from '../../services/authService'
import { useSignupDraft } from '../../state/SignupDraft'

type AccountErrors = {
  fullName?: string
  identifier?: string
  password?: string
}

const ACCOUNT_FIELD_ORDER = ['fullName', 'identifier', 'password']

type AccountDetailsScreenProps = {
  onNext: (viaGoogle: boolean) => Promise<'ok' | 'taken'>
  onBack: () => void
  onChangeDoor: () => void
}

/**
 * The person, on every door. Google lives only here, because it substitutes
 * for the email and password below it — offering it on a business-info screen
 * would imply it could fill in a venue name.
 */
export function AccountDetailsScreen({
  onNext,
  onBack,
  onChangeDoor,
}: AccountDetailsScreenProps) {
  const { draft, update } = useSignupDraft()
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<AccountErrors>({})
  const [googleBusy, setGoogleBusy] = useState(false)
  const [status, setStatus] = useState<SubmitState>('idle')

  const door = draft.door ?? 'host'
  const total = stepTotal(door)
  const step = total - 1
  const isHost = door === 'host'

  function clearError(key: keyof AccountErrors): void {
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current))
  }

  function showTaken(): void {
    setErrors({
      identifier: 'That account already exists. Sign in instead, or use another email or phone.',
    })
    if (formRef.current) focusFirstInvalid(formRef.current, ['identifier'])
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!formRef.current || status !== 'idle') return

    const values = trimValues(readFormValues(formRef.current))
    const next: AccountErrors = {}

    if ((values.fullName ?? '').length < 2) {
      next.fullName = 'Tell us the name you want on your bookings.'
    }
    if (!isValidIdentifier(values.identifier ?? '')) {
      next.identifier = 'Enter a valid email address or Nigerian phone number.'
    }
    // Password is not trimmed for length — a leading space is a character.
    const password = readFormValues(formRef.current).password ?? ''
    if (password.length < 8) {
      next.password = 'Use at least 8 characters.'
    }

    setErrors(next)
    if (Object.keys(next).length > 0) {
      focusFirstInvalid(formRef.current, ACCOUNT_FIELD_ORDER)
      return
    }

    update({
      fullName: values.fullName,
      identifier: values.identifier,
      password,
      googleVerified: false,
    })

    setStatus('loading')
    const result = await onNext(false)
    setStatus('idle')
    if (result === 'taken') showTaken()
  }

  async function handleGoogle(): Promise<void> {
    setGoogleBusy(true)
    const profile = await googleAuth()
    setGoogleBusy(false)
    // Google has already proved the address, so this skips the OTP screen.
    update({
      fullName: profile.name,
      identifier: profile.email,
      password: '',
      googleVerified: true,
    })
    const result = await onNext(true)
    if (result === 'taken') showTaken()
  }

  return (
    <AuthLayout
      screenKey="account"
      headline={HERO_HEADLINES[door]}
      eyebrow={`Step ${step} of ${total}`}
      step={step}
      total={total}
      title={isHost ? 'Create your account' : 'Your contact details'}
      subtitle={
        isHost
          ? "Three details, then we'll get you planning."
          : "Now the person behind the business — this is how you'll sign in."
      }
      onBack={onBack}
      footer={
        <p className="signup__legal">
          By continuing you agree to our <a href="#/terms">Terms</a> and{' '}
          <a href="#/privacy">Privacy Policy</a>.
        </p>
      }
    >
      <form
        ref={formRef}
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        className="signup__fields"
      >
        <RoleCard label={DOOR_CHIP_LABELS[door]} onChange={onChangeDoor} />

        <div className="signup__inputs">
          <GoogleButton onClick={handleGoogle} busy={googleBusy} label="Sign up with Google" />
          <Divider label="or" />

          <div className="signup__inputs">
            <TextField
              label="Full name"
              name="fullName"
              placeholder="Enter your full name"
              autoComplete="name"
              value={draft.fullName}
              error={errors.fullName}
              onChange={(fullName) => {
                update({ fullName })
                clearError('fullName')
              }}
            />

            <IdentifierField
              value={draft.identifier}
              error={errors.identifier}
              onChange={(identifier) => {
                update({ identifier })
                clearError('identifier')
              }}
            />

            <PasswordField
              label="Password"
              value={draft.password}
              error={errors.password}
              onChange={(password) => {
                update({ password })
                clearError('password')
              }}
            />
          </div>
        </div>

        <div className="signup__actions">
          <PrimaryButton state={status} loadingLabel="Creating your account…">
            Continue
          </PrimaryButton>
        </div>
      </form>
    </AuthLayout>
  )
}
