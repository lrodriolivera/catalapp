const API_URL = 'https://vqw0d5p9td.execute-api.us-east-1.amazonaws.com'

export async function sendConversaMessage(
  messages: { role: string; content: string }[],
  scenario: string
): Promise<{ response: string; correction?: string }> {
  const res = await fetch(`${API_URL}/conversa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, scenario }),
  })
  if (!res.ok) throw new Error('Error de connexio amb la IA')
  return res.json()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function callSonnet(action: string, data: Record<string, any>): Promise<any> {
  const res = await fetch(`${API_URL}/sonnet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data }),
  })
  if (!res.ok) throw new Error('Error de connexió amb la IA')
  const json = await res.json()
  // Handle markdown-wrapped JSON
  if (typeof json.result === 'string' && json.result.includes('```')) {
    const match = json.result.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) return JSON.parse(match[1].trim())
  }
  return json.result
}
