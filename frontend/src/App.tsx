import React, { useState, useEffect } from 'react'
import PsychotherapySession from './pages/PsychotherapySession'
import DiagnosticsSession from './pages/DiagnosticsSession'
import SessionsPage from './pages/SessionsPage'
import PatientsPage from './pages/PatientsPage'
import BillingPage from './pages/BillingPage'

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
  Navigate,
} from 'react-router-dom'
// ─────────────────────────────────────────
// ДИЗАЙН-ТОКЕНЫ
// ─────────────────────────────────────────
const C = {
  bg: '#f1f5f9',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  accent: '#2d6a4f',        // тёмно-зелёный (как на скриншоте)
  accentHover: '#1b4332',
  accentLight: '#d8f3dc',
  accentSoft: '#f0fdf4',
  indigo: '#6366f1',
  indigoLight: '#f5f3ff',
  border: '#e2e8f0',
  borderFocus: '#2d6a4f',
  danger: '#ef4444',
  dangerLight: '#fef2f2',
  success: '#22c55e',
  successLight: '#f0fdf4',
  warning: '#f59e0b',
  shadowSm: '0 1px 3px rgba(15,23,42,0.06)',
  shadowMd: '0 4px 16px rgba(15,23,42,0.08)',
  shadowLg: '0 20px 40px rgba(15,23,42,0.08)',
  shadowGreen: '0 8px 24px rgba(45,106,79,0.25)',
  radius: '12px',
  radiusLg: '20px',
  radiusXl: '28px',
}
import CreatePatient from './pages/CreatePatient'
// ─────────────────────────────────────────
// ТОКЕН-ХЕЛПЕРЫ
// ─────────────────────────────────────────
const TOKEN_KEY = 'psytrainer_token'
const USER_KEY  = 'psytrainer_user'


function saveAuth(token: string, user: any) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}
function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
function getToken(): string | null { return localStorage.getItem(TOKEN_KEY) }
function getUser(): any | null {
  const s = localStorage.getItem(USER_KEY)
  return s ? JSON.parse(s) : null
}

// ─────────────────────────────────────────
// API
// ─────────────────────────────────────────
const API = '/api/v1'

async function apiPost(path: string, body: any, token?: string) {
  const headers: any = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Ошибка сервера')
  return data
}

async function apiGet(path: string, token?: string) {
  const headers: any = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, { headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Ошибка сервера')
  return data
}

// ─────────────────────────────────────────
// GENERAL UI PRIMITIVES
// ─────────────────────────────────────────

/** Кнопка */
function Btn({
  children, onClick, type = 'button', variant = 'primary',
  loading = false, fullWidth = false, size = 'md', style: extra = {},
}: {
  children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit'
  variant?: 'primary' | 'ghost' | 'danger' | 'outline'
  loading?: boolean; fullWidth?: boolean; size?: 'sm' | 'md' | 'lg'; style?: React.CSSProperties
}) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit', fontWeight: 600, borderRadius: C.radius,
    transition: 'all 0.2s ease', opacity: loading ? 0.65 : 1,
    width: fullWidth ? '100%' : undefined,
  }
  const sizes = { sm: { fontSize: 13, padding: '8px 16px' }, md: { fontSize: 15, padding: '12px 24px' }, lg: { fontSize: 16, padding: '14px 32px' } }
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: C.accent, color: '#fff', boxShadow: C.shadowGreen },
    ghost:   { background: 'transparent', color: C.textSecondary, boxShadow: 'none' },
    danger:  { background: C.danger, color: '#fff' },
    outline: { background: 'transparent', color: C.accent, border: `1.5px solid ${C.accent}` },
  }
  return (
    <button type={type} onClick={onClick} disabled={loading}
      style={{ ...base, ...sizes[size], ...variants[variant], ...extra }}>
      {loading ? <Spinner size={16} /> : children}
    </button>
  )
}

