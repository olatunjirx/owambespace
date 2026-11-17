import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Speaking instead of typing — spec §10.12.
 *
 * The only §10 feature that needs no server: recognition is built into the
 * browser. Chrome, Edge and Safari implement it; Firefox does not, so the
 * button that uses this must hide itself rather than sit there dead.
 *
 * `en-NG` is asked for first because the alternative is a recogniser that
 * hears "Ikeja" as "a car" — browsers that lack the locale fall back to their
 * own default on their own.
 */

/** Minimal shape of the vendor-prefixed API; there are no lib.dom types for it. */
type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechEvent) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
}

type SpeechEvent = {
  resultIndex: number
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}

type RecognitionConstructor = new () => SpeechRecognitionLike

function constructorFor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null
}

/** Whether this browser can do it at all, checked once at module load. */
export const dictationSupported = constructorFor() !== null

export type Dictation = {
  supported: boolean
  listening: boolean
  /** Words heard but not yet settled — shown greyed while speaking. */
  interim: string
  /** Set when the mic is blocked or recognition fails; worth telling the user. */
  error: string | null
  start: () => void
  stop: () => void
}

/**
 * Streams recognised speech into `onText`.
 *
 * Final results are appended to whatever is already in the field rather than
 * replacing it, so dictation can extend a half-typed query instead of eating it.
 */
export function useDictation(onText: (text: string) => void): Dictation {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  // Held in a ref so restarting recognition does not depend on the caller
  // memoising its handler.
  const handlerRef = useRef(onText)
  handlerRef.current = onText

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
    setInterim('')
  }, [])

  const start = useCallback(() => {
    const Recognition = constructorFor()
    if (!Recognition) return

    // A second press while listening means "stop", not "start again".
    if (recognitionRef.current) {
      stop()
      return
    }

    const recognition = new Recognition()
    recognition.lang = 'en-NG'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let settled = ''
      let pending = ''

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const text = result[0]?.transcript ?? ''
        if (result.isFinal) settled += text
        else pending += text
      }

      setInterim(pending)
      if (settled.trim()) handlerRef.current(settled.trim())
    }

    recognition.onerror = (event) => {
      setError(
        event.error === 'not-allowed'
          ? 'Microphone access was blocked. Allow it in your browser settings to dictate.'
          : 'Could not hear that. Try again, or type it instead.',
      )
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setListening(false)
      setInterim('')
    }

    recognitionRef.current = recognition
    setError(null)
    setListening(true)

    try {
      recognition.start()
    } catch {
      // Starting twice throws; the running session is the one we want anyway.
      recognitionRef.current = null
      setListening(false)
    }
  }, [stop])

  // Leaving the screen mid-sentence must not leave the mic live.
  useEffect(() => () => recognitionRef.current?.abort(), [])

  return { supported: dictationSupported, listening, interim, error, start, stop }
}
