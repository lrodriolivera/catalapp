/** Fisher-Yates shuffle — returns a new array. */
export function shuffle<T>(arr: T[]): T[] {
  const s = [...arr]
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[s[i], s[j]] = [s[j], s[i]]
  }
  return s
}

/** Today's date as YYYY-MM-DD. */
export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Count words in a string. */
export function wordCount(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

/** Simple TTS for Catalan text. */
export function speakCatalan(text: string, rate = 0.85): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = 'ca-ES'
  utt.rate = rate
  window.speechSynthesis.speak(utt)
}

/** Check if a user answer matches the exercise's correct answer(s). */
export function checkAnswer(
  correctAnswer: string | string[],
  userAnswer: string
): boolean {
  const n = userAnswer.toLowerCase().trim()
  return Array.isArray(correctAnswer)
    ? correctAnswer.some((a) => a.toLowerCase().trim() === n)
    : correctAnswer.toLowerCase().trim() === n
}
