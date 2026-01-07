import React from 'react'

function AuthPage({
  error,
  isSubmitting,
  isResolvingSession,
  loginForm,
  mode,
  registerForm,
  setError,
  setLoginForm,
  setMode,
  setRegisterForm,
  onLogin,
  onRegister,
}) {
  return (
    <>
      <div className="dg-tabs" role="tablist" aria-label="Authentication">
        <button
          type="button"
          className={mode === 'login' ? 'dg-tab dg-tabActive' : 'dg-tab'}
          disabled={isSubmitting}
          onClick={() => {
            setError('')
            setMode('login')
          }}
        >
          Login
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'dg-tab dg-tabActive' : 'dg-tab'}
          disabled={isSubmitting}
          onClick={() => {
            setError('')
            setMode('register')
          }}
        >
          Register
        </button>
      </div>

      <div className="dg-cardHeader">
        <h1 className="dg-cardTitle">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="dg-cardHint">
          {mode === 'login'
            ? 'Sign in to get personalized outfit recommendations.'
            : 'Register to start building your style profile.'}
        </p>
      </div>

      {error ? <div className="dg-alert">{error}</div> : null}

      {isResolvingSession ? <div className="dg-alert dg-alertInfo">Restoring session…</div> : null}

      {mode === 'login' ? (
        <form className="dg-form" onSubmit={onLogin}>
          <label className="dg-field">
            <span className="dg-label">Email</span>
            <input
              className="dg-input"
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
              required
              disabled={isSubmitting}
              value={loginForm.email}
              onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
            />
          </label>

          <label className="dg-field">
            <span className="dg-label">Password</span>
            <input
              className="dg-input"
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
              required
              disabled={isSubmitting}
              value={loginForm.password}
              onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
            />
          </label>

          <button className="dg-btn dg-btnPrimary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in…' : 'Login'}
          </button>
        </form>
      ) : (
        <form className="dg-form" onSubmit={onRegister}>
          <label className="dg-field">
            <span className="dg-label">Name</span>
            <input
              className="dg-input"
              placeholder="Gustavo"
              autoComplete="name"
              required
              disabled={isSubmitting}
              value={registerForm.name}
              onChange={(e) => setRegisterForm((p) => ({ ...p, name: e.target.value }))}
            />
          </label>

          <label className="dg-field">
            <span className="dg-label">Email</span>
            <input
              className="dg-input"
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
              required
              disabled={isSubmitting}
              value={registerForm.email}
              onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
            />
          </label>

          <label className="dg-field">
            <span className="dg-label">Password</span>
            <input
              className="dg-input"
              placeholder="Minimum 8 characters"
              type="password"
              autoComplete="new-password"
              required
              disabled={isSubmitting}
              value={registerForm.password}
              onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
            />
          </label>

          <button className="dg-btn dg-btnPrimary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create account'}
          </button>
        </form>
      )}
    </>
  )
}

export default AuthPage
