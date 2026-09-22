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
    return json({ success: false, message: '缺少授权码' }, new Headers(), 400)
  }

  const config = await getSysConfig(env)
  const clientId = config.githubClientId!
  const clientSecret = config.githubClientSecret!

  let accessToken: string
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'omdsh.com/1.0',
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
      return Response.redirect('https://omdsh.com/?error=github_token_failed', 302)
    }
    accessToken = tokenData.access_token
  }
  catch {
    return Response.redirect('https://omdsh.com/?error=github_token_failed', 302)
  }

  let githubUser: { id: number; login: string; avatar_url: string; email: string | null }
  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'omdsh.com/1.0',
      },
    })
    if (!userRes.ok) {
      return Response.redirect('https://omdsh.com/?error=github_userinfo_failed', 302)
    }
    githubUser = await userRes.json() as typeof githubUser
  }
  catch {
    return Response.redirect('https://omdsh.com/?error=github_userinfo_failed', 302)
  }

  let email = githubUser.email
  if (!email) {
    try {
      const emailRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'omdsh.com/1.0',
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
  const githubLogin = githubUser.login
  const githubAvatar = githubUser.avatar_url || ''

  const existingByGithub = await first(env, 'SELECT * FROM users WHERE github_id = ?', [githubId])
  if (existingByGithub) {
    return issueLogin(env, existingByGithub, state)
  }

  const existingByEmail = await first(env, 'SELECT * FROM users WHERE email = ?', [email])

  if (existingByEmail) {
    if (existingByEmail.password_hash === 'GOOGLE_OAUTH' || existingByEmail.password_hash === 'GITHUB_OAUTH') {
      await run(env, 'UPDATE users SET github_id = ? WHERE uid = ?', [githubId, existingByEmail.uid])
      return issueLogin(env, existingByEmail, state)
    }

    const linkToken = randomId('gl_')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    await run(env,
      'INSERT OR REPLACE INTO github_link_tokens (token, github_id, github_login, github_avatar, email, uid, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [linkToken, githubId, githubLogin, githubAvatar, email, existingByEmail.uid, expiresAt],
    )

    const returnTo = state ? (() => {
      try {
        const decoded = JSON.parse(base64urlDecode(state))
        return decoded?.return || '/'
      }
      catch { return '/' }
    })() : '/'

    return Response.redirect(`https://omdsh.com/member/link-github?token=${linkToken}&return=${encodeURIComponent(returnTo)}`, 302)
  }

  const uid = randomId('u')
  const point = 100
  const role = 'USER'
  const now = nowIso()
  const secretKey = randomId('')
  const username = githubLogin

  await run(env, `
    INSERT INTO users (uid, created_at, updated_at, username, password_hash, email, github_id, avatar_url, point, post_count, comment_count, role, level, status, secret_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 1, 'NORMAL', ?)
  `, [uid, now, now, username, 'GITHUB_OAUTH', email, githubId, githubAvatar, point, role, secretKey])

  const newUser = await first(env, 'SELECT * FROM users WHERE uid = ?', [uid])
  if (!newUser) {
    return Response.redirect('https://omdsh.com/?error=github_user_creation_failed', 302)
  }

  return issueLogin(env, newUser, state)
}

export async function handleGitHubLinkConfirm(request: Request, env: Env): Promise<Response> {
  const body = await request.json().catch(() => null)
  const token = String(body?.token || '')
  const password = String(body?.password || '')

  if (!token || !password) {
    return json({ success: false, message: '参数错误' }, new Headers(), 400)
  }

  const linkRow = await first(env, 'SELECT * FROM github_link_tokens WHERE token = ?', [token])
  if (!linkRow) {
    return json({ success: false, message: '链接已失效，请重新尝试 GitHub 登录' }, new Headers(), 400)
  }
  if (linkRow.expires_at < nowIso()) {
    await run(env, 'DELETE FROM github_link_tokens WHERE token = ?', [token])
    return json({ success: false, message: '链接已过期，请重新尝试 GitHub 登录' }, new Headers(), 400)
  }

  const user = await first(env, 'SELECT * FROM users WHERE uid = ?', [linkRow.uid])
  if (!user) {
    return json({ success: false, message: '用户不存在' }, new Headers(), 400)
  }

  const { verifyPassword } = await import('./auth')
  const passwordOk = await verifyPassword(password, user.password_hash)
  if (!passwordOk) {
    return json({ success: false, message: '密码错误' }, new Headers(), 400)
  }

  await run(env, 'UPDATE users SET github_id = ?, updated_at = ? WHERE uid = ?', [linkRow.github_id, nowIso(), user.uid])
  await run(env, 'DELETE FROM github_link_tokens WHERE token = ?', [token])

  const tokenPayload = {
    uid: user.uid,
    userId: Number(user.id),
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  }
  const newToken = await createToken(tokenPayload, env)
  const cookie = buildCookie(getTokenKey(env), newToken, 30 * 24 * 60 * 60 * 1000, env)

  return new Response(null, {
    status: 302,
    headers: {
      Location: 'https://omdsh.com/',
      'Set-Cookie': cookie,
    },
  })
}

async function issueLogin(env: Env, user: any, state: string | null): Promise<Response> {
  await run(env, 'UPDATE users SET last_login = ? WHERE uid = ?', [nowIso(), user.uid])

  const tokenPayload = {
    uid: user.uid,
    userId: Number(user.id),
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  }
  const token = await createToken(tokenPayload, env)
  const cookie = buildCookie(getTokenKey(env), token, 30 * 24 * 60 * 60 * 1000, env)

  let returnTo = 'https://omdsh.com/'
  if (state) {
    try {
      const decoded = JSON.parse(base64urlDecode(state))
      if (decoded?.return) {
        const ret = decoded.return
        returnTo = ret.startsWith('http') ? ret : `https://omdsh.com${ret.startsWith('/') ? ret : '/' + ret}`
      }
    }
    catch { /* ignore */ }
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: returnTo,
      'Set-Cookie': cookie,
    },
  })
}
