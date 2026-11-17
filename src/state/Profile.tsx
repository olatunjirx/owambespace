import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * The host's own profile — who they are on the platform, as opposed to any
 * one event they are running.
 *
 * Spec §4.1: display name, photo, bio, saved providers, default payment
 * method, default delivery address, communication preferences. Event history
 * is not stored here because it is derivable from the events store.
 */
export type CommunicationPrefs = {
  emailUpdates: boolean
  smsReminders: boolean
  whatsapp: boolean
}

export type PaymentMethod = {
  brand: string
  last4: string
}

export type DeliveryAddress = {
  street: string
  city: string
  state: string
}

export type HostProfile = {
  displayName: string
  bio: string
  prefs: CommunicationPrefs
  /** One card on file, or none. Simulated until a payment provider exists. */
  payment: PaymentMethod | null
  address: DeliveryAddress
  /** Vendor ids saved across all events — a personal shortlist. */
  savedVendors: string[]
}

const EMPTY_PROFILE: HostProfile = {
  displayName: '',
  bio: '',
  prefs: { emailUpdates: true, smsReminders: true, whatsapp: false },
  payment: null,
  address: { street: '', city: '', state: '' },
  savedVendors: [],
}

const STORAGE_KEY = 'owambe.host.profile.v1'

type ProfileContextValue = {
  profile: HostProfile
  update: (patch: Partial<HostProfile>) => void
  setPref: (pref: keyof CommunicationPrefs, on: boolean) => void
  toggleSavedVendor: (vendorId: string) => void
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

function load(): HostProfile {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_PROFILE

    const parsed = JSON.parse(raw) as Partial<HostProfile>
    // Merged over the empty profile so an older stored copy can never leave a
    // field undefined and crash a screen.
    return {
      ...EMPTY_PROFILE,
      ...parsed,
      prefs: { ...EMPTY_PROFILE.prefs, ...parsed.prefs },
      address: { ...EMPTY_PROFILE.address, ...parsed.address },
      savedVendors: parsed.savedVendors ?? [],
    }
  } catch {
    return EMPTY_PROFILE
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<HostProfile>(load)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    } catch {
      // Private browsing costs the persistence, not the session.
    }
  }, [profile])

  const update = useCallback((patch: Partial<HostProfile>) => {
    setProfile((current) => ({ ...current, ...patch }))
  }, [])

  const setPref = useCallback((pref: keyof CommunicationPrefs, on: boolean) => {
    setProfile((current) => ({
      ...current,
      prefs: { ...current.prefs, [pref]: on },
    }))
  }, [])

  const toggleSavedVendor = useCallback((vendorId: string) => {
    setProfile((current) => ({
      ...current,
      savedVendors: current.savedVendors.includes(vendorId)
        ? current.savedVendors.filter((id) => id !== vendorId)
        : [...current.savedVendors, vendorId],
    }))
  }, [])

  const value = useMemo(
    () => ({ profile, update, setPref, toggleSavedVendor }),
    [profile, update, setPref, toggleSavedVendor],
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfile must be used inside <ProfileProvider>')
  }
  return context
}
