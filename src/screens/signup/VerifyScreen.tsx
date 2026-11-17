import { useEffect, useRef, useState } from 'react'

import { AuthLayout } from '../../components/AuthLayout'
import { OtpInput, ResendTimer } from '../../components/OtpInput'
import { PrimaryButton } from '../../components/Buttons'
import { HERO_HEADLINES, stepTotal } from '../../lib/signupFlow'
import { formatIdentifier, parseIdentifier } from '../../lib/identifier'
import { sendOtp, verifyOtp } from '../../services/authService'
import type { SubmitState } from '../../components/Buttons'
import { useSignupDraft } from '../../state/SignupDraft'

type VerifyScreenProps = {
  onVerified: () => void
  onBack: () => void
}

/**
 * The last step of every door, and it counts as a step — hiding it would make
 * "Step 2 of 2" land on a screen the user still has work to do on.
 */
export function VerifyScreen({ onVerified, onBack }: VerifyScreenProps) {
  const { draft } = useSignupDraft()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState<SubmitState>('idle')
  const [resendKey, setResendKey] = useState(0)
  const sent = useRef(false)

  const door = draft.door ?? 'host'
  const total = stepTotal(door)
  const parsed = parseIdentifier(draft.identifier)
  const target = parsed.kind === 'unknown' ? draft.identifier : formatIdentifier(parsed)

  useEffect(() => {
    // StrictMode double-invokes effects; only send once.
    if (sent.current) return
    sent.current = true
    void sendOtp(draft.identifier)
  }, [draft.identifier])

  async function submit(value: string): Promise<void> {
    if (value.length < 6 || status !== 'idle') return

    setStatus('loading')
    setError('')
    const result = await verifyOtp(draft.identifier, value)

    if (!result.ok) {
      setStatus('idle')
      setError('That code is not right. Check it and try again.')
      setCode('')
      return
    }

    setStatus('done')
    window.setTimeout(onVerified, 650)
  }

  function handleResend(): void {
    setCode('')
    setError('')
    setResendKey((current) => current + 1)
    void sendOtp(draft.identifier)
  }

  return (
    <AuthLayout
      screenKey="verify"
      headline={HERO_HEADLINES[door]}
      eyebrow={`Step ${total} of ${total}`}
      step={total}
      total={total}
      title="Confirm it's you"
      subtitle={
        <>
          We sent a 6-digit code to{' '}
          <span className="signup__sent-to">{target}</span>.
        </>
      }
      onBack={onBack}
      footer={<ResendTimer onResend={handleResend} resetKey={resendKey} />}
    >
      <form
        className="signup__fields"
        onSubmit={(event) => {
          event.preventDefault()
          void submit(code)
        }}
        noValidate
      >
        <OtpInput
          value={code}
          onChange={setCode}
          onComplete={(value) => void submit(value)}
          error={error}
          disabled={status !== 'idle'}
        />

        <div className="signup__actions">
          <PrimaryButton
            state={status}
            disabled={code.length < 6}
            loadingLabel="Checking your code…"
            doneLabel="Verified"
          >
            Verify
          </PrimaryButton>
        </div>
      </form>
    </AuthLayout>
  )
}