/** Инпут */
function Field({
  label, error, rightEl, ...props
}: { label?: string; error?: string; rightEl?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: 20 }}>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <input {...props}
          onFocus={e => { setFocused(true); props.onFocus?.(e) }}
          onBlur={e => { setFocused(false); props.onBlur?.(e) }}
          style={{
            width: '100%', padding: rightEl ? '13px 44px 13px 16px' : '13px 16px',
            fontSize: 15, borderRadius: C.radius, fontFamily: 'inherit',
            border: `1.5px solid ${error ? C.danger : focused ? C.borderFocus : C.border}`,
            backgroundColor: C.surfaceAlt, color: C.textPrimary, outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }} />
        {rightEl && <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, cursor: 'pointer' }}>{rightEl}</div>}
      </div>
      {error && <p style={{ margin: '6px 0 0', fontSize: 13, color: C.danger }}>{error}</p>}
    </div>
  )
}

/** Спиннер */
function Spinner({ size = 20, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.7s linear infinite' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke={color + '44'} strokeWidth="2.5" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

/** Тост-уведомление */
function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [])
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: type === 'success' ? C.successLight : C.dangerLight,
      border: `1px solid ${type === 'success' ? C.success : C.danger}`,
      color: type === 'success' ? '#166534' : C.danger,
      padding: '14px 20px', borderRadius: C.radius, fontSize: 14, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 10, maxWidth: 360,
      boxShadow: C.shadowMd, animation: 'slideUp 0.3s ease',
    }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <span>{type === 'success' ? '✓' : '✕'}</span>
      <span>{msg}</span>
      <span onClick={onClose} style={{ marginLeft: 'auto', cursor: 'pointer', opacity: 0.6 }}>✕</span>
    </div>
  )
}

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const show = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type })
  const ToastEl = toast ? <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} /> : null
  return { show, ToastEl }
}

