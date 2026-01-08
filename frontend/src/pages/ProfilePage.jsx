import React, { useEffect, useState } from 'react'

function ProfilePage({ apiBase, token, user, onUserUpdated, onNotify, onBack }) {
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '' })
  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' })

  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('')

  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const MAX_PHOTO_BYTES = 5 * 1024 * 1024
  const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

  useEffect(() => {
    setForm({ name: user?.name ?? '', email: user?.email ?? '' })
  }, [user?.name, user?.email])

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    }
  }, [photoPreviewUrl])

  function showError(message) {
    setError(message)
    setSuccess('')
    onNotify?.('error', message)
  }

  function showSuccess(message) {
    setSuccess(message)
    setError('')
    onNotify?.('info', message)
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

  async function readErrorResponse(res, fallback) {
    const contentType = res.headers?.get?.('content-type') ?? ''

    if (contentType.includes('application/json')) {
      const data = await res.json().catch(() => ({}))
      return getErrorMessage(data, fallback)
    }

    const text = await res.text().catch(() => '')
    const short = text ? text.slice(0, 280).trim() : ''
    return short ? `${fallback} (HTTP ${res.status}): ${short}` : `${fallback} (HTTP ${res.status})`
  }

  async function saveProfile(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (isSavingProfile) return
    setIsSavingProfile(true)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const res = await fetch(`${apiBase}/profile`, {
        method: 'PATCH',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: form.name, email: form.email }),
      })

      if (!res.ok) {
        showError(await readErrorResponse(res, 'Failed to update profile'))
        return
      }

      const data = await res.json().catch(() => ({}))
      onUserUpdated(data.user ?? user)
      showSuccess('Profile updated.')
    } catch {
      showError('Failed to update profile')
    } finally {
      clearTimeout(timeout)
      setIsSavingProfile(false)
    }
  }

  async function savePassword(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (isSavingPassword) return
    setIsSavingPassword(true)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const res = await fetch(`${apiBase}/profile/password`, {
        method: 'PATCH',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pw),
      })

      if (!res.ok) {
        showError(await readErrorResponse(res, 'Failed to update password'))
        return
      }

      const data = await res.json().catch(() => ({}))
      onUserUpdated(data.user ?? user)
      setPw({ current_password: '', password: '', password_confirmation: '' })
      showSuccess('Password updated.')
    } catch {
      showError('Failed to update password')
    } finally {
      clearTimeout(timeout)
      setIsSavingPassword(false)
    }
  }

  function onPickPhoto(file) {
    setError('')
    setSuccess('')

    if (file) {
      if (file.size > MAX_PHOTO_BYTES) {
        setPhotoFile(null)
        if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
        setPhotoPreviewUrl('')
        showError('Profile picture must be 5MB or smaller.')
        return
      }

      if (file.type && !ALLOWED_PHOTO_TYPES.has(file.type)) {
        setPhotoFile(null)
        if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
        setPhotoPreviewUrl('')
        showError('Profile picture must be a JPG, PNG, or WEBP image.')
        return
      }
    }

    setPhotoFile(file)

    if (!file) {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
      setPhotoPreviewUrl('')
      return
    }

    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setPhotoPreviewUrl(URL.createObjectURL(file))
  }

  async function uploadPhoto(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!photoFile) {
      showError('Pick a photo first.')
      return
    }

    if (photoFile.size > MAX_PHOTO_BYTES) {
      showError('Profile picture must be 5MB or smaller.')
      return
    }

    if (photoFile.type && !ALLOWED_PHOTO_TYPES.has(photoFile.type)) {
      showError('Profile picture must be a JPG, PNG, or WEBP image.')
      return
    }

    if (isUploadingPhoto) return
    setIsUploadingPhoto(true)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    try {
      const body = new FormData()
      body.append('photo', photoFile)

      const res = await fetch(`${apiBase}/profile/photo`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body,
      })

      if (!res.ok) {
        showError(await readErrorResponse(res, 'Failed to upload photo'))
        return
      }

      const data = await res.json().catch(() => ({}))
      onUserUpdated(data.user ?? user)
      setPhotoFile(null)
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
      setPhotoPreviewUrl('')
      showSuccess('Profile photo updated.')
    } catch {
      showError('Failed to upload photo')
    } finally {
      clearTimeout(timeout)
      setIsUploadingPhoto(false)
    }
  }

  const avatarUrl = photoPreviewUrl || user?.profile_photo_url

  return (
    <>
      <div className="dg-cardHeader">
        <h1 className="dg-cardTitle">My Profile</h1>
        <p className="dg-cardHint">Edit your account info.</p>
      </div>

      <div className="dg-form">
        <div className="dg-scanBlock">
          <div className="dg-scanTitle">Profile picture</div>
          {avatarUrl ? <img className="dg-avatarPreview" src={avatarUrl} alt="Profile" /> : <div className="dg-pill">No photo</div>}

          <label className="dg-field">
            <span className="dg-label">Upload new picture</span>
            <input
              aria-label="Upload profile picture"
              className="dg-input dg-fileInput"
              type="file"
              accept="image/*"
              disabled={isUploadingPhoto}
              onChange={(ev) => onPickPhoto(ev.target.files?.[0] ?? null)}
            />
          </label>

          <button className="dg-btn dg-btnPrimary" type="button" onClick={uploadPhoto} disabled={isUploadingPhoto || !photoFile}>
            {isUploadingPhoto ? 'Uploading…' : 'Save picture'}
          </button>
        </div>

        <form onSubmit={saveProfile} className="dg-scanBlock">
          <div className="dg-scanTitle">Profile</div>

          <label className="dg-field">
            <span className="dg-label">Name</span>
            <input
              className="dg-input"
              type="text"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              disabled={isSavingProfile}
            />
          </label>

          <label className="dg-field">
            <span className="dg-label">Email</span>
            <input
              className="dg-input"
              type="email"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              disabled={isSavingProfile}
            />
          </label>

          <button className="dg-btn dg-btnPrimary" type="submit" disabled={isSavingProfile}>
            {isSavingProfile ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        <form onSubmit={savePassword} className="dg-scanBlock">
          <div className="dg-scanTitle">Password</div>

          <label className="dg-field">
            <span className="dg-label">Current password</span>
            <input
              className="dg-input"
              type="password"
              value={pw.current_password}
              onChange={(e) => setPw((s) => ({ ...s, current_password: e.target.value }))}
              disabled={isSavingPassword}
            />
          </label>

          <label className="dg-field">
            <span className="dg-label">New password</span>
            <input
              className="dg-input"
              type="password"
              value={pw.password}
              onChange={(e) => setPw((s) => ({ ...s, password: e.target.value }))}
              disabled={isSavingPassword}
            />
          </label>

          <label className="dg-field">
            <span className="dg-label">Confirm new password</span>
            <input
              className="dg-input"
              type="password"
              value={pw.password_confirmation}
              onChange={(e) => setPw((s) => ({ ...s, password_confirmation: e.target.value }))}
              disabled={isSavingPassword}
            />
          </label>

          <button className="dg-btn dg-btnPrimary" type="submit" disabled={isSavingPassword}>
            {isSavingPassword ? 'Saving…' : 'Update password'}
          </button>
        </form>

        {error ? null : null}
        {success ? null : null}

        <button className="dg-btn dg-btnPrimary" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </>
  )
}

export default ProfilePage
