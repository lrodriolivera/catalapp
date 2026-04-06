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
  if (typeof json.result === 'string' && json.result.includes('```')) {
    const match = json.result.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) return JSON.parse(match[1].trim())
  }
  return json.result
}

// Speak using Web Speech API only — pitch 0.75 for male, 1.0 for female
export async function speakNatural(text: string, speed: number = 0.85, onEnd?: () => void, gender: 'male' | 'female' = 'female'): Promise<void> {
  if (typeof speechSynthesis === 'undefined') { onEnd?.(); return }

  // Wait for voices to load
  let voices = speechSynthesis.getVoices()
  if (voices.length === 0) {
    await new Promise<void>((resolve) => {
      speechSynthesis.onvoiceschanged = () => resolve()
      setTimeout(resolve, 500)
    })
    voices = speechSynthesis.getVoices()
  }

  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ca-ES'
  u.rate = speed
  u.pitch = gender === 'male' ? 0.75 : 1.0

  const catalanVoice = voices.find(v => v.lang.startsWith('ca'))
  const spanishVoice = voices.find(v => v.lang === 'es-ES')
  if (catalanVoice) u.voice = catalanVoice
  else if (spanishVoice) u.voice = spanishVoice

  return new Promise<void>((resolve) => {
    u.onend = () => { onEnd?.(); resolve() }
    u.onerror = () => { onEnd?.(); resolve() }
    speechSynthesis.speak(u)
  })
}
