import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faChevronDown, faPlus, faImages, faCamera, faXmark, faPen } from '@fortawesome/free-solid-svg-icons'

function ContextSelectField({
  fieldKey,
  label,
  value,
  options,
  disabled,
  isOpen,
  menuPos,
  menuElRef,
  onChange,
  onOpen,
  onClose,
  onChoose,
}) {
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  function open() {
    if (!wrapRef.current) return
    onOpen(fieldKey, wrapRef.current)
  }

  function toggle() {
    if (isOpen) onClose()
    else open()
  }

  function choose(v) {
    onChoose(fieldKey, v)
    window.requestAnimationFrame(() => inputRef.current?.blur())
  }

  return (
    <div className="dg-field">
      <span className="dg-label">{label}</span>

      <div className="dg-select">
        <div className="dg-selectWrap" ref={wrapRef}>
          <input
            className="dg-input dg-selectInput"
            placeholder="Type or choose…"
            value={value}
            disabled={disabled}
            ref={inputRef}
            onChange={(e) => onChange(fieldKey, e.target.value)}
          />
          <button
            type="button"
            className="dg-selectIconBtn"
            aria-label="Open options"
            disabled={disabled}
            onClick={toggle}
          >
            <FontAwesomeIcon icon={faChevronDown} />
          </button>
        </div>
      </div>

      {isOpen && menuPos.width ?
        createPortal(
          <div
            ref={menuElRef}
            className="dg-selectMenu"
            role="listbox"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              maxHeight: `calc(100vh - ${menuPos.top}px - 16px)`,
            }}
          >
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                className={value === opt ? 'dg-selectItem dg-selectItemActive' : 'dg-selectItem'}
                onClick={() => choose(opt)}
              >
                {opt}
              </button>
            ))}
            {value ? (
              <button type="button" className="dg-selectItem dg-selectItemDanger" onClick={() => choose('')}>
                Clear
              </button>
            ) : null}
          </div>,
          document.body
        )
        : null}
    </div>
  )
}

