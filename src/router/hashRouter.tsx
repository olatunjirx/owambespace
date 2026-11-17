import { useCallback, useEffect, useState } from 'react'

/**
 * A hash router in about forty lines.
 *
 * The app needs real URLs (so Back works, and so a step is linkable) but not a
 * routing library — there are nine routes and no nested layouts. Screens never
 * import this directly; they take `onNext`/`onBack` callbacks, so swapping in
 * React Router later touches only App.tsx.
 */
export function currentPath(): string {
  const hash = window.location.hash.replace(/^#/, '')
  return hash || '/signup'
}

export function navigate(path: string, replace = false): void {
  const target = `#${path}`
  if (replace) window.location.replace(target)
  else window.location.hash = path
}

export function goBack(): void {
  window.history.back()
}

export function useRoute(): string {
  const [path, setPath] = useState(currentPath)

  useEffect(() => {
    const onChange = () => setPath(currentPath())
    window.addEventListener('hashchange', onChange)
    // A hash-less first load should still resolve to a real route.
    if (!window.location.hash) navigate('/signup', true)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return path
}

/** Scrolls the panel back to the top whenever the route changes. */
export function useScrollReset(path: string): void {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }, [path])
}

export function useNavigate(): (path: string, replace?: boolean) => void {
  return useCallback((path: string, replace = false) => navigate(path, replace), [])
}
