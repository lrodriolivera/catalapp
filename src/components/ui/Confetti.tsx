'use client'

import { useEffect } from 'react'
import confetti from 'canvas-confetti'

interface Props {
  trigger: boolean
  origin?: { x: number; y: number }
}

const PALETTE = ['#1E7BD9', '#FFC400', '#FF9F1C', '#B85FE8', '#FF86B6', '#4A99E5']

export function fireConfetti(origin = { x: 0.5, y: 0.6 }) {
  confetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 38,
    ticks: 220,
    origin,
    colors: PALETTE,
    scalar: 1.1,
    zIndex: 9999,
  })
  setTimeout(() => {
    confetti({
      particleCount: 50,
      spread: 110,
      startVelocity: 28,
      ticks: 180,
      origin: { x: origin.x - 0.15, y: origin.y },
      colors: PALETTE,
      zIndex: 9999,
    })
    confetti({
      particleCount: 50,
      spread: 110,
      startVelocity: 28,
      ticks: 180,
      origin: { x: origin.x + 0.15, y: origin.y },
      colors: PALETTE,
      zIndex: 9999,
    })
  }, 140)
}

export function Confetti({ trigger, origin }: Props) {
  useEffect(() => {
    if (trigger) fireConfetti(origin)
  }, [trigger, origin])
  return null
}
