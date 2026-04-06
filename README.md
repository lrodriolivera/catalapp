# CatalApp

Aplicacio gratuita per aprendre catala amb IA | Aplicacion gratuita para aprender catalan con IA | Free app to learn Catalan with AI

**https://catala.strixai.es**

---

## CA - Catala

### Que es CatalApp?

Una aplicacio web gratuita per aprendre catala de nivell A1, dissenyada per a estudiants del CPNL (Consorci per a la Normalitzacio Linguistica) a Barcelona. Utilitza intel-ligencia artificial per a converses en temps real i exercicis interactius.

### Seccions

| Seccio | Descripcio |
|---|---|
| **Inici** | Learning path vertical amb progres per unitat |
| **Gramatica** | Conjugacions, vocabulari, temes gramaticals i exercicis interactius |
| **Conversa** | Xat amb IA (Claude Haiku 4.5) amb mode veu push-to-talk |
| **Pronunciacio** | Escolta i repeteix amb Web Speech API i barra de similitud |
| **Dialegs** | 15 converses amb reproductor d'audio linia per linia |
| **Avaluacio** | Mode practica (feedback immediat) i mode examen (resultats al final) |

### Contingut

- 3 unitats del curs A1 (Hola com et dius?, La familia, On vius?)
- 88 exercicis (fill-blank, multiple-choice, word-order, match-pairs, listen-write)
- 285 paraules de vocabulari amb exemples i audio
- 12 verbs conjugats en present d'indicatiu
- 13 temes de gramatica amb explicacions i exemples
- 15 dialegs amb personatges reals
- Sistema de progres amb XP i ratxa diaria

---

## ES - Espanol

### Que es CatalApp?

Una aplicacion web gratuita para aprender catalan de nivel A1, disenada para estudiantes del CPNL (Consorci per a la Normalitzacio Linguistica) en Barcelona. Utiliza inteligencia artificial para conversaciones en tiempo real y ejercicios interactivos.

### Secciones

| Seccion | Descripcion |
|---|---|
| **Inicio** | Learning path vertical con progreso por unidad |
| **Gramatica** | Conjugaciones, vocabulario, temas gramaticales y ejercicios interactivos |
| **Conversa** | Chat con IA (Claude Haiku 4.5) con modo voz push-to-talk |
| **Pronunciacion** | Escucha y repite con Web Speech API y barra de similitud |
| **Dialogos** | 15 conversaciones con reproductor de audio linea por linea |
| **Evaluacion** | Modo practica (feedback inmediato) y modo examen (resultados al final) |

### Contenido

- 3 unidades del curso A1 (Hola como te llamas?, La familia, Donde vives?)
- 88 ejercicios (completar, seleccion multiple, ordenar palabras, emparejar, escuchar y escribir)
- 285 palabras de vocabulario con ejemplos y audio
- 12 verbos conjugados en presente de indicativo
- 13 temas de gramatica con explicaciones y ejemplos
- 15 dialogos con personajes reales
- Sistema de progreso con XP y racha diaria

---

## EN - English

### What is CatalApp?

A free web app to learn Catalan at A1 level, designed for students of the CPNL (Consorci per a la Normalitzacio Linguistica) in Barcelona. It uses artificial intelligence for real-time conversations and interactive exercises.

### Sections

| Section | Description |
|---|---|
| **Home** | Vertical learning path with per-unit progress |
| **Grammar** | Conjugations, vocabulary, grammar topics and interactive exercises |
| **Conversation** | AI chat (Claude Haiku 4.5) with push-to-talk voice mode |
| **Pronunciation** | Listen and repeat with Web Speech API and similarity bar |
| **Dialogues** | 15 conversations with line-by-line audio player |
| **Assessment** | Practice mode (instant feedback) and exam mode (results at end) |

### Content

- 3 units from the A1 course (Hello what's your name?, Family, Where do you live?)
- 88 exercises (fill-blank, multiple-choice, word-order, match-pairs, listen-write)
- 285 vocabulary words with examples and audio
- 12 verbs conjugated in present indicative
- 13 grammar topics with explanations and examples
- 15 dialogues with real characters
- Progress system with XP and daily streak

---

## Stack tecnic / Stack tecnico / Tech stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS v4, Nunito font
- **IA:** AWS Bedrock - Claude Haiku 4.5 via Lambda + API Gateway
- **Audio:** Web Speech API (TTS + STT) amb suport catala
- **Hosting:** AWS S3 + CloudFront (static export)
- **PWA:** Installable des del navegador mobil

## Infraestructura AWS / AWS Infrastructure

```
User (mobile/web)
    | HTTPS
CloudFront (catala.strixai.es)
    |
S3 (catalapp-web) --> Static HTML/JS/CSS

User writes/speaks in Conversa
    | POST /conversa
API Gateway HTTP
    |
Lambda (catalapp-conversa)
    | InvokeModel
Bedrock --> Claude Haiku 4.5
    |
Response in Catalan --> User
```

| Service | Region | Usage |
|---|---|---|
| S3 | eu-west-1 | Static website hosting |
| CloudFront | Global | CDN with HTTPS |
| ACM | us-east-1 | SSL certificate for catala.strixai.es |
| API Gateway | us-east-1 | HTTP API, POST /conversa, CORS enabled |
| Lambda | us-east-1 | Node.js 20.x, 256MB, 30s timeout |
| Bedrock | us-east-1 | Claude Haiku 4.5 for AI conversations |

## Desenvolupament local / Desarrollo local / Local development

```bash
npm install
npm run dev
```

Create `.env.local`:
```
BEDROCK_ACCESS_KEY_ID=<your-key>
BEDROCK_SECRET_ACCESS_KEY=<your-secret>
BEDROCK_REGION=us-east-1
```

## Deploy

```bash
# Build
rm -rf .next out && npx next build

# Upload to S3
aws s3 sync out/ s3://catalapp-web --delete --profile catalapp

# Clean URLs
for p in gramatica avaluacio conversa pronunciacio dialegs; do
  aws s3 cp "s3://catalapp-web/${p}.html" "s3://catalapp-web/${p}/index.html" \
    --cache-control "public, max-age=0, must-revalidate" \
    --content-type "text/html" --profile catalapp
done
aws s3 cp out/index.html s3://catalapp-web/index.html \
  --cache-control "public, max-age=0, must-revalidate" \
  --content-type "text/html" --profile catalapp

# Invalidate cache
aws cloudfront create-invalidation --distribution-id E3GB48CRVUE4EE \
  --paths "/*" --profile catalapp
```

## Lambda (Conversa IA)

```bash
cd lambda/conversa
npm install
zip -r /tmp/catalapp-conversa.zip .
aws lambda update-function-code \
  --function-name catalapp-conversa \
  --zip-file fileb:///tmp/catalapp-conversa.zip \
  --region us-east-1 --profile catalapp
```

Bedrock credentials are configured as Lambda environment variables, never in code.

## Llicencia / Licencia / License

**GNU Affero General Public License v3.0 (AGPL-3.0)**

This project is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See [LICENSE](LICENSE) for the full text.

---

Created by [Luis Armando Rodriguez](https://strixai.es) | [StrixAI](https://strixai.es)
