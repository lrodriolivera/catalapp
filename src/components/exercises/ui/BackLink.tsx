'use client'

import type { ButtonHTMLAttributes } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children'> {
  label?: string
  href?: string
}

const base = cn(
  'inline-flex items-center gap-2 h-10 px-3 -ml-3 rounded-xl',
  'text-sm font-extrabold uppercase tracking-wider text-ink-soft hover:bg-paper-3 hover:text-ink transition-colors',
  'focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary',
)

export default function BackLink({ label = 'Enrere', href, onClick, ...rest }: Props) {
  if (href) {
    return (
      <Link href={href} className={base} aria-label={label}>
        <ArrowLeft size={18} strokeWidth={2.5} aria-hidden="true" />
        {label}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={base} {...rest}>
      <ArrowLeft size={18} strokeWidth={2.5} aria-hidden="true" />
      {label}
    </button>
  )
}
