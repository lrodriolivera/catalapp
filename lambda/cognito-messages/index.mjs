const PRIMARY = '#1E7BD9'
const PRIMARY_DARK = '#0B5BAF'
const PRIMARY_SOFT = '#DCEAF7'
const GOLD = '#FFC400'
const SITE_URL = 'https://catala.strixai.es'

const MASCOT_IMG = `<img src="${SITE_URL}/mascot.png" alt="CatalApp" width="100" height="100" style="display:block;margin:0 auto;width:100px;height:100px;" />`

function emailLayout({ titleCa, titleEs, bodyCa, bodyEs, code, ctaLabelCa, ctaLabelEs, ctaUrl }) {
  const codeBox = code
    ? `<div style="background:${PRIMARY_SOFT};border:2px solid ${PRIMARY};border-radius:16px;padding:20px;margin:24px 0;text-align:center;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${PRIMARY_DARK};margin:0 0 8px;">El teu codi · Tu código</p>
        <p style="font-size:36px;font-weight:900;letter-spacing:12px;color:${PRIMARY_DARK};margin:0;font-family:'Courier New',monospace;">${code}</p>
      </div>`
    : ''
  const cta = ctaUrl
    ? `<p style="text-align:center;margin:28px 0 16px;"><a href="${ctaUrl}" style="display:inline-block;background:${PRIMARY};color:#fff;text-decoration:none;font-weight:800;font-size:16px;padding:14px 32px;border-radius:14px;border-bottom:4px solid ${PRIMARY_DARK};text-transform:uppercase;letter-spacing:1px;">${ctaLabelCa} · ${ctaLabelEs}</a></p>`
    : ''

  return `<!doctype html>
<html lang="ca">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:Arial,Helvetica,sans-serif;color:#1F1F1F;">
  <div style="max-width:580px;margin:0 auto;padding:32px 16px;">
    <!-- Header amb mascota -->
    <div style="text-align:center;margin-bottom:8px;">
      ${MASCOT_IMG}
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <span style="display:inline-block;background:${PRIMARY};color:#fff;font-size:22px;font-weight:900;letter-spacing:1px;padding:8px 20px;border-radius:12px;border-bottom:4px solid ${PRIMARY_DARK};">CatalApp</span>
      <p style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#767676;margin:10px 0 0;">Aprèn català · Aprende catalán</p>
    </div>

    <!-- Card principal -->
    <div style="background:#fff;border-radius:20px;padding:36px 32px;border:2px solid #E0E0E0;border-bottom-width:5px;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
      <!-- Català -->
      <h1 style="color:${PRIMARY_DARK};font-size:22px;font-weight:900;margin:0 0 12px;">${titleCa}</h1>
      <p style="font-size:16px;line-height:1.6;color:#4A4A4A;margin:0 0 8px;">${bodyCa}</p>

      ${codeBox}

      <!-- Separador -->
      <div style="border-top:2px dashed ${PRIMARY_SOFT};margin:28px 0;"></div>

      <!-- Castellano -->
      <h2 style="color:${PRIMARY_DARK};font-size:18px;font-weight:800;margin:0 0 12px;">${titleEs}</h2>
      <p style="font-size:15px;line-height:1.6;color:#4A4A4A;margin:0 0 8px;">${bodyEs}</p>

      ${cta}
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;padding:16px;">
      <p style="font-size:12px;color:#A3A3A3;margin:0 0 8px;line-height:1.5;">
        Si no has demanat aquest correu, ignora'l.<br/>
        Si no has solicitado este correo, ignóralo.
      </p>
      <p style="font-size:11px;color:#B0B0B0;margin:0;">
        <a href="${SITE_URL}" style="color:${PRIMARY};text-decoration:none;font-weight:700;">catala.strixai.es</a> · Fet amb 💙 a Barcelona
      </p>
    </div>
  </div>
</body>
</html>`
}

