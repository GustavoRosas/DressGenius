import { useEffect, useMemo, useState } from 'react'
import '../styles/app.css'
import AuthPage from '../pages/AuthPage'
import HomePage from '../pages/HomePage'
import logo from '../assets/dressgenius.svg'

function App() {
  const [apiStatus, setApiStatus] = useState('loading')
  const [token, setToken] = useState(() => localStorage.getItem('auth_token') ?? '')
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResolvingSession, setIsResolvingSession] = useState(false)

  const apiBase = useMemo(() => import.meta.env.VITE_API_URL, [])

  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '' })
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })

  function getErrorMessage(data, fallback) {
    if (!data || typeof data !== 'object') return fallback
    if (typeof data.message === 'string' && data.message.trim()) return data.message
    if (data.errors && typeof data.errors === 'object') {
      for (const val of Object.values(data.errors)) {
        if (Array.isArray(val) && typeof val[0] === 'string' && val[0].trim()) return val[0]
      }
    }
    return fallback
  }

  useEffect(() => {
    fetch(`${apiBase}/health`)
      .then((r) => r.json())
      .then((data) => setApiStatus(data.status ?? 'unknown'))
      .catch(() => setApiStatus('error'))
  }, [apiBase])

  useEffect(() => {
    if (!token) {
      setUser(null)
      return
    }

    setIsResolvingSession(true)

    fetch(`${apiBase}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error('Unauthorized')
        return r.json()
      })
      .then((data) => setUser(data.user ?? null))
      .catch(() => {
        localStorage.removeItem('auth_token')
        setToken('')
        setUser(null)
      })
      .finally(() => setIsResolvingSession(false))
  }, [apiBase, token])

  async function register(e) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const res = await fetch(`${apiBase}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerForm),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(getErrorMessage(data, 'Register failed'))
        return
      }

      localStorage.setItem('auth_token', data.token)
      setToken(data.token)
      setUser(data.user)
      setRegisterForm({ name: '', email: '', password: '' })
      setMode('login')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function login(e) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const res = await fetch(`${apiBase}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginForm),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(getErrorMessage(data, 'Login failed'))
        return
      }

      localStorage.setItem('auth_token', data.token)
      setToken(data.token)
      setUser(data.user)
      setLoginForm({ email: '', password: '' })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function logout() {
    setError('')

    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      if (token) {
        await fetch(`${apiBase}/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => undefined)
      }
    } finally {
      localStorage.removeItem('auth_token')
      setToken('')
      setUser(null)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="dg-shell">
      <header className="dg-topbar">
        <div className="dg-brand">
          <img className="dg-logo" src={logo} alt="DressGenius" />
          <div className="dg-brandText">
            <div className="dg-title">DressGenius</div>
            <div className="dg-subtitle">AI-powered outfit recommendations</div>
          </div>
        </div>
        <div className="dg-meta">
          API: <span className={apiStatus === 'ok' ? 'dg-pill dg-pillOk' : 'dg-pill'}>{apiStatus}</span>
        </div>
      </header>

      <main className="dg-main">
        <div className="dg-card">
          {user ? (
            <HomePage user={user} isSubmitting={isSubmitting} onLogout={logout} />
          ) : (
            <AuthPage
              error={error}
              isSubmitting={isSubmitting}
              isResolvingSession={isResolvingSession}
              loginForm={loginForm}
              mode={mode}
              registerForm={registerForm}
              setError={setError}
              setLoginForm={setLoginForm}
              setMode={setMode}
              setRegisterForm={setRegisterForm}
              onLogin={login}
              onRegister={register}
            />
          )}
        </div>
      </main>
    </div>
  )
}

export default App
