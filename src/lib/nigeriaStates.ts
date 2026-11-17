/**
 * The 36 states plus the Federal Capital Territory.
 *
 * `live` marks where Owambe Space has actually launched. Everywhere else is
 * still selectable — a venue owner in Kano should be able to finish signing
 * up — but the option says so, so nobody is surprised later.
 */
export type NigeriaState = {
  name: string
  live: boolean
}

const LIVE_STATES = ['Lagos', 'Abuja (FCT)', 'Rivers']

const STATE_NAMES = [
  'Abia', 'Abuja (FCT)', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi',
  'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo',
  'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
]

export const NIGERIA_STATES: NigeriaState[] = STATE_NAMES.map((name) => ({
  name,
  live: LIVE_STATES.includes(name),
}))

/** Case- and whitespace-insensitive exact lookup. Returns null for free text. */
export function findState(input: string): NigeriaState | null {
  const needle = input.trim().toLowerCase()
  if (!needle) return null
  return NIGERIA_STATES.find((s) => s.name.toLowerCase() === needle) ?? null
}

export function filterStates(query: string): NigeriaState[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return NIGERIA_STATES
  // Prefix matches first — typing "kan" should surface Kano before Nasarawa.
  const starts = NIGERIA_STATES.filter((s) => s.name.toLowerCase().startsWith(needle))
  const contains = NIGERIA_STATES.filter(
    (s) => !s.name.toLowerCase().startsWith(needle) && s.name.toLowerCase().includes(needle),
  )
  return [...starts, ...contains]
}