const TEMPLATES = {
  CustomMessage_SignUp: {
    subject: '🎉 CatalApp · Confirma el teu correu · Confirma tu correo',
    build: () => ({
      titleCa: 'Benvingut/da a CatalApp! 🎊',
      titleEs: '¡Bienvenido/a a CatalApp!',
      bodyCa: 'Gràcies per unir-te a la comunitat d\'aprenentatge de català més divertida! Introdueix aquest codi a l\'aplicació per activar el teu compte:',
      bodyEs: 'Gracias por unirte a la comunidad de aprendizaje de catalán más divertida. Introduce este código en la aplicación para activar tu cuenta:',
      ctaLabelCa: 'Obrir CatalApp',
      ctaLabelEs: 'Abrir CatalApp',
      ctaUrl: `${SITE_URL}/signin`,
    }),
  },
  CustomMessage_ResendCode: {
    subject: 'CatalApp · Nou codi de verificació · Nuevo código',
    build: () => ({
      titleCa: 'Aquí tens un codi nou 🔑',
      titleEs: 'Aquí tienes un código nuevo',
      bodyCa: 'Has demanat un nou codi de verificació per al teu compte CatalApp:',
      bodyEs: 'Has solicitado un nuevo código de verificación para tu cuenta CatalApp:',
      ctaLabelCa: 'Obrir CatalApp',
      ctaLabelEs: 'Abrir CatalApp',
      ctaUrl: `${SITE_URL}/signin`,
    }),
  },
  CustomMessage_ForgotPassword: {
    subject: '🔒 CatalApp · Recupera la contrasenya · Recupera tu contraseña',
    build: () => ({
      titleCa: 'Recuperació de contrasenya',
      titleEs: 'Recuperación de contraseña',
      bodyCa: 'Has demanat restablir la teva contrasenya. Introdueix aquest codi a l\'aplicació per crear-ne una de nova:',
      bodyEs: 'Has solicitado restablecer tu contraseña. Introduce este código en la aplicación para crear una nueva:',
      ctaLabelCa: 'Tornar al login',
      ctaLabelEs: 'Volver al login',
      ctaUrl: `${SITE_URL}/signin`,
    }),
  },
  CustomMessage_UpdateUserAttribute: {
    subject: 'CatalApp · Verifica el correu nou · Verifica tu nuevo correo',
    build: () => ({
      titleCa: 'Confirma el teu correu nou ✉️',
      titleEs: 'Confirma tu nuevo correo',
      bodyCa: 'Has demanat canviar el correu electrònic del teu compte CatalApp. Introdueix aquest codi per confirmar el canvi:',
      bodyEs: 'Has solicitado cambiar el correo electrónico de tu cuenta CatalApp. Introduce este código para confirmar el cambio:',
      ctaLabelCa: 'Anar al perfil',
      ctaLabelEs: 'Ir al perfil',
      ctaUrl: `${SITE_URL}/perfil`,
    }),
  },
  CustomMessage_VerifyUserAttribute: {
    subject: 'CatalApp · Verifica el correu · Verifica tu correo',
    build: () => ({
      titleCa: 'Verifica el teu correu',
      titleEs: 'Verifica tu correo',
      bodyCa: 'Introdueix aquest codi a l\'aplicació per confirmar el teu correu electrònic:',
      bodyEs: 'Introduce este código en la aplicación para confirmar tu correo electrónico:',
      ctaLabelCa: 'Anar al perfil',
      ctaLabelEs: 'Ir al perfil',
      ctaUrl: `${SITE_URL}/perfil`,
    }),
  },
  CustomMessage_AdminCreateUser: {
    subject: '🎉 CatalApp · Has estat convidat! · ¡Has sido invitado!',
    build: (event) => {
      const tempPass = event.request?.usernameParameter ? `{####}` : '{####}'
      return {
        titleCa: 'T\'han convidat a CatalApp! 🎊',
        titleEs: '¡Te han invitado a CatalApp!',
        bodyCa: `Algú t'ha convidat a aprendre català amb CatalApp. El teu nom d'usuari és <strong>${event.request?.usernameParameter || event.userName}</strong> i la teva contrasenya temporal és:`,
        bodyEs: `Alguien te ha invitado a aprender catalán con CatalApp. Tu nombre de usuario es <strong>${event.request?.usernameParameter || event.userName}</strong> y tu contraseña temporal es:`,
        ctaLabelCa: 'Començar',
        ctaLabelEs: 'Empezar',
        ctaUrl: `${SITE_URL}/signin`,
      }
    },
  },
  CustomMessage_Authentication: {
    subject: '🔐 CatalApp · Codi de seguretat · Código de seguridad',
    build: () => ({
      titleCa: 'Codi de seguretat',
      titleEs: 'Código de seguridad',
      bodyCa: 'Utilitza aquest codi per completar l\'inici de sessió al teu compte CatalApp:',
      bodyEs: 'Utiliza este código para completar el inicio de sesión en tu cuenta CatalApp:',
      ctaLabelCa: 'Obrir CatalApp',
      ctaLabelEs: 'Abrir CatalApp',
      ctaUrl: `${SITE_URL}/signin`,
    }),
  },
}

export const handler = async (event) => {
  const trigger = event.triggerSource
  const code = event.request?.codeParameter ?? '{####}'
  const tpl = TEMPLATES[trigger]
  if (!tpl) {
    return event
  }
  const content = { ...tpl.build(event), code }
  event.response.emailSubject = tpl.subject
  event.response.emailMessage = emailLayout(content)
  event.response.smsMessage = `CatalApp · Codi/Código: ${code}`
  return event
}
