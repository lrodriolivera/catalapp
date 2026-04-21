'use client'

import RouteError from '@/components/RouteError'

export default function EscripturaError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return <RouteError error={error} retry={unstable_retry} title="L'escriptura no s'ha pogut carregar" />
}
