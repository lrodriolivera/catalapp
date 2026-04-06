// CatalApp Analytics — localStorage-based tracking

interface AnalyticsEvent {
  type: string
  page?: string
  data?: Record<string, any>
  timestamp: string
}

interface AnalyticsData {
  events: AnalyticsEvent[]
  sessionsCount: number
  firstVisit: string
  lastVisit: string
  totalTimeMinutes: number
  pageViews: Record<string, number>
  exercisesPerDay: Record<string, number>
}

const STORAGE_KEY = 'catalapp-analytics'
const SESSION_KEY = 'catalapp-session-start'
const MAX_EVENTS = 500

function readEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeEvents(events: AnalyticsEvent[]): void {
  const trimmed = events.slice(-MAX_EVENTS)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

export function trackEvent(type: string, data?: Record<string, any>): void {
  const events = readEvents()
  const event: AnalyticsEvent = {
    type,
    timestamp: new Date().toISOString(),
    ...(data ? { data } : {}),
  }
  events.push(event)
  writeEvents(events)
}

export function trackPageView(page: string): void {
  trackEvent('page_view', { page })
}

export function getAnalytics(): AnalyticsData {
  const events = readEvents()

  const sessionsCount = events.filter((e) => e.type === 'session_start').length
  const timestamps = events.map((e) => e.timestamp).sort()
  const firstVisit = timestamps[0] || new Date().toISOString()
  const lastVisit = timestamps[timestamps.length - 1] || new Date().toISOString()

  // Total time from session pairs
  let totalTimeMinutes = 0
  const starts = events.filter((e) => e.type === 'session_start')
  const ends = events.filter((e) => e.type === 'session_end')
  for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
    const startMs = new Date(starts[i].timestamp).getTime()
    const endMs = new Date(ends[i].timestamp).getTime()
    if (endMs > startMs) {
      totalTimeMinutes += (endMs - startMs) / 60000
    }
  }
  totalTimeMinutes = Math.round(totalTimeMinutes * 10) / 10

  // Page views
  const pageViews: Record<string, number> = {}
  events
    .filter((e) => e.type === 'page_view' && e.data?.page)
    .forEach((e) => {
      const page = e.data!.page as string
      pageViews[page] = (pageViews[page] || 0) + 1
    })

  // Exercises per day
  const exerciseTypes = [
    'exercise_complete',
    'flashcard_review',
    'writing_submit',
    'exam_complete',
    'dialogue_play',
  ]
  const exercisesPerDay: Record<string, number> = {}
  events
    .filter((e) => exerciseTypes.includes(e.type))
    .forEach((e) => {
      const day = e.timestamp.slice(0, 10)
      exercisesPerDay[day] = (exercisesPerDay[day] || 0) + 1
    })

  return {
    events,
    sessionsCount,
    firstVisit,
    lastVisit,
    totalTimeMinutes,
    pageViews,
    exercisesPerDay,
  }
}

export function getExercisesPerDay(): Record<string, number> {
  const { exercisesPerDay } = getAnalytics()
  const result: Record<string, number> = {}
  const now = new Date()

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    result[key] = exercisesPerDay[key] || 0
  }

  return result
}

export function getStreakHistory(): number[] {
  const perDay = getExercisesPerDay()
  const keys = Object.keys(perDay).sort()
  return keys.slice(-7).map((k) => perDay[k])
}

export function startSession(): void {
  trackEvent('session_start')
  localStorage.setItem(SESSION_KEY, new Date().toISOString())
}

export function endSession(): void {
  const startStr = localStorage.getItem(SESSION_KEY)
  if (startStr) {
    const startMs = new Date(startStr).getTime()
    const minutes = Math.round((Date.now() - startMs) / 60000 * 10) / 10
    trackEvent('session_end', { durationMinutes: minutes })
    localStorage.removeItem(SESSION_KEY)
  }
}
