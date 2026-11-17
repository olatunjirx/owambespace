import type { AccountRole } from '../lib/signupFlow'

export type DemoAccount = {
  role: AccountRole
  fullName: string
  identifier: string
  password: string
}

/** Shared by every demo account. Listed in DEMO_LOGINS.md for the team. */
const DEMO_PASSWORD = 'Owambe#Demo2026'

/**
 * One ready-made login per user type, for demos and design review.
 *
 * These ship in the browser code, so they must be deleted when real accounts
 * replace services/authService.ts.
 */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: 'host', fullName: 'Demo Host', identifier: 'host@owambe.test', password: DEMO_PASSWORD },
  { role: 'venue_owner', fullName: 'Demo Venue Owner', identifier: 'venue@owambe.test', password: DEMO_PASSWORD },
  { role: 'planner', fullName: 'Demo Planner', identifier: 'planner@owambe.test', password: DEMO_PASSWORD },
  { role: 'vendor', fullName: 'Demo Vendor', identifier: 'vendor@owambe.test', password: DEMO_PASSWORD },
]
