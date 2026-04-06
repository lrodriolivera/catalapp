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
