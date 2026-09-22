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

export async function handleGitHubAuthStart(request: Request, env: Env): Promise<Response> {
  try {
    const config = await getSysConfig(env)
    const clientId = config.githubClientId
    const clientSecret = config.githubClientSecret

    if (!clientId || !clientSecret) {
      const headers = new Headers()
      headers.set('Content-Type', 'application/json')
      return json({ success: false, message: 'GitHub 登录未配置，请联系管理员' }, headers, 503)
    }

    const returnUrl = new URL(request.url).searchParams.get('return') || '/'
    const state = base64urlEncode(JSON.stringify({ return: returnUrl }))

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: 'https://omdsh.com/api/auth/github/callback',
      scope: 'user:email',
      state,
    })

    return Response.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`, 302)
  }
  catch (err) {
    console.error('handleGitHubAuthStart error:', err)
    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    const msg = err instanceof Error ? err.message : String(err)
    return json({ success: false, message: '服务器内部错误: ' + msg.slice(0, 100) }, headers, 500)
  }
}

export async function handleGitHubCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    return Response.redirect('https://omdsh.com/?error=github_denied', 302)
  }

  if (!code) {
    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    return json({ success: false, message: '缺少授权码' }, headers, 400)
  }

  const config = await getSysConfig(env)
  const clientId = config.githubClientId!
  const clientSecret = config.githubClientSecret!

  // Exchange code for access token
  let accessToken: string
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: 'https://omdsh.com/api/auth/github/callback',
      }),
    })

    const tokenData = await tokenRes.json() as { access_token?: string; error?: string }
    if (!tokenData.access_token) {
      console.error('GitHub token exchange failed:', tokenData)
      return Response.redirect('https://omdsh.com/?error=github_token_failed', 302)
    }
    accessToken = tokenData.access_token
  }
  catch (err) {
    console.error('GitHub token exchange error:', err)
    return Response.redirect('/?error=github_token_failed', 302)
  }

  // Get user info
  let githubUser: { id: number; login: string; avatar_url: string; email: string | null }
  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    })
    if (!userRes.ok) {
      const bodyText = await userRes.text()
      console.error('GitHub userinfo failed:', userRes.status, bodyText)
      return Response.redirect('https://omdsh.com/?error=github_userinfo_failed', 302)
    }
    githubUser = await userRes.json() as typeof githubUser
  }
  catch (err) {
    console.error('GitHub userinfo error:', err)
    return Response.redirect('https://omdsh.com/?error=github_userinfo_failed', 302)
  }

  // Get primary email if not public
  let email = githubUser.email
  if (!email) {
    try {
      const emailRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
        },
      })
      if (emailRes.ok) {
        const emails = await emailRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>
        const primary = emails.find(e => e.primary && e.verified)
        email = primary?.email || emails.find(e => e.verified)?.email || null
      }
    }
    catch { /* ignore */ }
  }

  if (!email) {
    return Response.redirect('https://omdsh.com/?error=github_no_email', 302)
  }

  const githubId = String(githubUser.id)

  // Find user by github_id
  let user = await first(env, 'SELECT * FROM users WHERE github_id = ?', [githubId])

  if (!user) {
    // Try to find by email and link
    user = await first(env, 'SELECT * FROM users WHERE email = ?', [email])
    if (user) {
      await run(env, 'UPDATE users SET github_id = ? WHERE uid = ?', [githubId, user.uid])
    }
    else {
      // Create new user
      const uid = randomId('u')
      const point = 100
      const role = 'USER'
      const now = nowIso()
      const secretKey = randomId('')
      const username = githubUser.login

      await run(env, `
        INSERT INTO users (uid, created_at, updated_at, username, password_hash, email, github_id, avatar_url, point, post_count, comment_count, role, level, status, secret_key)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 1, 'NORMAL', ?)
      `, [uid, now, now, username, 'GITHUB_OAUTH', email, githubId, githubUser.avatar_url || '', point, role, secretKey])

      user = await first(env, 'SELECT * FROM users WHERE uid = ?', [uid])
    }
  }

  if (!user) {
    return Response.redirect('https://omdsh.com/?error=github_user_creation_failed', 302)
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
  let returnTo = 'https://omdsh.com/'
  if (state) {
    try {
      const decoded = JSON.parse(base64urlDecode(state))
      if (decoded?.return) {
        const ret = decoded.return
        returnTo = ret.startsWith('http') ? ret : `https://omdsh.com${ret.startsWith('/') ? ret : '/' + ret}`
      }
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
