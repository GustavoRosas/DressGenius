import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { within } from '@testing-library/react'
import AuthPage from '../../pages/AuthPage'

describe('AuthPage', () => {
  it('switches between login and register modes', () => {
    const setMode = vi.fn()

    render(
      <AuthPage
        error=""
        isSubmitting={false}
        isResolvingSession={false}
        loginForm={{ email: '', password: '' }}
        registerForm={{ name: '', email: '', password: '' }}
        mode="login"
        setError={() => undefined}
        setLoginForm={() => undefined}
        setMode={setMode}
        setRegisterForm={() => undefined}
        onLogin={() => undefined}
        onRegister={() => undefined}
      />,
    )

    const tabs = screen.getByRole('tablist', { name: 'Authentication' })

    fireEvent.click(within(tabs).getByRole('button', { name: 'Register' }))
    expect(setMode).toHaveBeenCalledWith('register')

    fireEvent.click(within(tabs).getByRole('button', { name: 'Login' }))
    expect(setMode).toHaveBeenCalledWith('login')
  })

  it('disables tab buttons when submitting', () => {
    render(
      <AuthPage
        error=""
        isSubmitting={true}
        isResolvingSession={false}
        loginForm={{ email: '', password: '' }}
        registerForm={{ name: '', email: '', password: '' }}
        mode="login"
        setError={() => undefined}
        setLoginForm={() => undefined}
        setMode={() => undefined}
        setRegisterForm={() => undefined}
        onLogin={() => undefined}
        onRegister={() => undefined}
      />,
    )

    expect(screen.getByRole('button', { name: 'Login' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Register' })).toBeDisabled()
  })

  it('calls onLogin when login form is submitted', () => {
    const onLogin = vi.fn((e) => e.preventDefault())

    render(
      <AuthPage
        error=""
        isSubmitting={false}
        isResolvingSession={false}
        loginForm={{ email: 'a@b.com', password: 'x' }}
        registerForm={{ name: '', email: '', password: '' }}
        mode="login"
        setError={() => undefined}
        setLoginForm={() => undefined}
        setMode={() => undefined}
        setRegisterForm={() => undefined}
        onLogin={onLogin}
        onRegister={() => undefined}
      />,
    )

    const form = screen.getByPlaceholderText('you@example.com').closest('form')
    expect(form).toBeTruthy()
    fireEvent.submit(form)
    expect(onLogin).toHaveBeenCalled()
  })
})
