/**
 * Cognito auth client (directo, sin Amplify).
 * Usa USER_PASSWORD_AUTH flow.
 */

const COGNITO_ENDPOINT = 'https://cognito-idp.us-east-1.amazonaws.com/'
const CLIENT_ID = '3g4lqnlg8h3gqmb5p86nvrrk9m'
const STORAGE_KEY = 'catalapp-auth'

export interface AuthTokens {
  idToken: string
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface AuthUser {
  sub: string
  email: string
  nickname?: string
}

async function cognitoCall(target: string, body: Record<string, unknown>): Promise<unknown> {
  const r = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  })
  const data = await r.json()
  if (!r.ok) {
    const err = new Error(data?.message ?? data?.__type ?? `Cognito error ${r.status}`)
    ;(err as Error & { code?: string }).code = data?.__type
    throw err
  }
  return data
}

export async function signUp(email: string, password: string, nickname: string): Promise<void> {
  await cognitoCall('SignUp', {
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'nickname', Value: nickname },
    ],
  })
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  await cognitoCall('ConfirmSignUp', {
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
  })
}

export async function resendCode(email: string): Promise<void> {
  await cognitoCall('ResendConfirmationCode', {
    ClientId: CLIENT_ID,
    Username: email,
  })
}

interface InitiateAuthResponse {
  AuthenticationResult?: {
    IdToken: string
    AccessToken: string
    RefreshToken: string
    ExpiresIn: number
  }
}

export async function signIn(email: string, password: string): Promise<AuthTokens> {
  const data = (await cognitoCall('InitiateAuth', {
    ClientId: CLIENT_ID,
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: { USERNAME: email, PASSWORD: password },
  })) as InitiateAuthResponse
  if (!data.AuthenticationResult) throw new Error('Login fallit')
  const tokens: AuthTokens = {
    idToken: data.AuthenticationResult.IdToken,
    accessToken: data.AuthenticationResult.AccessToken,
    refreshToken: data.AuthenticationResult.RefreshToken,
    expiresAt: Date.now() + data.AuthenticationResult.ExpiresIn * 1000,
  }
  saveTokens(tokens)
  return tokens
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const data = (await cognitoCall('InitiateAuth', {
    ClientId: CLIENT_ID,
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    AuthParameters: { REFRESH_TOKEN: refreshToken },
  })) as InitiateAuthResponse
  if (!data.AuthenticationResult) throw new Error('Refresh fallit')
  const tokens: AuthTokens = {
    idToken: data.AuthenticationResult.IdToken,
    accessToken: data.AuthenticationResult.AccessToken,
    refreshToken, // refresh tokens don't rotate by default
    expiresAt: Date.now() + data.AuthenticationResult.ExpiresIn * 1000,
  }
  saveTokens(tokens)
  return tokens
}

export async function forgotPassword(email: string): Promise<void> {
  await cognitoCall('ForgotPassword', { ClientId: CLIENT_ID, Username: email })
}

export async function confirmForgotPassword(email: string, code: string, newPassword: string): Promise<void> {
  await cognitoCall('ConfirmForgotPassword', {
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
    Password: newPassword,
  })
}

export function saveTokens(tokens: AuthTokens): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}

export function loadTokens(): AuthTokens | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as AuthTokens } catch { return null }
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function userFromTokens(tokens: AuthTokens): AuthUser | null {
  const claims = decodeJwt(tokens.idToken)
  if (!claims) return null
  return {
    sub: String(claims.sub ?? ''),
    email: String(claims.email ?? ''),
    nickname: claims.nickname ? String(claims.nickname) : undefined,
  }
}

/** Returns a valid id token, refreshing if expired (with 60s safety margin). */
export async function getIdToken(): Promise<string | null> {
  const tokens = loadTokens()
  if (!tokens) return null
  if (Date.now() < tokens.expiresAt - 60_000) return tokens.idToken
  try {
    const fresh = await refreshTokens(tokens.refreshToken)
    return fresh.idToken
  } catch {
    clearTokens()
    return null
  }
}
