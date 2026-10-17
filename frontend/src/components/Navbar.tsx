import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { C } from './tokens';
import { getUser, clearAuth } from '../utils/auth'
import { Btn } from './UI/Btn'
import { Logo } from './UI/Logo';

export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(getUser())

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
    ...(user?.role === 'superadmin' || user?.role === 'university_admin' ? [{ to: '/admin', label: 'Админ' }] : []),
  ]

  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path))

  return (
    <nav style={{
      background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 200,
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo size={22} />

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
              <Link to="/auth"><Btn variant="outline" size="sm">Войти</Btn></Link>
              <Link to="/auth?tab=register"><Btn size="sm">Регистрация</Btn></Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}