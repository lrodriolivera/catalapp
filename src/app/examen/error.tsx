'use client'

import RouteError from '@/components/RouteError'

export default function ExamenError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return <RouteError error={error} retry={unstable_retry} title="L'examen no s'ha pogut carregar" />
}
