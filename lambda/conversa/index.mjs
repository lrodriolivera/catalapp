import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.BEDROCK_ACCESS_KEY_ID,
    secretAccessKey: process.env.BEDROCK_SECRET_ACCESS_KEY,
  },
});

const SCENARIOS = {
  'presentacions': "L'alumne practica presentar-se: dir el nom, l'edat, la procedència i la professió.",
  'familia': "L'alumne practica parlar de la seva família: membres, descripcions físiques i de caràcter.",
  'habitatge': "L'alumne practica descriure on viu: adreça, tipus d'habitatge, parts de la casa.",
  'rutina': "L'alumne practica parlar de la rutina diària: hores, dies de la setmana, activitats quotidianes, horaris de feina i estudi.",
  'telefon': "L'alumne practica parlar per telèfon: saludar, identificar-se, demanar informació.",
  'default': "Conversa lliure de nivell A1 sobre temes quotidians.",
};

function buildSystemPrompt(scenario) {
  const ctx = SCENARIOS[scenario] || SCENARIOS['default'];
  return `Ets un tutor de català molt simpàtic i pacient. Parles EXCLUSIVAMENT en català.
Nivell: A1 (bàsic). ${ctx}

Regles estrictes:
- Respon amb frases CURTES i simples (màxim 2 frases per torn)
- Si l'alumne comet un error gramatical, corregeix-lo entre parèntesis: (Correcció: "frase correcta")
- Fes UNA pregunta per mantenir la conversa
- Usa vocabulari bàsic A1: salutacions, família, números, casa, oficis
- Si l'alumne escriu en castellà, respon en català i anima'l a provar en català
- No facis explicacions llargues de gramàtica
- Sigues càlid i encoratjador`;
}

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { messages = [], scenario = 'default' } = body;

    if (!messages.length) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No messages provided' }) };
    }

    // Keep only last 10 messages for context window
    const recentMessages = messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const payload = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 200,
      system: buildSystemPrompt(scenario),
      messages: recentMessages,
    });

    const command = new InvokeModelCommand({
      modelId: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
      body: payload,
      contentType: 'application/json',
      accept: 'application/json',
    });

    const response = await client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    const text = result.content?.[0]?.text || '';

    // Extract correction if present
    const correctionMatch = text.match(/\(Correcció:\s*"([^"]+)"\)/);
    const correction = correctionMatch ? correctionMatch[1] : null;
    const cleanText = text.replace(/\(Correcció:\s*"[^"]+"\)/, '').trim();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ response: cleanText || text, correction }),
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error de connexió amb la IA', detail: err.message }),
    };
  }
};
