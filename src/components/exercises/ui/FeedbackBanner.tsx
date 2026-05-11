'use client'

import { type ReactNode, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Mascot } from '@/components/ui/Mascot'
import { playCorrect, playWrong } from '@/lib/sounds'

type Status = 'correct' | 'incorrect'

interface Props {
  status: Status
  title?: string
  message?: ReactNode
}

export default function FeedbackBanner({ status, title, message }: Props) {
  const played = useRef(false)
  const isCorrect = status === 'correct'

  useEffect(() => {
    if (played.current) return
    played.current = true
    if (isCorrect) playCorrect()
    else playWrong()
  }, [isCorrect])
  const defaultTitle = isCorrect ? 'Molt bé!' : 'Atenció'
  return (
    <div
      className={cn(
        'rounded-2xl p-4 md:p-5 flex items-center gap-4 animate-bounce-in',
        isCorrect ? 'bg-primary-soft border-2 border-primary/40' : 'bg-red-soft border-2 border-red/40',
      )}
      role="status"
      aria-live="polite"
    >
      <div className="shrink-0">
        <Mascot expression={isCorrect ? 'cheering' : 'sad'} size="sm" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-lg font-extrabold', isCorrect ? 'text-primary-dark' : 'text-red-dark')}>
          {title ?? defaultTitle}
        </p>
        {message && (
          <p className={cn('text-sm mt-1 font-medium', isCorrect ? 'text-primary-dark/80' : 'text-red-dark/80')}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
