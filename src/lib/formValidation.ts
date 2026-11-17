/**
 * Validation reads the DOM, not React state.
 *
 * Browser autofill writes straight into `input.value` without dispatching an
 * `input` event, so a controlled component's state can sit empty while the
 * field visibly holds a value. Validating the state object then rejects a
 * filled-in form and Continue feels dead. Reading `form.elements` at submit
 * time sees whatever is actually on screen.
 */
export type FormValues = Record<string, string>

/** Every named input/select/textarea in the form, by name. */
export function readFormValues(form: HTMLFormElement): FormValues {
  const values: FormValues = {}
  for (const element of Array.from(form.elements)) {
    const field = element as HTMLInputElement
    if (!field.name) continue
    if (field.type === 'checkbox' || field.type === 'radio') {
      if (field.checked) values[field.name] = field.value
      continue
    }
    values[field.name] = field.value
  }
  return values
}

/**
 * Bring the first field that failed into view and focus it, so the message is
 * never sitting above or below the fold on a short viewport.
 */
export function focusFirstInvalid(form: HTMLFormElement, order: string[]): void {
  for (const name of order) {
    const field = form.elements.namedItem(name) as HTMLElement | null
    if (!field) continue

    const target =
      typeof (field as HTMLInputElement).focus === 'function' ? field : null
    const scrollTarget = field.closest('.field, .pill-group, .radio-cards') ?? field

    scrollTarget.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'center',
    })
    target?.focus({ preventScroll: true })
    return
  }
}

/** Trim every value in place — nobody means the trailing space. */
export function trimValues(values: FormValues): FormValues {
  const out: FormValues = {}
  for (const [key, value] of Object.entries(values)) out[key] = value.trim()
  return out
}
