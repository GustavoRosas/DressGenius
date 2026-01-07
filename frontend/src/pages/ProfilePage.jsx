import React, { useEffect, useState } from 'react'

function ProfilePage({ apiBase, token, user, onUserUpdated, onBack }) {
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '' })
  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' })

  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('')

  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setForm({ name: user?.name ?? '', email: user?.email ?? '' })
  }, [user?.name, user?.email])

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    }
  }, [photoPreviewUrl])

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
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: form.name, email: form.email }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(getErrorMessage(data, 'Failed to update profile'))
        return
      }

      onUserUpdated(data.user ?? user)
      setSuccess('Profile updated.')
    } catch {
      setError('Failed to update profile')
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
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pw),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(getErrorMessage(data, 'Failed to update password'))
        return
      }

      onUserUpdated(data.user ?? user)
      setPw({ current_password: '', password: '', password_confirmation: '' })
      setSuccess('Password updated.')
    } catch {
      setError('Failed to update password')
    } finally {
      clearTimeout(timeout)
      setIsSavingPassword(false)
    }
  }

  function onPickPhoto(file) {
    setError('')
    setSuccess('')
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
      setError('Pick a photo first.')
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
        },
        body,
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(getErrorMessage(data, 'Failed to upload photo'))
        return
      }

      onUserUpdated(data.user ?? user)
      setPhotoFile(null)
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
      setPhotoPreviewUrl('')
      setSuccess('Profile photo updated.')
    } catch {
      setError('Failed to upload photo')
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
          {avatarUrl ? <img className="dg-image dg-imagePreview" src={avatarUrl} alt="Profile" /> : <div className="dg-pill">No photo</div>}

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

        {error ? <div className="dg-alert">{error}</div> : null}
        {success ? <div className="dg-alert dg-alertInfo">{success}</div> : null}

        <button className="dg-btn dg-btnPrimary" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </>
  )
}

export default ProfilePage
