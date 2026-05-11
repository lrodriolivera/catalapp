'use client'

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx || ctx.state === 'closed') {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainVal = 0.3,
  ramp?: { to: number; at: number },
) {
  const c = getCtx()
  if (!c) return
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, c.currentTime)
  if (ramp) osc.frequency.exponentialRampToValueAtTime(ramp.to, c.currentTime + ramp.at)
  gain.gain.setValueAtTime(gainVal, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(c.currentTime)
  osc.stop(c.currentTime + duration)
}

export function playCorrect() {
  const c = getCtx()
  if (!c) return
  playTone(523.25, 0.12, 'sine', 0.25)
  setTimeout(() => playTone(659.25, 0.12, 'sine', 0.25), 80)
  setTimeout(() => playTone(783.99, 0.18, 'sine', 0.3), 160)
}

export function playWrong() {
  const c = getCtx()
  if (!c) return
  playTone(311.13, 0.2, 'square', 0.15)
  setTimeout(() => playTone(233.08, 0.3, 'square', 0.12), 150)
}

export function playPurchase() {
  const c = getCtx()
  if (!c) return
  playTone(1318.5, 0.08, 'sine', 0.2)
  setTimeout(() => playTone(1567.98, 0.08, 'sine', 0.2), 60)
  setTimeout(() => playTone(2093.0, 0.15, 'sine', 0.25), 120)
  setTimeout(() => {
    playTone(2637.0, 0.25, 'triangle', 0.15)
    playTone(1318.5, 0.25, 'triangle', 0.1)
  }, 200)
}

export function playXP() {
  const c = getCtx()
  if (!c) return
  playTone(880, 0.06, 'sine', 0.15)
  setTimeout(() => playTone(1108.73, 0.1, 'sine', 0.18), 50)
}

export function playLevelUp() {
  const c = getCtx()
  if (!c) return
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.15, 'sine', 0.2), i * 100)
  })
}
