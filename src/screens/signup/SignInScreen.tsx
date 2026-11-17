import { useState } from 'react'
import type { FormEvent } from 'react'

import { AuthLayout } from '../../components/AuthLayout'
import { PrimaryButton } from '../../components/Buttons'
import type { SubmitState } from '../../components/Buttons'
import { IdentifierField } from '../../components/IdentifierField'
import { PasswordField } from '../../components/PasswordField'
import { HERO_HEADLINES } from '../../lib/signupFlow'
import { navigate } from '../../router/hashRouter'
import { signIn } from '../../services/authService'
import { useSignupDraft } from '../../state/SignupDraft'

/**
 * Signs in and sends each user type to its own dashboard. The error never says
 * which of the two fields was wrong, so it can't reveal who has an account.
 */
export function SignInScreen() {
  const { update } = useSignupDraft()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState<SubmitState>('idle')

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (status !== 'idle') return

    setError('')
    setStatus('loading')
    const result = await signIn(identifier, password)
    setStatus('idle')

    if (!result.ok) {
      setError('That email, phone or password doesn’t match. Check them and try again.')
      return
    }

    // Clears anything left from a half-finished sign-up, which would otherwise
    // create a draft venue for the person signing in.
    update({
      door: null,
      venueName: '',
      fullName: result.account.fullName,
      identifier: result.account.identifier,
      password: '',
    })
    navigate(`/dashboard/${result.account.role}`, true)
  }

  return (
    <AuthLayout
      screenKey="signin"
      headline={HERO_HEADLINES.host}
      title="Welcome back"
      subtitle="Sign in to your Owambe Space account."
      footer={
        <p className="signup__alt">
          New to Owambe Space? <a href="#/signup">Create an account</a>
        </p>
      }
    >
      <form onSubmit={(event) => void handleSubmit(event)} noValidate className="signup__fields">
        <div className="signup__inputs">
          <IdentifierField
            value={identifier}
            onChange={(value) => {
              setIdentifier(value)
              setError('')
            }}
          />
          <PasswordField
            label="Password"
            value={password}
            error={error}
            showStrength={false}
            autoComplete="current-password"
            onChange={(value) => {
              setPassword(value)
              setError('')
            }}
          />
        </div>

        <div className="signup__actions">
          <PrimaryButton state={status} loadingLabel="Signing you in…" disabled={!identifier.trim() || !password}>
            Sign in
          </PrimaryButton>
        </div>
      </form>
    </AuthLayout>
  )
}
