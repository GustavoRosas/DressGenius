import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ProfilePage from '../../pages/ProfilePage'

function jsonResponse(body, { status = 200, headers = {} } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (k) => {
        const key = String(k).toLowerCase()
        const map = Object.fromEntries(Object.entries(headers).map(([a, b]) => [String(a).toLowerCase(), b]))
        return map[key] ?? null
      },
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

describe('ProfilePage', () => {
  const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
  const token = 't'
  const baseUser = {
    id: 1,
    name: 'Jane',
    email: 'jane@example.com',
    profile_photo_url: null,
  }

  let fetchMock
  let originalCreateObjectURL
  let originalRevokeObjectURL

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    originalCreateObjectURL = globalThis.URL?.createObjectURL
    originalRevokeObjectURL = globalThis.URL?.revokeObjectURL

    if (globalThis.URL) {
      globalThis.URL.createObjectURL = vi.fn(() => 'blob:preview')
      globalThis.URL.revokeObjectURL = vi.fn()
    }
  })

  afterEach(() => {
    if (globalThis.URL) {
      if (originalCreateObjectURL) globalThis.URL.createObjectURL = originalCreateObjectURL
      else delete globalThis.URL.createObjectURL

      if (originalRevokeObjectURL) globalThis.URL.revokeObjectURL = originalRevokeObjectURL
      else delete globalThis.URL.revokeObjectURL
    }

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function renderPage(overrides = {}) {
    const onUserUpdated = vi.fn()
    const onNotify = vi.fn()
    const onBack = vi.fn()

    render(
      <ProfilePage
        apiBase={apiBase}
        token={token}
        user={baseUser}
        onUserUpdated={onUserUpdated}
        onNotify={onNotify}
        onBack={onBack}
        {...overrides}
      />
    )

    return { onUserUpdated, onNotify, onBack }
  }

  it('renders header and triggers onBack when top back button is clicked', () => {
    const { onBack } = renderPage()

    expect(screen.getByText('My Profile')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Back' })[0])
    expect(onBack).toHaveBeenCalled()
  })

  it('saves profile changes via PATCH /profile', async () => {
    const { onUserUpdated, onNotify } = renderPage()

    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          user: { ...baseUser, name: 'Jane Updated', email: 'new@example.com' },
        },
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jane Updated' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, opts] = fetchMock.mock.calls[0]

    expect(url).toBe(`${apiBase}/profile`)
    expect(opts.method).toBe('PATCH')
    expect(opts.headers.Authorization).toBe(`Bearer ${token}`)
    expect(opts.headers.Accept).toBe('application/json')
    expect(opts.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(opts.body)).toEqual({ name: 'Jane Updated', email: 'new@example.com' })

    await waitFor(() => expect(onUserUpdated).toHaveBeenCalled())
    expect(onNotify).toHaveBeenCalledWith('info', 'Profile updated.')
  })

  it('toggles password form and submits via PATCH /profile/password', async () => {
    const { onUserUpdated, onNotify } = renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Change password' }))

    const current = screen.getByLabelText('Current password')
    const next = screen.getByLabelText('New password')
    const confirm = screen.getByLabelText('Confirm new password')

    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          message: 'Password updated.',
          user: baseUser,
        },
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    fireEvent.change(current, { target: { value: 'oldpass123' } })
    fireEvent.change(next, { target: { value: 'newpass123' } })
    fireEvent.change(confirm, { target: { value: 'newpass123' } })

    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, opts] = fetchMock.mock.calls[0]

    expect(url).toBe(`${apiBase}/profile/password`)
    expect(opts.method).toBe('PATCH')
    expect(opts.headers.Authorization).toBe(`Bearer ${token}`)
    expect(opts.headers.Accept).toBe('application/json')
    expect(opts.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(opts.body)).toEqual({
      current_password: 'oldpass123',
      password: 'newpass123',
      password_confirmation: 'newpass123',
    })

    await waitFor(() => expect(onUserUpdated).toHaveBeenCalled())
    expect(onNotify).toHaveBeenCalledWith('info', 'Password updated.')

    await waitFor(() => {
      expect(screen.getByLabelText('Current password')).toHaveValue('')
      expect(screen.getByLabelText('New password')).toHaveValue('')
      expect(screen.getByLabelText('Confirm new password')).toHaveValue('')
    })
  })

  it('validates profile photo size before uploading', async () => {
    const { onNotify } = renderPage()

    const input = screen.getByLabelText('Upload profile picture')

    const bigFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [bigFile] } })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(onNotify).toHaveBeenCalledWith('error', 'Profile picture must be 5MB or smaller.')
  })

  it('uploads a valid photo via POST /profile/photo', async () => {
    const onUserUpdated = vi.fn()
    const onNotify = vi.fn()

    render(
      <ProfilePage apiBase={apiBase} token={token} user={baseUser} onUserUpdated={onUserUpdated} onNotify={onNotify} onBack={() => undefined} />
    )

    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          user: { ...baseUser, profile_photo_url: 'http://example.com/p.jpg' },
        },
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const input = screen.getByLabelText('Upload profile picture')
    const okFile = new File([new ArrayBuffer(1024)], 'ok.webp', { type: 'image/webp' })

    fireEvent.change(input, { target: { files: [okFile] } })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, opts] = fetchMock.mock.calls[0]

    expect(url).toBe(`${apiBase}/profile/photo`)
    expect(opts.method).toBe('POST')
    expect(opts.headers.Authorization).toBe(`Bearer ${token}`)
    expect(opts.headers.Accept).toBe('application/json')
    expect(opts.body).toBeInstanceOf(FormData)

    await waitFor(() => expect(onUserUpdated).toHaveBeenCalled())
    expect(onNotify).toHaveBeenCalledWith('info', 'Profile photo updated.')
  })
})
