import { useEffect, useMemo, useState } from 'react'
import '../styles/app.css'
import AuthPage from '../pages/AuthPage'
import HomePage from '../pages/HomePage'
import ProfilePage from '../pages/ProfilePage'
import logo from '../assets/dressgenius.svg'

function App() {
  const [apiStatus, setApiStatus] = useState('loading')
  const [token, setToken] = useState(() => localStorage.getItem('auth_token') ?? '')
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResolvingSession, setIsResolvingSession] = useState(false)
  const [activeView, setActiveView] = useState('home')
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [toast, setToast] = useState(null)

  const apiBase = useMemo(() => import.meta.env.VITE_API_URL, [])

  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '' })
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })

  function notify(type, message) {
    if (!message) return
    setToast({ type, message })
    window.clearTimeout(notify._t)
    notify._t = window.setTimeout(() => setToast(null), 4500)
  }

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
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    fetch(`${apiBase}/health`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setApiStatus(data.status ?? 'unknown'))
      .catch(() => setApiStatus('error'))
      .finally(() => clearTimeout(timeout))

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [apiBase])

  useEffect(() => {
    if (!token) {
      setUser(null)
      setActiveView('home')
      return
    }

    setIsResolvingSession(true)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    fetch(`${apiBase}/me`, {
      signal: controller.signal,
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
        setUser(null)
      })
      .finally(() => {
        clearTimeout(timeout)
        setIsResolvingSession(false)
      })

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
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
      setActiveView('home')
      setIsProfileOpen(false)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="dg-shell">
      {toast ? (
        <div className="dg-toastWrap" aria-live="polite" aria-atomic="true">
          <div className={toast.type === 'error' ? 'dg-toast dg-toastError' : 'dg-toast dg-toastInfo'}>
            <div className="dg-toastText">{toast.message}</div>
            <button className="dg-toastClose" type="button" aria-label="Dismiss" onClick={() => setToast(null)}>
              ×
            </button>
          </div>
        </div>
      ) : null}

      <div className="dg-topbarSlot">
        <header className="dg-topbar">
          <div className="dg-topbarInner">
            <div className="dg-brand">
              <img className="dg-logo" src={logo} alt="DressGenius" />
              <div className="dg-brandText">
                <div className="dg-title">DressGenius</div>
                <div className="dg-subtitle">AI-powered outfit recommendations</div>
              </div>
            </div>
            <div className="dg-meta">
              {user ? (
                <div className="dg-profile">
                  <button
                    className="dg-profileBtn"
                    type="button"
                    aria-label="Profile menu"
                    onClick={() => setIsProfileOpen((v) => !v)}
                  >
                    {user?.profile_photo_url ? (
                      <img className="dg-avatarImg" src={user.profile_photo_url} alt="Profile" />
                    ) : (
                      user?.email?.slice(0, 1)?.toUpperCase() || 'U'
                    )}
                  </button>

                  {isProfileOpen ? (
                    <div className="dg-profileMenu" role="menu">
                      <button
                        className="dg-profileItem"
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setActiveView('profile')
                          setIsProfileOpen(false)
                        }}
                      >
                        My Profile
                      </button>
                      <button
                        className="dg-profileItem"
                        type="button"
                        role="menuitem"
                        onClick={() => logout()}
                        disabled={isSubmitting}
                      >
                        Logout
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </header>
      </div>

      <main className="dg-main">
        <div className="dg-card">
          {user ? (
            activeView === 'profile' ? (
              <ProfilePage
                apiBase={apiBase}
                token={token}
                user={user}
                onUserUpdated={(nextUser) => setUser(nextUser)}
                onNotify={notify}
                onBack={() => setActiveView('home')}
              />
            ) : (
              <HomePage user={user} isSubmitting={isSubmitting} onLogout={logout} />
            )
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
