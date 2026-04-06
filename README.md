# CatalApp

Aplicacio gratuita per aprendre catala amb IA. Dissenyada per a estudiants de nivell A1 del CPNL (Consorci per a la Normalitzacio Linguistica) a Barcelona.

**https://catala.strixai.es**

## Seccions

| Seccio | Descripcio |
|---|---|
| **Inici** | Learning path vertical amb progres per unitat |
| **Gramatica** | Conjugacions, vocabulari, temes gramaticals i exercicis interactius |
| **Conversa** | Xat amb IA (Claude Haiku 4.5) amb mode veu push-to-talk |
| **Pronunciacio** | Escolta i repeteix amb Web Speech API i barra de similitud |
| **Dialegs** | 15 converses amb reproductor d'audio linia per linia |
| **Avaluacio** | Mode practica (feedback immediat) i mode examen (resultats al final) |

## Contingut

- 3 unitats del curs A1 (Hola com et dius?, La familia, On vius?)
- 88 exercicis (fill-blank, multiple-choice, word-order, match-pairs, listen-write)
- 285 paraules de vocabulari amb exemples i audio
- 12 verbs conjugats en present d'indicatiu
- 13 temes de gramatica amb explicacions i exemples
- 15 dialegs amb personatges reals
- Sistema de progres amb XP i ratxa diaria (localStorage)

## Stack tecnic

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS v4, Nunito font
- **IA:** AWS Bedrock - Claude Haiku 4.5 via Lambda + API Gateway
- **Audio:** Web Speech API (TTS + STT) amb suport catala
- **Hosting:** AWS S3 + CloudFront (static export)
- **PWA:** Installable des del navegador mobil

## Infraestructura AWS

```
Usuari (mobil/web)
    | HTTPS
CloudFront (catala.strixai.es)
    |
S3 (catalapp-web) --> HTML/JS/CSS estatics

Usuari escriu/parla en Conversa
    | POST /conversa
API Gateway HTTP
    |
Lambda (catalapp-conversa)
    | InvokeModel
Bedrock --> Claude Haiku 4.5
    |
Resposta en catala --> Usuari
```

### Serveis utilitzats

| Servei | Regio | Us |
|---|---|---|
| S3 | eu-west-1 | Hosting static amb website hosting habilitat |
| CloudFront | Global | CDN amb HTTPS, redirect HTTP a HTTPS |
| ACM | us-east-1 | Certificat SSL per catala.strixai.es |
| API Gateway | us-east-1 | HTTP API amb ruta POST /conversa, CORS habilitat |
| Lambda | us-east-1 | Node.js 20.x, 256MB, 30s timeout, proxy a Bedrock |
| Bedrock | us-east-1 | Claude Haiku 4.5 per a conversa amb IA |
| IAM | Global | Rol per Lambda, politica per deploy |

### DNS (Google Cloud DNS)

| Tipus | Nom | Valor |
|---|---|---|
| CNAME | catala.strixai.es | d2zn6sxl1rlq40.cloudfront.net |

## Desenvolupament local

```bash
# Instal·lar dependencies
npm install

# Servidor de desenvolupament
npm run dev

# Build estatic
npm run build
```

Crear `.env.local` amb:
```
BEDROCK_ACCESS_KEY_ID=<your-key>
BEDROCK_SECRET_ACCESS_KEY=<your-secret>
BEDROCK_REGION=us-east-1
```

## Deploy

```bash
# Build
rm -rf .next out && npx next build

# Pujar a S3
aws s3 sync out/ s3://catalapp-web --delete --profile catalapp

# Copiar HTML per a clean URLs
for p in gramatica avaluacio conversa pronunciacio dialegs; do
  aws s3 cp "s3://catalapp-web/${p}.html" "s3://catalapp-web/${p}/index.html" \
    --cache-control "public, max-age=0, must-revalidate" \
    --content-type "text/html" --profile catalapp
done
aws s3 cp out/index.html s3://catalapp-web/index.html \
  --cache-control "public, max-age=0, must-revalidate" \
  --content-type "text/html" --profile catalapp

# Invalidar cache
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

Les credencials de Bedrock es configuren com a variables d'entorn de la Lambda, mai al codi.

## Llicencia

Projecte gratuit per a la comunitat catalana a Barcelona.

Creat per [Luis Armando Rodriguez](https://strixai.es) amb l'ajuda de Claude (Anthropic).
