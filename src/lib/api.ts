const API_URL = 'https://vqw0d5p9td.execute-api.us-east-1.amazonaws.com'
const RETRY_DELAYS_MS = [500, 1000, 2000]

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const isTransientStatus = (status: number) =>
  status >= 500 || status === 408 || status === 429

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let networkError: unknown
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(url, init)
      if (isTransientStatus(res.status) && attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt])
        continue
      }
      return res
    } catch (err) {
      networkError = err
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt])
        continue
      }
    }
  }
  throw networkError ?? new Error('Error de connexió amb la IA')
}

export async function sendConversaMessage(
  messages: { role: string; content: string }[],
  scenario: string
): Promise<{ response: string; correction?: string }> {
  const res = await fetchWithRetry(`${API_URL}/conversa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, scenario }),
  })
  if (!res.ok) throw new Error('Error de connexió amb la IA')
  return res.json()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function callSonnet(action: string, data: Record<string, any>): Promise<any> {
  const res = await fetchWithRetry(`${API_URL}/sonnet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data }),
  })
  if (!res.ok) throw new Error('Error de connexió amb la IA')
  const json = await res.json()
  if (typeof json.result === 'string' && json.result.includes('```')) {
    const match = json.result.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) return JSON.parse(match[1].trim())
  }
  return json.result
}
