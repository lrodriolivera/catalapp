const API_URL = 'https://vqw0d5p9td.execute-api.us-east-1.amazonaws.com'

export async function sendConversaMessage(
  messages: { role: string; content: string }[],
  scenario: string
): Promise<{ response: string; correction?: string }> {
  const res = await fetch(`${API_URL}/conversa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, scenario }),
  })
  if (!res.ok) throw new Error('Error de connexio amb la IA')
  return res.json()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function callSonnet(action: string, data: Record<string, any>): Promise<any> {
  const res = await fetch(`${API_URL}/sonnet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data }),
  })
  if (!res.ok) throw new Error('Error de connexió amb la IA')
  const json = await res.json()
  // Handle markdown-wrapped JSON
  if (typeof json.result === 'string' && json.result.includes('```')) {
    const match = json.result.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) return JSON.parse(match[1].trim())
  }
  return json.result
}

// Google Cloud TTS - returns base64 MP3 audio
let ttsCache: Record<string, string> = {}

export async function speakWithGoogleTTS(text: string, speed: number = 0.9, gender: 'male' | 'female' = 'female'): Promise<void> {
  // Check cache first
  const cacheKey = `${text}-${speed}-${gender}`
  let audioBase64 = ttsCache[cacheKey]

  if (!audioBase64) {
    const res = await fetch(`${API_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 1000), speed, gender }),
    })
    if (!res.ok) throw new Error('TTS error')
    const json = await res.json()
    audioBase64 = json.audio
    // Cache up to 50 entries
    if (Object.keys(ttsCache).length > 50) ttsCache = {}
    ttsCache[cacheKey] = audioBase64
  }

  // Play the MP3
  const audioBlob = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))
  const blob = new Blob([audioBlob], { type: 'audio/mp3' })
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.playbackRate = 1.0
  return new Promise((resolve) => {
    audio.onended = () => { URL.revokeObjectURL(url); resolve() }
    audio.onerror = () => { URL.revokeObjectURL(url); resolve() }
    audio.play().catch(() => resolve())
  })
}

// Speak: Web Speech API first (better Catalan voices in Chrome), Google TTS as fallback
export async function speakNatural(text: string, speed: number = 0.9, onEnd?: () => void, gender: 'male' | 'female' = 'female'): Promise<void> {
  // Try Web Speech API first — has native Catalan voices on Chrome/Edge
  if (typeof speechSynthesis !== 'undefined') {
    const voices = speechSynthesis.getVoices()
    const catalanVoice = voices.find(v => v.lang.startsWith('ca'))
    if (catalanVoice) {
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'ca-ES'
      u.rate = speed
      u.voice = catalanVoice
      return new Promise<void>((resolve) => {
        u.onend = () => { onEnd?.(); resolve() }
        u.onerror = () => { onEnd?.(); resolve() }
        speechSynthesis.speak(u)
      })
    }
  }
  // Fallback to Google Cloud TTS (for Firefox and browsers without Catalan)
  try {
    await speakWithGoogleTTS(text, speed, gender)
    onEnd?.()
  } catch {
    onEnd?.()
  }
}
