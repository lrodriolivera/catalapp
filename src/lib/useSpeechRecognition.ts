'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseSpeechRecognitionOptions {
  lang?: string
  onResult?: (transcript: string) => void
  onError?: (error: string) => void
}

export interface SpeechRecognitionState {
  supported: boolean
  isRecording: boolean
  transcript: string
  error: string | null
  start: () => void
  stop: () => void
  reset: () => void
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}): SpeechRecognitionState {
  const { lang = 'ca-ES', onResult, onError } = options
  const [supported, setSupported] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition))
  }, [])

  const start = useCallback(() => {
    if (typeof window === 'undefined') return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch {}
    }

    const r = new SR()
    r.lang = lang
    r.interimResults = false
    r.maxAlternatives = 1
    r.continuous = false
    recognitionRef.current = r
    setTranscript('')
    setError(null)
    setIsRecording(true)

    r.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript
      setTranscript(text)
      onResult?.(text)
    }
    r.onerror = (event: SpeechRecognitionErrorEvent) => {
      const code = event.error || 'unknown'
      setError(code)
      setIsRecording(false)
      onError?.(code)
    }
    r.onend = () => setIsRecording(false)
    r.start()
  }, [lang, onResult, onError])

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setError(null)
  }, [])

  return { supported, isRecording, transcript, error, start, stop, reset }
}