function OutfitScanPage({ apiBase, token, user, onNotify, sessionId, onBack }) {
  const turnsMax = 10

  const contextOptions = {
    occasion: ['Work', 'Date night', 'Wedding', 'Party', 'Casual day', 'Interview', 'Gym'],
    weather: ['Hot', 'Warm', 'Mild', 'Cool', 'Cold', 'Rainy', 'Snowy'],
    dress_code: ['Casual', 'Smart casual', 'Business', 'Business formal', 'Formal', 'Black tie'],
    budget: ['No budget', 'Under $50', '$50–$100', '$100–$200', '$200+'],
    desired_vibe: ['Classic', 'Minimal', 'Trendy', 'Streetwear', 'Romantic', 'Edgy', 'Elegant'],
  }

  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')

  const [intake, setIntake] = useState({
    occasion: '',
    weather: '',
    dress_code: '',
    budget: '',
    desired_vibe: '',
  })

  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])

  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [composer, setComposer] = useState('')

  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false)

  const [isContextOpen, setIsContextOpen] = useState(false)
  const [openContextField, setOpenContextField] = useState(null)
  const [contextMenuPos, setContextMenuPos] = useState({ top: 0, left: 0, width: 0 })

  const chatEndRef = useRef(null)
  const contextMenuElRef = useRef(null)
  const contextAnchorElRef = useRef(null)

  const galleryInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    if (!chatEndRef.current) return
    chatEndRef.current.scrollIntoView({ block: 'end' })
  }, [messages.length])

  useEffect(() => {
    function onDocMouseDown(e) {
      if (!openContextField) return

      const menuEl = contextMenuElRef.current
      if (menuEl && menuEl.contains(e.target)) return

      const anchorEl = contextAnchorElRef.current
      if (anchorEl && anchorEl.contains(e.target)) return

      setOpenContextField(null)
    }

    function onDocKeyDown(e) {
      if (e.key === 'Escape') setOpenContextField(null)
    }

    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onDocKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onDocKeyDown)
    }
  }, [openContextField])

  useEffect(() => {
    if (!isPhotoPickerOpen) return

    function onKeyDown(e) {
      if (e.key === 'Escape') setIsPhotoPickerOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isPhotoPickerOpen])

  useEffect(() => {
    if (!apiBase || !token || !sessionId) return
    let mounted = true

    async function loadSession() {
      setIsLoading(true)
      setError('')
      try {
        const res = await fetch(`${apiBase}/outfit-chats/${sessionId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data?.message || 'Failed to load chat')
          return
        }

        if (!mounted) return
        const s = data?.session ?? null
        setSession(s)
        setMessages(Array.isArray(s?.messages) ? s.messages : [])
        setIntake({
          occasion: s?.intake?.occasion ?? '',
          weather: s?.intake?.weather ?? '',
          dress_code: s?.intake?.dress_code ?? '',
          budget: s?.intake?.budget ?? '',
          desired_vibe: s?.intake?.desired_vibe ?? '',
        })
      } catch {
        setError('Failed to load chat')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    loadSession()
    return () => {
      mounted = false
    }
  }, [apiBase, token, sessionId])

  function resetChat() {
    setError('')
    setSession(null)
    setMessages([])
    setComposer('')
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
    setIntake({ occasion: '', weather: '', dress_code: '', budget: '', desired_vibe: '' })
  }

  function onPickFile(file) {
    setError('')
    setSession(null)
    setMessages([])
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
    setError('')

    if (!selectedFile) {
      setError('Pick an image first.')
      return
    }

    if (!apiBase || !token) {
      setError('Missing auth token. Please login again.')
      return
    }

    setIsLoading(true)
    try {
      const form = new FormData()
      form.append('image', selectedFile)
      form.append('message', composer || 'Analyze my outfit.')

      form.append('intake[occasion]', intake.occasion || '')
      form.append('intake[weather]', intake.weather || '')
      form.append('intake[dress_code]', intake.dress_code || '')
      form.append('intake[budget]', intake.budget || '')
      form.append('intake[desired_vibe]', intake.desired_vibe || '')

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 60000)

      const res = await fetch(`${apiBase}/outfit-chats/analyze`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: form,
      })

      const data = await res.json().catch(() => ({}))
      clearTimeout(timeout)

      if (!res.ok) {
        setError(data?.message || 'Analyze failed')
        return
      }

      const s = data?.session ?? null
      setSession(s)
      setMessages(Array.isArray(s?.messages) ? s.messages : [])
      setComposer('')
      onNotify?.('info', `Chat started. Turns: ${s?.turns_used ?? 1}/${turnsMax}`)
    } catch {
      setError('Analyze failed')
    } finally {
      setIsLoading(false)
    }
  }

  async function sendMessage() {
    if (!session?.id) return
    const content = composer.trim()
    if (!content) return
    if (!apiBase || !token) return

    if ((session?.turns_used ?? 0) >= turnsMax || session?.status === 'closed') {
      onNotify?.('error', 'This chat has reached the 10-turn limit.')
      return
    }

    setIsSending(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/outfit-chats/${session.id}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 429) {
        setSession((s) => ({ ...s, turns_used: turnsMax, status: 'closed' }))
        onNotify?.('error', data?.message || 'This chat has reached the 10-turn limit.')
        return
      }

      if (!res.ok) {
        setError(data?.message || 'Failed to send message')
        return
      }

      const nextMsgs = Array.isArray(data?.messages) ? data.messages : []
      setMessages((m) => [...m, ...nextMsgs])
      setSession((s) => ({ ...s, turns_used: data?.turns_used ?? s?.turns_used }))
      setComposer('')
    } catch {
      setError('Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const canChat = Boolean(session?.id)
  const turnsUsed = session?.turns_used ?? 0
  const isLimitReached = turnsUsed >= turnsMax || session?.status === 'closed'

  function setContextField(key, value) {
    setIntake((s) => ({ ...s, [key]: value }))
  }

  function openContextMenu(fieldKey, anchorEl) {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const top = Math.round(rect.bottom + 8)
    const width = Math.round(rect.width)
    const maxLeft = Math.max(8, window.innerWidth - width - 8)
    const left = Math.min(Math.round(rect.left), maxLeft)
    setContextMenuPos({ top, left, width })
    contextAnchorElRef.current = anchorEl
    setOpenContextField(fieldKey)
  }

  return (
    <>
      <div className="dg-cardHeader">
        <div className="dg-pageHeaderRow">
          <button className="dg-iconBtn" type="button" aria-label="Back" onClick={onBack}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <div className="dg-pageHeaderText">
            <h1 className="dg-cardTitle">Analyze Outfit</h1>
            <p className="dg-cardHint">Upload a photo and chat for actionable outfit advice.</p>
          </div>
        </div>
      </div>

      <div className="dg-actions">
        <div className="dg-form">

          <div className="dg-scanBlock">
            <div className="dg-scanTitle">Context (optional)</div>
            <div className="dg-scanText">You can provide context to help the AI understand the outfit better and consider.</div>

            <button className="dg-btn dg-btnGhost" type="button" onClick={() => setIsContextOpen((v) => !v)}>
              {isContextOpen ? 'Hide context' : 'Edit context'}
            </button>

            <div className={isContextOpen ? 'dg-collapse dg-collapseOpen' : 'dg-collapse'} aria-hidden={!isContextOpen}>
              <div className="dg-collapseInner">
                <ContextSelectField
                  fieldKey="occasion"
                  label="Occasion"
                  value={intake.occasion}
                  options={contextOptions.occasion}
                  disabled={canChat || isLoading || isSending}
                  isOpen={openContextField === 'occasion'}
                  menuPos={contextMenuPos}
                  menuElRef={contextMenuElRef}
                  onChange={setContextField}
                  onOpen={openContextMenu}
                  onClose={() => setOpenContextField(null)}
                  onChoose={(k, v) => {
                    setContextField(k, v)
                    setOpenContextField(null)
                  }}
                />
                <ContextSelectField
                  fieldKey="weather"
                  label="Weather"
                  value={intake.weather}
                  options={contextOptions.weather}
                  disabled={canChat || isLoading || isSending}
                  isOpen={openContextField === 'weather'}
                  menuPos={contextMenuPos}
                  menuElRef={contextMenuElRef}
                  onChange={setContextField}
                  onOpen={openContextMenu}
                  onClose={() => setOpenContextField(null)}
                  onChoose={(k, v) => {
                    setContextField(k, v)
                    setOpenContextField(null)
                  }}
                />
                <ContextSelectField
                  fieldKey="dress_code"
                  label="Dress code"
                  value={intake.dress_code}
                  options={contextOptions.dress_code}
                  disabled={canChat || isLoading || isSending}
                  isOpen={openContextField === 'dress_code'}
                  menuPos={contextMenuPos}
                  menuElRef={contextMenuElRef}
                  onChange={setContextField}
                  onOpen={openContextMenu}
                  onClose={() => setOpenContextField(null)}
                  onChoose={(k, v) => {
                    setContextField(k, v)
                    setOpenContextField(null)
                  }}
                />
                <ContextSelectField
                  fieldKey="budget"
                  label="Budget"
                  value={intake.budget}
                  options={contextOptions.budget}
                  disabled={canChat || isLoading || isSending}
                  isOpen={openContextField === 'budget'}
                  menuPos={contextMenuPos}
                  menuElRef={contextMenuElRef}
                  onChange={setContextField}
                  onOpen={openContextMenu}
                  onClose={() => setOpenContextField(null)}
                  onChoose={(k, v) => {
                    setContextField(k, v)
                    setOpenContextField(null)
                  }}
                />
                <ContextSelectField
                  fieldKey="desired_vibe"
                  label="Desired vibe"
                  value={intake.desired_vibe}
                  options={contextOptions.desired_vibe}
                  disabled={canChat || isLoading || isSending}
                  isOpen={openContextField === 'desired_vibe'}
                  menuPos={contextMenuPos}
                  menuElRef={contextMenuElRef}
                  onChange={setContextField}
                  onOpen={openContextMenu}
                  onClose={() => setOpenContextField(null)}
                  onChoose={(k, v) => {
                    setContextField(k, v)
                    setOpenContextField(null)
                  }}
                />
              </div>
            </div>
          </div>

          {session?.image_url ? (
            <img className="dg-image" src={session.image_url} alt="Outfit" />
          ) : previewUrl ? (
            <div className="dg-imageWrap">
              <img className="dg-image dg-imagePreview" src={previewUrl} alt="Outfit preview" />
              {!canChat ? (
                <button
                  className="dg-imageEditBtn"
                  type="button"
                  aria-label="Change photo"
                  title="Change photo"
                  disabled={isLoading}
                  onClick={() => setIsPhotoPickerOpen(true)}
                >
                  <FontAwesomeIcon icon={faPen} />
                </button>
              ) : null}
            </div>
          ) : null}

          {!canChat ? (
            <>
            <div className="dg-uploadBlock">
              {!selectedFile ? (
                <button
                  type="button"
                  className="dg-uploadCard"
                  disabled={isLoading}
                  onClick={() => setIsPhotoPickerOpen(true)}
                >
                  <div className="dg-uploadIcon">
                    <FontAwesomeIcon icon={faPlus} />
                  </div>
                  <div className="dg-uploadText">
                    <div className="dg-uploadTitle">Add outfit photo</div>
                    <div className="dg-uploadHint">Please select or take a picture to start.</div>
                  </div>
                </button>
              ) : null}

              <input
                ref={galleryInputRef}
                aria-label="Choose outfit photo"
                className="dg-photoInput"
                type="file"
                accept="image/*"
                disabled={isLoading}
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
              <input
                ref={cameraInputRef}
                aria-label="Take outfit photo"
                className="dg-photoInput"
                type="file"
                accept="image/*"
                capture="environment"
                disabled={isLoading}
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {isPhotoPickerOpen
              ? createPortal(
                  <div className="dg-sheetOverlay" role="dialog" aria-modal="true" onMouseDown={() => setIsPhotoPickerOpen(false)}>
                    <div className="dg-sheet" onMouseDown={(e) => e.stopPropagation()}>
                      <div className="dg-sheetHeader">
                        <div className="dg-sheetTitle">Add a photo</div>
                        <button className="dg-sheetClose" type="button" aria-label="Close" onClick={() => setIsPhotoPickerOpen(false)}>
                          <FontAwesomeIcon icon={faXmark} />
                        </button>
                      </div>

                      <button
                        className="dg-sheetBtn"
                        type="button"
                        onClick={() => {
                          setIsPhotoPickerOpen(false)
                          galleryInputRef.current?.click()
                        }}
                      >
                        <span className="dg-sheetBtnIcon">
                          <FontAwesomeIcon icon={faImages} />
                        </span>
                        <span className="dg-sheetBtnText">Choose from gallery / files</span>
                      </button>

                      <button
                        className="dg-sheetBtn"
                        type="button"
                        onClick={() => {
                          setIsPhotoPickerOpen(false)
                          cameraInputRef.current?.click()
                        }}
                      >
                        <span className="dg-sheetBtnIcon">
                          <FontAwesomeIcon icon={faCamera} />
                        </span>
                        <span className="dg-sheetBtnText">Take a photo (camera)</span>
                      </button>
                    </div>
                  </div>,
                  document.body
                )
              : null}

            <button
              className="dg-btn dg-btnPrimary"
              type="button"
              onClick={analyzeOutfit}
              disabled={isLoading || !selectedFile}
            >
              {isLoading ? 'Analyzing…' : 'Analyze outfit'}

            </button>

            {error ? <div className="dg-alert">{error}</div> : null}
            </>
          ) : null}

          {canChat ? (
            <>
              <div className="dg-scanBlock">
                <div className="dg-turnHeader">
                  <div className="dg-turnTitle">Chat session</div>
                  <div className={isLimitReached ? 'dg-turnBadge dg-turnBadgeClosed' : 'dg-turnBadge'}>
                    {isLimitReached ? 'Limit reached' : 'Active'}
                  </div>
                </div>
                <div className="dg-turnMeta">Turns used: {turnsUsed}/{turnsMax}</div>
                <div className="dg-turnBar" aria-label="Turn usage">
                  <div className="dg-turnBarFill" style={{ width: `${Math.min(100, Math.round((turnsUsed / turnsMax) * 100))}%` }} />
                </div>
              </div>

              <div className="dg-chatThread">
                {messages.map((m) => (
                  <div key={m.id ?? `${m.role}-${m.created_at}`} className={m.role === 'user' ? 'dg-chatMsg dg-chatMsgUser' : 'dg-chatMsg dg-chatMsgAssistant'}>
                    <div className="dg-chatRole">{m.role === 'user' ? 'You' : 'AI'}</div>
                    <div className="dg-chatText">{m.content}</div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="dg-chatComposer">
                <textarea
                  className="dg-input dg-chatInput"
                  rows={3}
                  placeholder={isLimitReached ? 'Turn limit reached.' : 'Ask a follow-up question…'}
                  value={composer}
                  disabled={isLoading || isSending || isLimitReached}
                  onChange={(e) => setComposer(e.target.value)}
                />
                <button className="dg-btn dg-btnPrimary" type="button" onClick={sendMessage} disabled={isLoading || isSending || isLimitReached || !composer.trim()}>
                  {isSending ? 'Sending…' : 'Send'}
                </button>
              </div>

              <button className="dg-btn dg-btnGhost" type="button" onClick={resetChat} disabled={isLoading || isSending}>
                New chat
              </button>
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}

export default OutfitScanPage
