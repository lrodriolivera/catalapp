import { readStorage, writeStorage, type StorageSchema } from '@/lib/storage'

interface Foo {
  count: number
  label: string
}

const schema: StorageSchema<Foo> = {
  key: 'test-foo',
  version: 2,
  defaultValue: { count: 0, label: '' },
  migrate: (old, oldVersion) => {
    if (oldVersion === 0) {
      const legacy = old as { count?: number }
      return { count: legacy.count ?? 0, label: 'migrated-from-legacy' }
    }
    if (oldVersion === 1) {
      const v1 = old as { count: number }
      return { count: v1.count, label: 'migrated-from-v1' }
    }
    return { count: 0, label: '' }
  },
}

describe('storage wrapper', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('returns default when empty', () => {
    expect(readStorage(schema)).toEqual({ count: 0, label: '' })
  })

  test('round-trip write/read', () => {
    writeStorage(schema, { count: 7, label: 'hello' })
    expect(readStorage(schema)).toEqual({ count: 7, label: 'hello' })
  })

  test('migrates legacy unversioned data', () => {
    localStorage.setItem(schema.key, JSON.stringify({ count: 3 }))
    const result = readStorage(schema)
    expect(result).toEqual({ count: 3, label: 'migrated-from-legacy' })
    // Migration must persist in versioned format
    const raw = JSON.parse(localStorage.getItem(schema.key)!)
    expect(raw.version).toBe(2)
    expect(raw.data.label).toBe('migrated-from-legacy')
  })

  test('migrates from older versioned data', () => {
    const v1Schema: StorageSchema<{ count: number }> = {
      key: schema.key,
      version: 1,
      defaultValue: { count: 0 },
    }
    writeStorage(v1Schema, { count: 42 })
    const result = readStorage(schema)
    expect(result).toEqual({ count: 42, label: 'migrated-from-v1' })
  })

  test('returns default when legacy data exists but no migrate fn', () => {
    const noMigrate: StorageSchema<Foo> = {
      key: schema.key,
      version: 2,
      defaultValue: { count: 0, label: 'default' },
    }
    localStorage.setItem(schema.key, JSON.stringify({ count: 5 }))
    expect(readStorage(noMigrate)).toEqual({ count: 0, label: 'default' })
  })

  test('returns default for invalid JSON', () => {
    localStorage.setItem(schema.key, 'not-json{')
    expect(readStorage(schema)).toEqual({ count: 0, label: '' })
  })

  test('returns default when stored version is newer than schema', () => {
    localStorage.setItem(
      schema.key,
      JSON.stringify({ version: 99, data: { count: 1, label: 'future' } })
    )
    expect(readStorage(schema)).toEqual({ count: 0, label: '' })
  })

  test('default value is cloned (not shared reference)', () => {
    const a = readStorage(schema)
    a.label = 'mutated'
    const b = readStorage(schema)
    expect(b.label).toBe('')
  })
})
