import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.BEDROCK_ACCESS_KEY_ID,
    secretAccessKey: process.env.BEDROCK_SECRET_ACCESS_KEY,
  },
});

const SCENARIOS = {
  // Unitat 1
  'presentacions': "L'alumne practica presentar-se: dir el nom, l'edat, la procedència i la professió.",
  'telefon': "L'alumne practica parlar per telèfon: saludar, identificar-se, demanar informació.",
  'oficina': "L'alumne practica presentar-se a la feina: dir el càrrec, preguntar per les instal·lacions.",
  // Unitat 2
  'familia': "L'alumne practica parlar de la seva família: membres, descripcions físiques i de caràcter.",
  'descriure': "L'alumne practica descriure persones: aspecte físic, caràcter, roba.",
  'felicitar': "L'alumne practica felicitar per aniversaris i convidar a festes.",
  // Unitat 3
  'habitatge': "L'alumne practica descriure on viu: adreça, tipus d'habitatge, parts de la casa.",
  'barri': "L'alumne practica parlar del seu barri: serveis, botigues, transport.",
  'buscar_pis': "L'alumne practica buscar pis: preguntar preu, habitacions, serveis.",
  // Unitat 4
  'rutina': "L'alumne practica parlar de la rutina diària: hores, dies de la setmana, activitats quotidianes.",
  'hores': "L'alumne practica dir i preguntar les hores en català: sistema de quarts.",
  'cap_setmana': "L'alumne practica parlar del que fa els caps de setmana: oci, esport, família.",
  // Unitat 5
  'gustos': "L'alumne practica parlar dels seus gustos i preferències: m'agrada, m'encanta, prefereixo, no m'agrada.",
  'quedar': "L'alumne practica quedar amb amics: proposar activitats, acordar hora i lloc, transport.",
  'transport': "L'alumne practica parlar del transport públic a Barcelona: metro, autobús, bici, com arribar a llocs.",
  // Unitat 6
  'comprar': "L'alumne practica comprar al mercat: demanar productes, quantitats, preus i pagar.",
  'aliments': "L'alumne practica parlar dels àpats: què menja per esmorzar, dinar i sopar.",
  'receptes': "L'alumne practica explicar ingredients i quantitats per cuinar un plat.",
  // Unitat 7
  'restaurant': "L'alumne practica demanar menjar i beure al restaurant: primer plat, segon plat, postres, begudes, el compte.",
  'plats_catalans': "L'alumne practica conèixer i parlar sobre plats típics catalans: pa amb tomàquet, escalivada, crema catalana, botifarra, calçots.",
  'feina_restaurant': "L'alumne practica parlar de la feina: horaris, sou, jornada, contracte, condicions laborals.",
  // Unitat 8
  'indicacions': "L'alumne practica demanar i donar indicacions per la ciutat: girar, continuar recte, creuar, preposicions de lloc.",
  'serveis': "L'alumne practica trobar serveis públics: hospital, CAP, comissaria, correus, biblioteca, ajuntament.",
  'emergencia': "L'alumne practica actuar en emergències: trucar al 112, demanar ambulància, policia, bombers.",
  // Unitat 9
  'tramits': "L'alumne practica fer tràmits: empadronar-se, targeta sanitària, NIE, demanar cita, omplir formularis.",
  'metge': "L'alumne practica anar al metge: explicar símptomes, demanar cita al CAP, recepta, farmàcia.",
  'documents': "L'alumne practica parlar de documents: DNI, NIE, passaport, certificats, contractes.",
  // Unitat 10
  'descripcions': "L'alumne practica descriure persones: aspecte físic, caràcter, roba que porten, colors.",
  'roba': "L'alumne practica parlar de roba: colors, talles, comprar roba, el que porta posat.",
  'formal': "L'alumne practica el registre formal (vostè) i informal (tu): presentacions, salutacions, demanar coses.",
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
