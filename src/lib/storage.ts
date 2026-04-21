export interface StorageSchema<T> {
  key: string
  version: number
  defaultValue: T
  migrate?: (oldData: unknown, oldVersion: number) => T
}

interface Wrapper<T> {
  version: number
  data: T
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function isWrapper(raw: unknown): raw is Wrapper<unknown> {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    typeof (raw as { version?: unknown }).version === 'number' &&
    'data' in (raw as object)
  )
}

export function readStorage<T>(schema: StorageSchema<T>): T {
  if (typeof window === 'undefined') return clone(schema.defaultValue)
  const raw = window.localStorage.getItem(schema.key)
  if (!raw) return clone(schema.defaultValue)

  try {
    const parsed: unknown = JSON.parse(raw)
    const wrapped = isWrapper(parsed)
    const version = wrapped ? parsed.version : 0
    const data = wrapped ? parsed.data : parsed

    if (version === schema.version) return data as T
    if (version > schema.version) return clone(schema.defaultValue)
    if (!schema.migrate) return clone(schema.defaultValue)

    const migrated = schema.migrate(data, version)
    writeStorage(schema, migrated)
    return migrated
  } catch {
    return clone(schema.defaultValue)
  }
}

export function writeStorage<T>(schema: StorageSchema<T>, value: T): void {
  if (typeof window === 'undefined') return
  try {
    const wrapped: Wrapper<T> = { version: schema.version, data: value }
    window.localStorage.setItem(schema.key, JSON.stringify(wrapped))
  } catch {
    // QuotaExceeded / SecurityError — silently ignore
  }
}
