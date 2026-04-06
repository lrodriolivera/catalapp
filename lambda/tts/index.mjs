const GOOGLE_TTS_API = 'https://texttospeech.googleapis.com/v1/text:synthesize'
const API_KEY = process.env.GOOGLE_TTS_API_KEY

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { text, speed = 1.0, voice = 'ca-ES-Standard-A' } = body

    if (!text || text.length > 1000) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Text required (max 1000 chars)' }) }
    }

    // Call Google Cloud TTS
    const response = await fetch(`${GOOGLE_TTS_API}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: 'ca-ES',
          name: voice,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: speed,
          pitch: 0,
        },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Google TTS error:', err)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'TTS generation failed', detail: err }) }
    }

    const data = await response.json()

    // data.audioContent is base64-encoded MP3
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        audio: data.audioContent,
        format: 'mp3',
      }),
    }
  } catch (err) {
    console.error('Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
