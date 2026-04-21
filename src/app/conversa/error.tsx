'use client'

import RouteError from '@/components/RouteError'

export default function ConversaError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return <RouteError error={error} retry={unstable_retry} title="La conversa no s'ha pogut carregar" />
}
