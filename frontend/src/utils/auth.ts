const TOKEN_KEY = 'psytrainer_token'
const USER_KEY  = 'psytrainer_user'

export function saveAuth(token: string, user: any) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser(): any | null {
  const s = localStorage.getItem(USER_KEY)
  return s ? JSON.parse(s) : null
}