const GOOGLE_TTS_API = 'https://texttospeech.googleapis.com/v1/text:synthesize'
const API_KEY = process.env.GOOGLE_TTS_API_KEY

// Catalan only has 1 female voice. For male, use Spanish which pronounces Catalan well.
const VOICES = {
  female: { languageCode: 'ca-ES', name: 'ca-ES-Standard-B' },        // Catalan female (native)
  male: { languageCode: 'es-ES', name: 'es-ES-Standard-B' },           // Spanish male standard
}

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
    const { text, speed = 1.0, gender = 'female' } = body

    if (!text || text.length > 1000) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Text required (max 1000 chars)' }) }
    }

    const voice = gender === 'male' ? VOICES.male : VOICES.female

    const response = await fetch(`${GOOGLE_TTS_API}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice,
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