// ─────────────────────────────────────────
// LOGO
// ─────────────────────────────────────────
function Logo({ size = 26, linkTo = '/' }: { size?: number; linkTo?: string }) {
  const content = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
      <span style={{
        width: size + 8, height: size + 8, borderRadius: (size + 8) * 0.28,
        background: `linear-gradient(135deg, ${C.accent}, #52b788)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 20 20" fill="none">
          <path d="M10 2C6.13 2 3 5.13 3 9s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm0 3c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 10c-1.75 0-3.29-.9-4.2-2.26.02-1.39 2.8-2.16 4.2-2.16 1.4 0 4.18.77 4.2 2.16C13.29 14.1 11.75 15 10 15z" fill="white" />
        </svg>
      </span>
      <span style={{ fontSize: size, fontWeight: 800, letterSpacing: '-0.03em', color: C.textPrimary }}>
        Psy<span style={{ color: C.accent }}>Trainer</span>
      </span>
    </span>
  )
  return linkTo ? <Link to={linkTo} style={{ textDecoration: 'none' }}>{content}</Link> : content
}

// ─────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────
function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(getUser())
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const sync = () => setUser(getUser())
    window.addEventListener('auth-change', sync)
    return () => window.removeEventListener('auth-change', sync)
  }, [])

  const handleLogout = () => {
    clearAuth()
    setUser(null)
    window.dispatchEvent(new Event('auth-change'))
    navigate('/')
  }

  const navItems = [
    { to: '/', label: 'Главная' },
    { to: '/simulator', label: 'Симулятор' },
    ...(user ? [{ to: '/dashboard', label: 'Кабинет' }] : []),
    ...(user?.role === 'superadmin' || user?.role === 'university_admin'
      ? [{ to: '/admin', label: 'Админ' }] : []),
  ]

  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path))

  return (
    <nav style={{
      background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 200,
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo size={22} />

        {/* Desktop nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {navItems.map(item => (
            <Link key={item.to} to={item.to} style={{
              padding: '8px 16px', borderRadius: C.radius, textDecoration: 'none',
              fontSize: 14, fontWeight: 600,
              color: isActive(item.to) ? C.accent : C.textSecondary,
              background: isActive(item.to) ? C.accentSoft : 'transparent',
              transition: 'all 0.2s',
            }}>{item.label}</Link>
          ))}

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: `linear-gradient(135deg, ${C.accent}, #52b788)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 14, fontWeight: 700,
              }}>
                {(user.first_name || user.email || 'U')[0].toUpperCase()}
              </div>
              <Btn variant="outline" size="sm" onClick={handleLogout}>Выйти</Btn>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
              <Link to="/auth">
                <Btn variant="outline" size="sm">Войти</Btn>
              </Link>
              <Link to="/auth?tab=register">
                <Btn size="sm">Регистрация</Btn>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
<Route path="/session/:id" element={<PsychotherapySession />} />

// ─────────────────────────────────────────
// AUTH PAGE — Войти + Регистрация в одной
// ─────────────────────────────────────────
function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { show, ToastEl } = useToast()

  const initTab = new URLSearchParams(location.search).get('tab') === 'register' ? 'register' : 'login'
  const [tab, setTab] = useState<'login' | 'register'>(initTab)
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Login fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginErrors, setLoginErrors] = useState<any>({})

  // Register fields
  const [regData, setRegData] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '', role: 'student', university: '' })
  const [regErrors, setRegErrors] = useState<any>({})

  // --- Login ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: any = {}
    if (!email) errs.email = 'Введите email'
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Некорректный email'
    if (!password) errs.password = 'Введите пароль'
    if (Object.keys(errs).length) { setLoginErrors(errs); return }
    setLoading(true)
    try {
      const data = await apiPost('/auth/login', { email, password })
      saveAuth(data.access_token, { email, role: 'student' })
      // Fetch actual user info
      try {
        const me = await apiGet('/auth/me', data.access_token)
        saveAuth(data.access_token, me)
      } catch {}
      window.dispatchEvent(new Event('auth-change'))
      show('Добро пожаловать!', 'success')
      setTimeout(() => navigate('/dashboard'), 800)
    } catch (err: any) {
      show(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // --- Register ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: any = {}
    if (!regData.firstName.trim()) errs.firstName = 'Введите имя'
    if (!regData.lastName.trim()) errs.lastName = 'Введите фамилию'
    if (!regData.email) errs.email = 'Введите email'
    else if (!/\S+@\S+\.\S+/.test(regData.email)) errs.email = 'Некорректный email'
    if (!regData.password) errs.password = 'Введите пароль'
    else if (regData.password.length < 8) errs.password = 'Минимум 8 символов'
    if (regData.password !== regData.confirm) errs.confirm = 'Пароли не совпадают'
    if (Object.keys(errs).length) { setRegErrors(errs); return }
    setLoading(true)
    try {
      await apiPost('/auth/register', {
        email: regData.email,
        password: regData.password,
        first_name: regData.firstName,
        last_name: regData.lastName,
        language: 'ru',
      })
      show('Аккаунт создан! Войдите в систему.', 'success')
      setTab('login')
      setEmail(regData.email)
    } catch (err: any) {
      show(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const eyeIcon = (show: boolean) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      {show
        ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
        : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
      }
    </svg>
  )

  // Password strength
  const pwdScore = (() => {
    const p = tab === 'login' ? '' : regData.password
    if (!p) return 0
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  })()
  const pwdColors = ['', '#ef4444', '#f59e0b', '#22c55e', '#16a34a']
  const pwdLabels = ['', 'Слабый', 'Неплохо', 'Хороший', 'Надёжный']

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>
      {/* Background glows */}
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: C.accent, opacity: 0.06, filter: 'blur(80px)', top: '-10%', left: '-5%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: '#52b788', opacity: 0.07, filter: 'blur(80px)', bottom: '-5%', right: '5%', pointerEvents: 'none' }} />

      {ToastEl}

      <div style={{ background: C.surface, borderRadius: C.radiusXl, boxShadow: C.shadowLg, border: `1px solid ${C.border}`, width: '100%', maxWidth: 440, overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* Logo header */}
        <div style={{ padding: '32px 40px 0', textAlign: 'center', marginBottom: 24 }}>
          <Logo size={24} linkTo="/" />
        </div>

        {/* Tab switcher */}
        <div style={{ margin: '0 32px', background: C.surfaceAlt, borderRadius: C.radius, padding: 4, display: 'flex', marginBottom: 28 }}>
          {(['login', 'register'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 14, fontWeight: 600, borderRadius: 8, transition: 'all 0.2s',
              background: tab === t ? C.surface : 'transparent',
              color: tab === t ? C.accent : C.textSecondary,
              boxShadow: tab === t ? C.shadowSm : 'none',
            }}>
              {t === 'login' ? 'Войти' : 'Регистрация'}
            </button>
          ))}
        </div>

        <div style={{ padding: '0 40px 40px' }}>

          {/* ── LOGIN ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin}>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.4px', color: C.textPrimary }}>С возвращением</h2>
              <p style={{ color: C.textSecondary, fontSize: 14, margin: '0 0 28px' }}>Войдите, чтобы продолжить тренировку</p>

              <Field label="E-mail" type="email" placeholder="ivanova@spbgeu.ru"
                value={email} onChange={e => setEmail(e.target.value)} error={loginErrors.email} />

              <Field label="Пароль" type={showPwd ? 'text' : 'password'} placeholder="Минимум 8 символов"
                value={password} onChange={e => setPassword(e.target.value)} error={loginErrors.password}
                rightEl={<span onClick={() => setShowPwd(v => !v)}>{eyeIcon(showPwd)}</span>} />

              <div style={{ textAlign: 'right', marginTop: -12, marginBottom: 24 }}>
                <Link to="/forgot-password" style={{ fontSize: 13, color: C.accent, textDecoration: 'underline' }}>Забыли пароль?</Link>
              </div>

              <Btn type="submit" loading={loading} fullWidth size="lg">Войти</Btn>
            </form>
          )}

          {/* ── REGISTER ── */}
          {tab === 'register' && (
            <form onSubmit={handleRegister}>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.4px' }}>Создать аккаунт</h2>
              <p style={{ color: C.textSecondary, fontSize: 14, margin: '0 0 28px' }}>Зарегистрируйтесь, чтобы начать тренировки</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Имя" placeholder="Анна" value={regData.firstName}
                  onChange={e => setRegData(d => ({ ...d, firstName: e.target.value }))} error={regErrors.firstName} />
                <Field label="Фамилия" placeholder="Иванова" value={regData.lastName}
                  onChange={e => setRegData(d => ({ ...d, lastName: e.target.value }))} error={regErrors.lastName} />
              </div>

              <Field label="E-mail" type="email" placeholder="ivanova@spbgeu.ru"
                value={regData.email} onChange={e => setRegData(d => ({ ...d, email: e.target.value }))} error={regErrors.email} />

              <Field label="Пароль" type={showPwd ? 'text' : 'password'} placeholder="Минимум 8 символов"
                value={regData.password} onChange={e => setRegData(d => ({ ...d, password: e.target.value }))} error={regErrors.password}
                rightEl={<span onClick={() => setShowPwd(v => !v)}>{eyeIcon(showPwd)}</span>} />

              {/* Password strength */}
              {regData.password && (
                <div style={{ marginTop: -14, marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= pwdScore ? pwdColors[pwdScore] : C.border, transition: 'background 0.3s' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, color: pwdColors[pwdScore] }}>{pwdLabels[pwdScore]}</span>
                </div>
              )}

              <Field label="Подтверждение пароля" type={showConfirm ? 'text' : 'password'} placeholder="Повторите пароль"
                value={regData.confirm} onChange={e => setRegData(d => ({ ...d, confirm: e.target.value }))} error={regErrors.confirm}
                rightEl={<span onClick={() => setShowConfirm(v => !v)}>{eyeIcon(showConfirm)}</span>} />

              {/* Role select */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Я являюсь</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { id: 'student', label: '🎓 Студент' },
                    { id: 'teacher', label: '📋 Преподаватель' },
                    { id: 'psychologist', label: '🧠 Психолог' },
                    { id: 'researcher', label: '🔬 Исследователь' },
                  ].map(r => (
                    <div key={r.id} onClick={() => setRegData(d => ({ ...d, role: r.id })) }
                      style={{
                        padding: '10px 12px', borderRadius: C.radius, cursor: 'pointer',
                        border: `1.5px solid ${regData.role === r.id ? C.accent : C.border}`,
                        background: regData.role === r.id ? C.accentSoft : C.surfaceAlt,
                        fontSize: 13, fontWeight: 600,
                        color: regData.role === r.id ? C.accent : C.textSecondary,
                        transition: 'all 0.15s',
                      }}>{r.label}</div>
                  ))}
                </div>
              </div>

              {/* Terms */}
              <p style={{ fontSize: 12, color: C.textMuted, margin: '0 0 20px', lineHeight: 1.6 }}>
                Регистрируясь, вы принимаете{' '}
                <a href="#" style={{ color: C.accent }}>условия использования</a>{' '}
                и{' '}
                <a href="#" style={{ color: C.accent }}>политику конфиденциальности</a>
              </p>

              <Btn type="submit" loading={loading} fullWidth size="lg">Создать аккаунт</Btn>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────
function Home() {
  const navigate = useNavigate()
  const user = getUser()

  const features = [
    { icon: '🧠', title: '30+ нозологий DSM-5 / МКБ-11', desc: 'Каталог расстройств от тревожных до личностных. Каждый пациент клинически достоверен.' },
    { icon: '🎭', title: 'Конструктор пациента', desc: 'Задайте лор, анамнез, триггеры, стиль речи — языковая модель сформирует уникальную роль.' },
    { icon: '📊', title: 'Анализ каждой сессии', desc: 'После завершения система оценит вопросы, эмпатию, этику и выявит красные флаги.' },
    { icon: '🔀', title: 'Два режима работы', desc: 'Диагностика (профиль статичен) или Психотерапия (пациент меняется в ходе сессии).' },
    { icon: '🌍', title: 'Русский, English, Deutsch', desc: 'Симуляция и интерфейс на трёх языках. Диалог ведётся на выбранном вами языке.' },
    { icon: '📄', title: 'PDF-отчёт', desc: 'Скачайте полный отчёт с транскриптом и оценками — отправьте супервизору.' },
  ]

  const plans = [
    {
      name: 'Студент', price: '0 ₽', period: '/ всегда', popular: false,
      desc: 'Первое знакомство с платформой',
      features: ['3 сессии в сутки', 'Базовые сценарии', 'Текстовый чат', 'Отчёт после сессии'],
      cta: 'Начать бесплатно', ctaVariant: 'outline' as const,
    },
    {
      name: 'Профессионал', price: '390 ₽', period: '/ месяц', popular: true,
      desc: 'Для активной учёбы и практики',
      features: ['Безлимитные сессии', '30+ нозологий', 'Конструктор пациента', 'PDF-отчёты', 'Режим подсказок'],
      cta: 'Выбрать план', ctaVariant: 'primary' as const,
    },
    {
      name: 'Университет', price: 'от 30 000 ₽', period: '/ год', popular: false,
      desc: 'Лицензия для кафедры или ВУЗа',
      features: ['Неограниченные пользователи', 'Кабинет преподавателя', 'Роль супервизора', 'Закрытые пресеты', 'Поддержка 24/7'],
      cta: 'Связаться с нами', ctaVariant: 'outline' as const,
    },
  ]

  return (
    <div>
      {/* ── HERO ── */}
      <div style={{ background: `linear-gradient(135deg, #f0fdf4 0%, #dcfce7 40%, #f0fdf4 100%)`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 72px', display: 'flex', alignItems: 'center', gap: 60 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.surface, color: C.accent, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, marginBottom: 24, boxShadow: C.shadowSm, border: `1px solid ${C.accentLight}` }}>
              ⚡ Интерактивное обучение будущего
            </span>
            <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.15, margin: '0 0 20px', color: C.textPrimary }}>
              Тренируйте навыки<br />
              <span style={{ color: C.accent }}>психологического</span><br />
              консультирования
            </h1>
            <p style={{ color: C.textSecondary, fontSize: 17, lineHeight: 1.65, margin: '0 0 36px', fontWeight: 400, maxWidth: 520 }}>
              PsyTrainer — AI-тренажёр, где вы ведёте сессии с виртуальными пациентами, получаете мгновенный разбор ошибок и прокачиваете компетенции без риска навредить реальному клиенту.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Btn size="lg" onClick={() => navigate(user ? '/simulator' : '/auth')}>
                Попробовать бесплатно →
              </Btn>
              <Btn variant="outline" size="lg" onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}>
                Тарифы
              </Btn>
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 32, flexWrap: 'wrap' }}>
              {[['50 000+', 'студентов в год'], ['30+', 'нозологий DSM-5'], ['3', 'языка']].map(([n, l]) => (
                <div key={n}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.accent }}>{n}</div>
                  <div style={{ fontSize: 13, color: C.textSecondary }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual */}
          <div style={{ flexShrink: 0, width: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Mock chat bubble */}
            <div style={{ background: C.surface, borderRadius: C.radiusLg, padding: '18px 20px', boxShadow: C.shadowMd, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${C.accent}, #52b788)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 700 }}>П</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Пациент · Алексей, 34</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>ОКР · умеренная выраженность</div>
                </div>
              </div>
              <div style={{ background: C.surfaceAlt, borderRadius: 10, padding: '12px 14px', fontSize: 14, color: C.textPrimary, lineHeight: 1.6 }}>
                «Я снова опоздал на работу... проверял замок восемь раз. Жена говорит, что это ненормально, но я не могу остановиться.»
              </div>
            </div>
            <div style={{ background: C.accentSoft, border: `1px solid ${C.accentLight}`, borderRadius: C.radiusLg, padding: '14px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 6 }}>💡 Подсказка супервизора</div>
              <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>Клиент описывает навязчивые действия. Попробуйте технику открытых вопросов — уточните, что происходит внутри в момент проверки.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 12px' }}>Всё для безопасной практики</h2>
          <p style={{ color: C.textSecondary, fontSize: 16 }}>Разработано совместно с клиническими психологами на основе DSM-5 и МКБ-11</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {features.map(f => (
            <div key={f.title} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radiusLg, padding: '24px 26px', boxShadow: C.shadowSm, transition: 'box-shadow 0.2s' }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: C.textPrimary }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{ background: C.accentSoft, borderTop: `1px solid ${C.accentLight}`, borderBottom: `1px solid ${C.accentLight}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
          <h2 style={{ textAlign: 'center', fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 48px' }}>Как это работает</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {[
              { step: '01', title: 'Выберите режим', desc: 'Диагностика или Психотерапия. Выберите пациента из каталога или сгенерируйте случайного.' },
              { step: '02', title: 'Ведите сессию', desc: 'Общайтесь с AI-пациентом в чате. Включите подсказки супервизора или работайте самостоятельно.' },
              { step: '03', title: 'Получите анализ', desc: 'После сессии система оценит вопросы, эмпатию, этику. Красные флаги будут выделены.' },
              { step: '04', title: 'Скачайте отчёт', desc: 'PDF с полным транскриптом и оценками. Отправьте преподавателю или сохраните для портфолио.' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: C.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15 }}>{s.step}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PLANS ── */}
      <div id="plans" style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 12px' }}>Тарифные планы</h2>
          <p style={{ color: C.textSecondary, fontSize: 16 }}>Начните бесплатно — без ввода карты</p>
        </div>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {plans.map(plan => (
            <div key={plan.name} style={{
              background: C.surface, border: `${plan.popular ? 2 : 1}px solid ${plan.popular ? C.accent : C.border}`,
              borderRadius: C.radiusXl, padding: '36px 32px', width: 300, position: 'relative',
              boxShadow: plan.popular ? `0 20px 48px rgba(45,106,79,0.18)` : C.shadowMd,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              {plan.popular && (
                <span style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: C.accent, color: '#fff', padding: '5px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  ПОПУЛЯРНЫЙ
                </span>
              )}
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>{plan.name}</h3>
                <p style={{ color: C.textSecondary, fontSize: 13, margin: '0 0 20px' }}>{plan.desc}</p>
                <div style={{ fontSize: 32, fontWeight: 900, color: plan.popular ? C.accent : C.textPrimary, marginBottom: 4 }}>
                  {plan.price}
                </div>
                <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 24 }}>{plan.period}</div>
                <ul style={{ padding: '0 0 0 18px', margin: 0, color: C.textSecondary, fontSize: 14, lineHeight: 2.1 }}>
                  {plan.features.map(f => <li key={f}>{f}</li>)}
                </ul>
              </div>
              <div style={{ marginTop: 28 }}>
                <Btn variant={plan.ctaVariant} fullWidth
                  onClick={() => navigate(user ? '/billing' : '/auth?tab=register')}>
                  {plan.cta}
                </Btn>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

<Route path="/session/diagnostics/:id" element={<DiagnosticsSession />} />
// ─────────────────────────────────────────
// DASHBOARD (заглушка — переедет в отдельный файл)
// ─────────────────────────────────────────
function Dashboard() {
  const user = getUser()
  const navigate = useNavigate()
  if (!user) return <Navigate to="/auth" replace />
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px' }}>
        Привет, {user.first_name || user.email}! 👋
      </h1>
      <p style={{ color: C.textSecondary, margin: '0 0 36px' }}>Что будем тренировать сегодня?</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
        {[
          { icon: '🆕', title: 'Новая сессия', desc: 'Выберите режим и пациента', to: '/simulator' },
          { icon: '📋', title: 'Мои сессии', desc: 'История ваших тренировок', to: '/sessions' },
          { icon: '🧩', title: 'Пациенты', desc: 'Конструктор и каталог', to: '/patients' },
          { icon: '💳', title: 'Подписка', desc: 'Управление тарифом', to: '/billing' },
        ].map(c => (
          <div key={c.title} onClick={() => navigate(c.to)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radiusLg, padding: '24px', cursor: 'pointer', boxShadow: C.shadowSm, transition: 'box-shadow 0.2s, transform 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = C.shadowMd; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = C.shadowSm; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{c.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{c.title}</div>
            <div style={{ color: C.textSecondary, fontSize: 14 }}>{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// SIMULATOR stub
// ─────────────────────────────────────────
function Simulator() {
  const user = getUser()
  const navigate = useNavigate()
  if (!user) return <Navigate to="/auth" replace />
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 12px' }}>Выберите режим работы</h2>
      <p style={{ color: C.textSecondary, marginBottom: 36 }}>С чего начнём сессию?</p>
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[
          { icon: '🔍', title: 'Диагностика', desc: 'Выявляйте расстройство через структурированную беседу. Профиль пациента статичен.', color: '#4f46e5' },
          { icon: '💬', title: 'Психотерапия', desc: 'Проводите терапевтическую сессию. Состояние пациента меняется в ходе диалога.', color: C.accent },
        ].map(m => (
          <div key={m.title} onClick={() => navigate(`/session/new?mode=${m.title === 'Диагностика' ? 'diagnostics' : 'psychotherapy'}`)}
            style={{ background: C.surface, border: `2px solid ${C.border}`, borderRadius: C.radiusXl, padding: '40px 36px', width: 300, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', boxShadow: C.shadowSm }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = m.color; (e.currentTarget as HTMLElement).style.boxShadow = C.shadowLg }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.boxShadow = C.shadowSm }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>{m.icon}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 10px', color: m.color }}>{m.title}</h3>
            <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, lineHeight: 1.6 }}>{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '52px 24px 28px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 40, marginBottom: 48 }}>
          <div>
            <Logo size={20} />
            <p style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.7, margin: '16px 0 0' }}>
              AI-тренажёр для безопасной отработки навыков психологического консультирования. Создан для студентов и практикующих психологов.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: C.textPrimary }}>Платформа</h4>
            {['Главная', 'Симулятор', 'Тарифы', 'О проекте'].map(l => (
              <div key={l} style={{ marginBottom: 10 }}>
                <a href="#" style={{ fontSize: 14, color: C.textSecondary, textDecoration: 'none' }}>{l}</a>
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: C.textPrimary }}>Для ВУЗов</h4>
            {['B2B-лицензия', 'Кабинет преподавателя', 'Роль супервизора', 'Документы'].map(l => (
              <div key={l} style={{ marginBottom: 10 }}>
                <a href="#" style={{ fontSize: 14, color: C.textSecondary, textDecoration: 'none' }}>{l}</a>
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: C.textPrimary }}>Поддержка</h4>
            <p style={{ fontSize: 14, color: C.textSecondary, margin: '0 0 10px' }}>
              <a href="mailto:vadim231par@gmail.com" style={{ color: C.accent, textDecoration: 'none' }}>vadim231par@gmail.com</a>
            </p>
            <p style={{ fontSize: 14, color: C.textSecondary, margin: '0 0 16px' }}>
              <a href="tel:89669268669" style={{ color: C.textSecondary, textDecoration: 'none' }}>+7 966 926 86 69</a>
            </p>
            <div style={{ fontSize: 13, color: C.textMuted, background: C.accentSoft, border: `1px solid ${C.accentLight}`, borderRadius: C.radius, padding: '10px 14px' }}>
              🐾 Создатели: Вадим Артемович<br />и мини шпиц Джони
            </div>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 13, color: C.textMuted }}>© {new Date().getFullYear()} PsyTrainer. Все права защищены.</span>
          <span style={{ fontSize: 13, color: C.textMuted }}>Грант УМНИК-2026 · Фонд содействия инновациям</span>
        </div>
      </div>
    </footer>
  )
}

// ─────────────────────────────────────────
// NOT FOUND
// ─────────────────────────────────────────
function NotFound() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: 64 }}>🔍</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Страница не найдена</h2>
      <Link to="/" style={{ color: C.accent, fontWeight: 600, fontSize: 15 }}>← На главную</Link>
    </div>
  )
}

// ─────────────────────────────────────────
// FORGOT PASSWORD stub
// ─────────────────────────────────────────
function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const { show, ToastEl } = useToast()
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await apiPost('/auth/forgot-password', { email })
      setSent(true)
    } catch (err: any) { show(err.message, 'error') }
  }
  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      {ToastEl}
      <div style={{ background: C.surface, borderRadius: C.radiusXl, border: `1px solid ${C.border}`, padding: '40px', maxWidth: 400, width: '100%', boxShadow: C.shadowLg }}>
        <h2 style={{ fontWeight: 800, fontSize: 22, margin: '0 0 8px' }}>Сброс пароля</h2>
        {sent ? (
          <p style={{ color: C.textSecondary }}>Если этот email зарегистрирован — вам придёт письмо со ссылкой для сброса пароля.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ color: C.textSecondary, fontSize: 14, margin: '0 0 24px' }}>Введите email — мы пришлём ссылку для восстановления.</p>
            <Field label="E-mail" type="email" placeholder="you@example.ru" value={email} onChange={e => setEmail(e.target.value)} />
            <Btn type="submit" fullWidth>Отправить письмо</Btn>
          </form>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────
function AppShell() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: C.bg, color: C.textPrimary, WebkitFontSmoothing: 'antialiased' as any }}>
      <Navbar />
      <div style={{ flex: 1 }}>
        <Routes>
        {/* Главная */}
        <Route path="/" element={<Home />} />
          
          {/* Авторизация */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Кабинет */}
        <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Симулятор (выбор режима) */}
        <Route path="/simulator" element={<Simulator />} />
          
          {/* ===== НОВЫЕ МАРШРУТЫ ===== */}
          
          {/* Мои сессии */}
        <Route path="/sessions" element={<SessionsPage />} />
          
          {/* Пациенты */}
        <Route path="/patients" element={<PatientsPage />} />
          
          {/* Создание пациента (НОВЫЙ URI) */}
        <Route path="/patient/new" element={<CreatePatient />} />
          
          {/* СТАРЫЙ URI — для обратной совместимости */}
        <Route path="/session/new" element={<CreatePatient />} />
          
          {/* Психотерапия (НОВЫЙ URI) */}
        <Route path="/session/therapy/:id" element={<PsychotherapySession />} />
          
          {/* Диагностика (НОВЫЙ URI) */}
        <Route path="/session/diagnostics/:id" element={<DiagnosticsSession />} />
          
          {/* СТАРЫЙ URI — для обратной совместимости */}
        <Route path="/session/:id" element={<PsychotherapySession />} />
        <Route path="/diagnostics/:id" element={<DiagnosticsSession />} />
        
        <Route path="/session/diagnostics/:id" element={<DiagnosticsSession />} />
        <Route path="/billing" element={<BillingPage />} />
          
          {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </div>
      <Footer />
    </div>
  )
}



export default function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  )
}