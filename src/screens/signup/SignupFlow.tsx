import { useCallback, useEffect } from 'react'

import { AccountDetailsScreen } from './AccountDetailsScreen'
import { ChooseTypeScreen } from './ChooseTypeScreen'
import { VenueDetailsScreen } from './VenueDetailsScreen'
import { VerifiedScreen } from './VerifiedScreen'
import { VerifyScreen } from './VerifyScreen'
import { WorkDetailsScreen } from './WorkDetailsScreen'
import { DOOR_STEPS, roleForDraft } from '../../lib/signupFlow'
import type { StepId } from '../../lib/signupFlow'
import { createAccount } from '../../services/authService'
import { navigate } from '../../router/hashRouter'
import { useSignupDraft } from '../../state/SignupDraft'

/** Every signup route, in the order the hash router will see them. */
export const SIGNUP_ROUTES: Record<string, StepId | 'verified'> = {
  '/signup': 'type',
  '/signup/venue': 'venue',
  '/signup/work': 'work',
  '/signup/account': 'account',
  '/signup/verify': 'verify',
  '/signup/verified': 'verified',
}

const STEP_PATHS: Record<StepId, string> = {
  type: '/signup',
  venue: '/signup/venue',
  work: '/signup/work',
  account: '/signup/account',
  verify: '/signup/verify',
}

type SignupFlowProps = {
  step: StepId | 'verified'
}

/**
 * Owns the step sequence. The screens themselves never decide what comes
 * next — they call onNext, and the door's fixed step list decides where that
 * lands, which is what keeps the venue and service flows four screens long
 * however much the user backtracks.
 */
export function SignupFlow({ step }: SignupFlowProps) {
  const { draft, update } = useSignupDraft()
  const door = draft.door

  // Deep-linking past screen 1 without a door would render an empty flow.
  useEffect(() => {
    if (!door && step !== 'type') navigate('/signup', true)
  }, [door, step])

  const go = useCallback(
    (target: StepId) => navigate(STEP_PATHS[target]),
    [],
  )

  const nextAfter = useCallback(
    (current: StepId): StepId | null => {
      if (!door) return null
      const steps = DOOR_STEPS[door]
      const index = steps.indexOf(current)
      return index >= 0 && index < steps.length - 1 ? steps[index + 1] : null
    },
    [door],
  )

  const previousBefore = useCallback(
    (current: StepId): StepId | null => {
      if (!door) return null
      const steps = DOOR_STEPS[door]
      const index = steps.indexOf(current)
      return index > 0 ? steps[index - 1] : null
    },
    [door],
  )

  const back = useCallback(
    (current: StepId) => {
      const target = previousBefore(current)
      if (target) go(target)
    },
    [go, previousBefore],
  )

  const changeDoor = useCallback(() => navigate('/signup'), [])

  /** Creates the account, then either verifies or skips straight past it. */
  const finishAccountStep = useCallback(
    async (viaGoogle: boolean): Promise<'ok' | 'taken'> => {
      if (!door) return 'ok'
      const values = { ...draft, googleVerified: viaGoogle }
      const role = roleForDraft(door, values.service)

      const result = await createAccount({
        fullName: values.fullName,
        identifier: values.identifier,
        password: values.password,
        role,
        viaGoogle,
        profile: {
          venueName: values.venueName,
          spaceType: values.spaceType,
          tradingName: values.tradingName,
          companyName: values.companyName,
          rcNumber: values.rcNumber,
          location: values.location,
          service: values.service,
          mode: values.mode,
        },
      })

      // An identifier already on file is the one failure the user can act
      // on, so it goes back to the field rather than through to verify.
      if (!result.ok) return 'taken'

      // A Google address is already proven, so the OTP screen is skipped.
      if (viaGoogle) navigate('/signup/verified')
      else go('verify')
      return 'ok'
    },
    [door, draft, go],
  )

  if (step === 'type') {
    return (
      <ChooseTypeScreen
        onNext={() => {
          const target = nextAfter('type')
          if (target) go(target)
        }}
      />
    )
  }

  if (step === 'venue') {
    return (
      <VenueDetailsScreen
        onNext={() => {
          const target = nextAfter('venue')
          if (target) go(target)
        }}
        onBack={() => back('venue')}
        onChangeDoor={changeDoor}
      />
    )
  }

  if (step === 'work') {
    return (
      <WorkDetailsScreen
        onNext={() => {
          const target = nextAfter('work')
          if (target) go(target)
        }}
        onBack={() => back('work')}
        onChangeDoor={changeDoor}
      />
    )
  }

  if (step === 'account') {
    return (
      <AccountDetailsScreen
        onNext={(viaGoogle) => {
          update({ googleVerified: viaGoogle })
          return finishAccountStep(viaGoogle)
        }}
        onBack={() => back('account')}
        onChangeDoor={changeDoor}
      />
    )
  }

  if (step === 'verify') {
    return (
      <VerifyScreen
        onVerified={() => navigate('/signup/verified')}
        onBack={() => back('verify')}
      />
    )
  }

  return (
    <VerifiedScreen
      onContinue={() => {
        const role = door ? roleForDraft(door, draft.service) : 'host'
        navigate(`/dashboard/${role}`)
      }}
    />
  )
}

/** Exported so App can clear the draft when the user starts a fresh run. */
export function useResetSignup(): () => void {
  const { reset } = useSignupDraft()
  return useCallback(() => {
    reset()
    navigate('/signup')
  }, [reset])
}
