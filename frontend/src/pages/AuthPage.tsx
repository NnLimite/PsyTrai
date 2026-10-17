import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { C } from '../components/tokens';
import { apiPost, apiGet } from '../services/api'
import { saveAuth } from '../utils/auth'
import { Btn } from '../components/UI/Btn'
import { Field } from '../components/UI/Field'
import { useToast } from '../components/UI/Toast'
import {Logo } from '../components/UI/Logo';

export function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { show, ToastEl } = useToast()

  const initTab = new URLSearchParams(location.search).get('tab') === 'register' ? 'register' : 'login'
  const [tab, setTab] = useState<'login' | 'register'>(initTab)
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginErrors, setLoginErrors] = useState<any>({})

  const [regData, setRegData] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '', role: 'student', university: '' })
  const [regErrors, setRegErrors] = useState<any>({})

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: any = {}
    if (!email) errs.email = 'Введите email'
    if (!password) errs.password = 'Введите пароль'
    if (Object.keys(errs).length) { setLoginErrors(errs); return }
    setLoading(true)
    try {
      const data = await apiPost('/auth/login', { email, password })
      saveAuth(data.access_token, { email, role: 'student' })
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: any = {}
    if (!regData.firstName.trim()) errs.firstName = 'Введите имя'
    if (!regData.lastName.trim()) errs.lastName = 'Введите фамилию'
    if (!regData.email) errs.email = 'Введите email'
    if (!regData.password || regData.password.length < 8) errs.password = 'Минимум 8 символов'
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

  const eyeIcon = (visible: boolean) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      {visible
        ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
        : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
      }
    </svg>
  )

  const pwdScore = (() => {
    const p = tab === 'login' ? '' : regData.password
    if (!p) return 0
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    return s ? s + 1 : 1
  })()
  const pwdColors = ['', '#ef4444', '#f59e0b', '#22c55e', '#16a34a']
  const pwdLabels = ['', 'Слабый', 'Неплохо', 'Хороший', 'Надёжный']

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>
      {ToastEl}
      <div style={{ background: C.surface, borderRadius: C.radiusXl, boxShadow: C.shadowLg, border: `1px solid ${C.border}`, width: '100%', maxWidth: 440, padding: '40px 40px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}><Logo size={24} /></div>
        
        <div style={{ background: C.surfaceAlt, borderRadius: C.radius, padding: 4, display: 'flex', marginBottom: 28 }}>
          {(['login', 'register'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, borderRadius: 8, background: tab === t ? C.surface : 'transparent', color: tab === t ? C.accent : C.textSecondary }}>
              {t === 'login' ? 'Войти' : 'Регистрация'}
            </button>
          ))}
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <Field label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} error={loginErrors.email} />
            <Field label="Пароль" type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} error={loginErrors.password} rightEl={<span onClick={() => setShowPwd(!showPwd)}>{eyeIcon(showPwd)}</span>} />
            <Btn type="submit" loading={loading} fullWidth size="lg">Войти</Btn>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Имя" value={regData.firstName} onChange={e => setRegData({...regData, firstName: e.target.value})} error={regErrors.firstName} />
              <Field label="Фамилия" value={regData.lastName} onChange={e => setRegData({...regData, lastName: e.target.value})} error={regErrors.lastName} />
            </div>
            <Field label="E-mail" type="email" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} error={regErrors.email} />
            <Field label="Пароль" type={showPwd ? 'text' : 'password'} value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} error={regErrors.password} rightEl={<span onClick={() => setShowPwd(!showPwd)}>{eyeIcon(showPwd)}</span>} />
            
            {regData.password && (
              <div style={{ marginTop: -14, marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= pwdScore ? pwdColors[pwdScore] : C.border }} />
                  ))}
                </div>
                <span style={{ fontSize: 11, color: pwdColors[pwdScore] }}>{pwdLabels[pwdScore]}</span>
              </div>
            )}

            <Field label="Подтверждение" type={showConfirm ? 'text' : 'password'} value={regData.confirm} onChange={e => setRegData({...regData, confirm: e.target.value})} error={regErrors.confirm} rightEl={<span onClick={() => setShowConfirm(!showConfirm)}>{eyeIcon(showConfirm)}</span>} />
            <Btn type="submit" loading={loading} fullWidth size="lg">Создать аккаунт</Btn>
          </form>
        )}
      </div>
    </div>
  )
}