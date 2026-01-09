import React, { useEffect, useMemo, useState } from 'react'

function OutfitScanPage({ user, isSubmitting, onBack }) {
  const apiBase = useMemo(() => import.meta.env.VITE_API_URL, [])

  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [scan, setScan] = useState(null)
  const [scanError, setScanError] = useState('')
  const [isScanning, setIsScanning] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function resetScan() {
    setScanError('')
    setScan(null)
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
  }

  function onPickFile(file) {
    setScanError('')
    setScan(null)
    setSelectedFile(file)

    if (!file) {
      setPreviewUrl('')
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  async function analyzeOutfit() {
    setScanError('')

    if (!selectedFile) {
      setScanError('Pick an image first.')
      return
    }

    const token = localStorage.getItem('auth_token') ?? ''
    if (!token) {
      setScanError('Missing auth token. Please login again.')
      return
    }

    setIsScanning(true)

    try {
      const form = new FormData()
      form.append('image', selectedFile)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 60000)

      const res = await fetch(`${apiBase}/outfit-scans`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      })

      const data = await res.json().catch(() => ({}))
      clearTimeout(timeout)
      if (!res.ok) {
        setScanError(data?.message || 'Scan failed')
        return
      }

      setScan(data?.scan ?? null)
    } catch {
      setScanError('Scan failed')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <>
      <div className="dg-cardHeader">
        <h1 className="dg-cardTitle">Analyze Outfit</h1>
        <p className="dg-cardHint">
          Signed in as <strong>{user?.email}</strong>
        </p>
      </div>

      <div className="dg-actions">
        {scan ? (
          <div className="dg-form">
            <div className="dg-scanResult">
              <div className="dg-alert dg-alertInfo">Score: {scan.score}</div>

              {scan.image_url ? <img className="dg-image" src={scan.image_url} alt="Outfit" /> : null}

              {scan.vision?.description ? <div className="dg-scanText">{scan.vision.description}</div> : null}

              <div className="dg-scanBlock">
                <div className="dg-scanTitle">Detected</div>
                <div className="dg-scanList">
                  <div>Top: {(scan.vision?.items?.tops ?? []).join(', ') || '—'}</div>
                  <div>Bottom: {(scan.vision?.items?.bottoms ?? []).join(', ') || '—'}</div>
                  <div>Shoes: {(scan.vision?.items?.shoes ?? []).join(', ') || '—'}</div>
                  <div>Outerwear: {(scan.vision?.items?.outerwear ?? []).join(', ') || '—'}</div>
                  <div>Accessories: {(scan.vision?.items?.accessories ?? []).join(', ') || '—'}</div>
                </div>
              </div>

              <div className="dg-scanBlock">
                <div className="dg-scanTitle">Analysis</div>
                <div className="dg-scanList">
                  <div>Pros: {(scan.analysis?.pros ?? []).join(' ') || '—'}</div>
                  <div>Issues: {(scan.analysis?.issues ?? []).join(' ') || '—'}</div>
                  <div>Suggestions: {(scan.analysis?.suggestions ?? []).join(' ') || '—'}</div>
                </div>
              </div>

              <button className="dg-btn dg-btnPrimary" type="button" onClick={resetScan} disabled={isSubmitting || isScanning}>
                New scan
              </button>

              <button className="dg-btn dg-btnPrimary" type="button" onClick={onBack} disabled={isSubmitting || isScanning}>
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="dg-form">
            <label className="dg-field">
              <span className="dg-label">Upload outfit photo</span>
              <input
                aria-label="Upload outfit photo"
                className="dg-input dg-fileInput"
                type="file"
                accept="image/*"
                disabled={isSubmitting || isScanning}
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <label className="dg-field">
              <span className="dg-label">Camera (mobile)</span>
              <input
                aria-label="Capture outfit photo"
                className="dg-input dg-fileInput"
                type="file"
                accept="image/*"
                capture="environment"
                disabled={isSubmitting || isScanning}
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
            </label>

            {previewUrl ? <img className="dg-image dg-imagePreview" src={previewUrl} alt="Outfit preview" /> : null}

            <button
              className="dg-btn dg-btnPrimary"
              type="button"
              onClick={analyzeOutfit}
              disabled={isSubmitting || isScanning || !selectedFile}
            >
              {isScanning ? 'Analyzing…' : 'Analyze outfit'}
            </button>

            {scanError ? <div className="dg-alert">{scanError}</div> : null}

            <button className="dg-btn dg-btnPrimary" type="button" onClick={onBack} disabled={isSubmitting || isScanning}>
              Back
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export default OutfitScanPage
