import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.BEDROCK_ACCESS_KEY_ID,
    secretAccessKey: process.env.BEDROCK_SECRET_ACCESS_KEY,
  },
});

const ACTIONS = {
  // Generate exercises based on user weaknesses
  generate_exercises: (data) => `Ets un professor de català A1. Genera ${data.count || 5} exercicis nous de nivell A1 sobre el tema: "${data.topic}".
${data.weaknesses ? `L'alumne té dificultats amb: ${data.weaknesses.join(', ')}. Enfoca els exercicis en aquestes àrees.` : ''}

Format JSON estricte (array):
[{"type":"multiple-choice","question":"...","options":["a","b","c","d"],"correctAnswer":"...","explanation":"..."},...]

Tipus permesos: multiple-choice, fill-blank, translate, conjugate.
Per fill-blank: no cal options, correctAnswer és la paraula que falta.
Per translate: question és la frase en castellà, correctAnswer en català.
Per conjugate: question demana conjugar un verb amb una persona.

Respon NOMÉS amb el JSON, sense text addicional.`,

  // Correct free writing
  correct_writing: (data) => `Ets un professor de català A1. L'alumne ha escrit el següent text en català:

"${data.text}"

${data.context ? `Context: ${data.context}` : ''}

Analitza el text i respon en JSON estricte:
{
  "correctedText": "text corregit complet",
  "score": 85,
  "errors": [
    {"original": "frase amb error", "corrected": "frase corregida", "type": "gramàtica|ortografia|vocabulari|sintaxi", "explanation": "explicació breu en català"}
  ],
  "feedback": "comentari general positiu i constructiu en català",
  "suggestions": ["suggeriment 1 per millorar", "suggeriment 2"]
}

Sigues amable i encoratjador. El score va de 0 a 100. Respon NOMÉS amb el JSON.`,

  // Evaluate CPNL-style exam
  evaluate_exam: (data) => `Ets un examinador del CPNL (nivell A1). Avalua la resposta de l'alumne:

Tasca: ${data.task}
Resposta de l'alumne: "${data.answer}"

Avalua segons criteris CPNL A1:
- Adequació (ha respost al que es demana?)
- Coherència (té sentit?)
- Correcció lingüística (gramàtica, ortografia)
- Riquesa lèxica (varietat de vocabulari)

Respon en JSON estricte:
{
  "score": 75,
  "maxScore": 100,
  "adequacio": {"score": 8, "max": 10, "comment": "..."},
  "coherencia": {"score": 7, "max": 10, "comment": "..."},
  "correccio": {"score": 6, "max": 10, "comment": "..."},
  "lèxic": {"score": 5, "max": 10, "comment": "..."},
  "feedback": "comentari general",
  "correctedVersion": "versió corregida del text",
  "tips": ["consell 1", "consell 2"]
}

Respon NOMÉS amb el JSON.`,

  // Classify a batch of error records
  classify_error: (data) => `Ets un professor de català especialitzat en classificar errors d'aprenents A1.

Per cada error registrat, assigna UNA categoria i una regla concisa:

Categories permeses (valor exacte):
- "ortografia": accents, lletres incorrectes
- "conjugacio": conjugació verbal (temps, persona, mode)
- "genere_nombre": gènere (masculí/femení) o nombre (singular/plural)
- "lexic": paraula o vocabulari incorrecte
- "ordre": ordre de paraules o sintaxi
- "altre": qualsevol altre tipus

La "rule" ha de ser un identificador curt (kebab-case) que descriu el patró concret, p.ex. "accent-obert-e", "verb-ser-present-1sg", "plural-masc-s", "article-el-la".

Errors:
${JSON.stringify(data.errors || [], null, 2)}

Respon NOMÉS amb JSON: [{"id":"...","category":"...","rule":"..."}]`,

  // Evaluate oral expression (transcribed)
  evaluate_oral: (data) => `Ets un examinador del CPNL (nivell A1). L'alumne ha parlat sobre: "${data.task}"

Transcripció del que ha dit: "${data.transcription}"

Avalua la seva expressió oral (basant-te en la transcripció):
- Fluïdesa (frases completes?)
- Pronúncia (errors evidents en la transcripció?)
- Vocabulari (adequat al tema?)
- Gramàtica (correcta per al nivell A1?)

Respon en JSON estricte:
{
  "score": 70,
  "maxScore": 100,
  "fluïdesa": {"score": 7, "max": 10, "comment": "..."},
  "vocabulari": {"score": 8, "max": 10, "comment": "..."},
  "gramàtica": {"score": 6, "max": 10, "comment": "..."},
  "feedback": "comentari general encoratjador",
  "corrections": ["correcció 1", "correcció 2"],
  "modelAnswer": "una resposta model que l'alumne podria dir"
}

Respon NOMÉS amb el JSON.`,
};

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
    const { action, data } = body;

    if (!action || !ACTIONS[action]) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action. Use: generate_exercises, correct_writing, evaluate_exam, evaluate_oral, classify_error' }) };
    }

    const systemPrompt = ACTIONS[action](data || {});

    const payload = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      messages: [{ role: 'user', content: systemPrompt }],
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

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(text);
      return { statusCode: 200, headers, body: JSON.stringify({ result: parsed }) };
    } catch {
      // If not valid JSON, return as text
      return { statusCode: 200, headers, body: JSON.stringify({ result: text }) };
    }
  } catch (err) {
    console.error('Error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error de connexió amb la IA', detail: err.message }) };
  }
};
