const API = '/api/v1'

export async function apiPost(path: string, body: any, token?: string) {
  const headers: any = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  
  const res = await fetch(`${API}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Ошибка сервера')
  return data
}

export async function apiGet(path: string, token?: string) {
  const headers: any = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  
  const res = await fetch(`${API}${path}`, { headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Ошибка сервера')
  return data
}