import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { PLANNING_SERVICE, roleForDraft } from '../lib/signupFlow'
import type { AccountRole, Door, OperatingMode } from '../lib/signupFlow'

/**
 * Every value the sign-up collects, held above the screens.
 *
 * Screens read and write this rather than owning their own state, which is
 * what makes Back lossless: going back unmounts a screen, but nothing it
 * captured lived there in the first place.
 */
export type SignupDraftValues = {
  door: Door | null
  service: string
  mode: OperatingMode
  venueName: string
  spaceType: string
  tradingName: string
  companyName: string
  rcNumber: string
  location: string
  fullName: string
  identifier: string
  password: string
  /** Set when the account came from Google, which skips the OTP step. */
  googleVerified: boolean
}

const EMPTY_DRAFT: SignupDraftValues = {
  door: null,
  service: '',
  mode: 'solo',
  venueName: '',
  spaceType: '',
  tradingName: '',
  companyName: '',
  rcNumber: '',
  location: '',
  fullName: '',
  identifier: '',
  password: '',
  googleVerified: false,
}

type SignupDraftContextValue = {
  draft: SignupDraftValues
  update: (patch: Partial<SignupDraftValues>) => void
  reset: () => void
  role: AccountRole | null
}

const SignupDraftContext = createContext<SignupDraftContextValue | null>(null)

export function SignupDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<SignupDraftValues>(EMPTY_DRAFT)

  const update = useCallback((patch: Partial<SignupDraftValues>) => {
    setDraft((current) => ({ ...current, ...patch }))
  }, [])

  const reset = useCallback(() => setDraft(EMPTY_DRAFT), [])

  const role = useMemo(
    () => (draft.door ? roleForDraft(draft.door, draft.service) : null),
    [draft.door, draft.service],
  )

  const value = useMemo(
    () => ({ draft, update, reset, role }),
    [draft, update, reset, role],
  )

  return (
    <SignupDraftContext.Provider value={value}>
      {children}
    </SignupDraftContext.Provider>
  )
}

export function useSignupDraft(): SignupDraftContextValue {
  const context = useContext(SignupDraftContext)
  if (!context) {
    throw new Error('useSignupDraft must be used inside <SignupDraftProvider>')
  }
  return context
}

/** True when the service door has landed on the planner branch. */
export function isPlannerDraft(draft: SignupDraftValues): boolean {
  return draft.door === 'service' && draft.service === PLANNING_SERVICE
}
