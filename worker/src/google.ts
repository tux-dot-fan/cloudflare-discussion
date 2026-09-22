import type { Env } from './types'
import { json, nowIso, randomId } from './utils'
import { createToken, buildCookie, getTokenKey } from './auth'
import { first, run } from './db'
import { getSysConfig } from './config'

function base64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(str: string): string {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4)
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
}

export async function handleGoogleAuthStart(request: Request, env: Env): Promise<Response> {
  try {
    const config = await getSysConfig(env)
    const clientId = config.googleClientId
    const clientSecret = config.googleClientSecret

    if (!clientId || !clientSecret) {
      const headers = new Headers()
      headers.set('Content-Type', 'application/json')
      return json({ success: false, message: 'Google 登录未配置，请联系管理员' }, headers, 503)
    }

    const returnUrl = new URL(request.url).searchParams.get('return') || '/'
    const state = base64urlEncode(JSON.stringify({ return: returnUrl }))

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: 'https://omdsh.com/api/auth/google/callback',
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    })

    return Response.redirect(`https://accounts.google.com/o/oauth2/auth?${params.toString()}`, 302)
  }
  catch (err) {
    console.error('handleGoogleAuthStart error:', err)
    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    const msg = err instanceof Error ? err.message : String(err)
    return json({ success: false, message: '服务器内部错误: ' + msg.slice(0, 100) }, headers, 500)
  }
}

export async function handleGoogleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    return Response.redirect('/?error=google_denied', 302)
  }

  if (!code) {
    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    return json({ success: false, message: '缺少授权码' }, headers, 400)
  }

  const config = await getSysConfig(env)
  const clientId = config.googleClientId!
  const clientSecret = config.googleClientSecret!

  // Exchange code for tokens
  let tokenData: { access_token: string }
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: 'https://omdsh.com/api/auth/google/callback',
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      console.error('Google token exchange failed:', await tokenRes.text())
      return Response.redirect('/?error=google_token_failed', 302)
    }
    tokenData = await tokenRes.json() as { access_token: string }
  }
  catch (err) {
    console.error('Google token exchange error:', err)
    return Response.redirect('/?error=google_token_failed', 302)
  }

  // Get user info
  let googleUser: { id: string; email: string; name: string; picture: string }
  try {
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    if (!userInfoRes.ok) {
      console.error('Google userinfo failed:', await userInfoRes.text())
      return Response.redirect('/?error=google_userinfo_failed', 302)
    }
    googleUser = await userInfoRes.json() as typeof googleUser
  }
  catch (err) {
    console.error('Google userinfo error:', err)
    return Response.redirect('/?error=google_userinfo_failed', 302)
  }

  // Find user by google_id
  let user = await first(env, 'SELECT * FROM users WHERE google_id = ?', [googleUser.id])

  if (!user) {
    // Try to find by email and link
    user = await first(env, 'SELECT * FROM users WHERE email = ?', [googleUser.email])
    if (user) {
      await run(env, 'UPDATE users SET google_id = ? WHERE uid = ?', [googleUser.id, user.uid])
    }
    else {
      // Create new user
      const uid = randomId('u')
      const point = 100
      const role = 'USER'
      const now = nowIso()
      const secretKey = randomId('')
      const username = googleUser.name || googleUser.email.split('@')[0]

      await run(env, `
        INSERT INTO users (uid, created_at, updated_at, username, password_hash, email, google_id, avatar_url, point, post_count, comment_count, role, level, status, secret_key)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 1, 'NORMAL', ?)
      `, [uid, now, now, username, 'GOOGLE_OAUTH', googleUser.email, googleUser.id, googleUser.picture || '', point, role, secretKey])

      user = await first(env, 'SELECT * FROM users WHERE uid = ?', [uid])
    }
  }

  if (!user) {
    return Response.redirect('/?error=google_user_creation_failed', 302)
  }

  // Update last login
  await run(env, 'UPDATE users SET last_login = ? WHERE uid = ?', [nowIso(), user.uid])

  // Issue token
  const tokenPayload = {
    uid: user.uid,
    userId: Number(user.id),
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  }
  const token = await createToken(tokenPayload, env)
  const cookie = buildCookie(getTokenKey(env), token, 30 * 24 * 60 * 60 * 1000, env)

  // Determine return URL from state
  let returnTo = '/'
  if (state) {
    try {
      const decoded = JSON.parse(base64urlDecode(state))
      if (decoded?.return) returnTo = decoded.return
    }
    catch { /* ignore invalid state */ }
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: returnTo,
      'Set-Cookie': cookie,
    },
  })
}
