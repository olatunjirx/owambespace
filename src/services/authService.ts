import { parseIdentifier } from '../lib/identifier'
import type { AccountRole } from '../lib/signupFlow'
import { DEMO_ACCOUNTS } from './demoAccounts'
import type { DemoAccount } from './demoAccounts'

/**
 * Stand-in for the real auth backend.
 *
 * Every call is async and returns the shape the real one will, so swapping in
 * Paystack-KYC-backed accounts (or Supabase, or a bespoke API) means rewriting
 * this file and nothing else. Accounts persist to localStorage so a reload
 * during testing does not lose the run.
 */
export type Account = {
  id: string
  identifier: string
  identifierKind: 'email' | 'phone'
  fullName: string
  role: AccountRole
  hasPassword: boolean
  verified: boolean
}

export type SignupPayload = {
  fullName: string
  identifier: string
  password: string
  role: AccountRole
  viaGoogle: boolean
  profile: Record<string, string>
}

/** The OTP every simulated send produces, so the flow is testable offline. */
export const DEV_OTP = '123456'

const STORAGE_KEY = 'owambe.accounts.v1'
const LATENCY = 650

function delay<T>(value: T, ms = LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

function loadAccounts(): Account[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Account[]) : []
  } catch {
    return []
  }
}

function saveAccounts(accounts: Account[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
  } catch {
    // A full or disabled store is not worth failing a signup over.
  }
}

export function findAccount(identifier: string): Account | null {
  const parsed = parseIdentifier(identifier)
  if (parsed.kind === 'unknown') return null
  return loadAccounts().find((a) => a.identifier === parsed.value) ?? null
}

export type SignupResult =
  | { ok: true; account: Account; needsOtp: boolean }
  | { ok: false; reason: 'taken' | 'invalid' }

export async function createAccount(payload: SignupPayload): Promise<SignupResult> {
  const parsed = parseIdentifier(payload.identifier)
  const accounts = loadAccounts()

  // Last line of defence: an unparseable identifier must never reach storage,
  // whatever the caller did or skipped.
  if (parsed.kind === 'unknown') {
    return delay({ ok: false as const, reason: 'invalid' as const })
  }

  if (accounts.some((a) => a.identifier === parsed.value)) {
    return delay({ ok: false as const, reason: 'taken' as const })
  }

  const account: Account = {
    id: `acc_${Date.now().toString(36)}`,
    identifier: parsed.value,
    identifierKind: parsed.kind === 'phone' ? 'phone' : 'email',
    fullName: payload.fullName,
    role: payload.role,
    hasPassword: !payload.viaGoogle,
    // Google has already proved the address, so that account starts verified.
    verified: payload.viaGoogle,
  }

  saveAccounts([...accounts, account])
  return delay({ ok: true as const, account, needsOtp: !payload.viaGoogle })
}

export type SignInResult = { ok: true; account: DemoAccount } | { ok: false }

/** Only the demo accounts can sign in, because sign-up never stores a password. */
export async function signIn(identifier: string, password: string): Promise<SignInResult> {
  const parsed = parseIdentifier(identifier)
  const account = DEMO_ACCOUNTS.find((a) => a.identifier === parsed.value && a.password === password)
  return delay(account ? { ok: true as const, account } : { ok: false as const })
}

export async function sendOtp(_identifier: string): Promise<{ ok: true }> {
  // Real build: POST to the SMS/email gateway. Here the code is always DEV_OTP.
  return delay({ ok: true as const }, 400)
}

export type VerifyResult = { ok: true } | { ok: false; reason: 'invalid' }

export async function verifyOtp(
  identifier: string,
  code: string,
): Promise<VerifyResult> {
  if (code !== DEV_OTP) return delay({ ok: false as const, reason: 'invalid' as const })

  const accounts = loadAccounts()
  const parsed = parseIdentifier(identifier)
  const next = accounts.map((a) =>
    a.identifier === parsed.value ? { ...a, verified: true } : a,
  )
  saveAccounts(next)
  return delay({ ok: true as const })
}

/** Simulates the Google consent screen resolving with a verified address. */
export async function googleAuth(): Promise<{ email: string; name: string }> {
  return delay({ email: 'olatunji@owambespace.com', name: 'Olatunji Adeyemi' }, 900)
}
