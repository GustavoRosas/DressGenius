import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faChevronDown,
  faChevronUp,
  faPlus,
  faCheck,
  faCircleNotch,
  faImages,
  faCamera,
  faXmark,
  faPen,
} from '@fortawesome/free-solid-svg-icons'

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
              maxHeight: `calc(100dvh - ${menuPos.top}px - 16px - env(safe-area-inset-bottom))`,
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

  function sentenceCase(value) {
    const s = String(value ?? '').trim()
    if (!s) return ''
    const lower = s.toLowerCase()
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }

  function renderChatContent(content) {
    const text = String(content ?? '')
    const lines = text.split('\n')

    return lines.map((line, lineIdx) => {
      const parts = []
      const re = /\*\*(.+?)\*\*/g
      let lastIndex = 0
      let m
      while ((m = re.exec(line)) !== null) {
        if (m.index > lastIndex) {
          parts.push(line.slice(lastIndex, m.index))
        }
        parts.push(
          <strong key={`b-${lineIdx}-${m.index}`}>{m[1]}</strong>
        )
        lastIndex = m.index + m[0].length
      }
      if (lastIndex < line.length) {
        parts.push(line.slice(lastIndex))
      }

      return (
        <span key={`l-${lineIdx}`}>
          {parts.length ? parts : line}
          {lineIdx < lines.length - 1 ? <br /> : null}
        </span>
      )
    })
  }

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
    custom_note: '',
  })

  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [detectedItems, setDetectedItems] = useState([])
  const [savedDetectedIds, setSavedDetectedIds] = useState(() => new Set())
  const [savingDetectedIds, setSavingDetectedIds] = useState(() => new Set())
  const [removingDetectedIds, setRemovingDetectedIds] = useState(() => new Set())
  const [wardrobeCanonicalKeys, setWardrobeCanonicalKeys] = useState(() => new Set())
  const [wardrobeKeyToId, setWardrobeKeyToId] = useState(() => new Map())
  const [hoveredDetectedId, setHoveredDetectedId] = useState(null)
  const [isDetectedOpen, setIsDetectedOpen] = useState(() => !sessionId)

  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const [activePanel, setActivePanel] = useState('chat')
  const [feedback, setFeedback] = useState(() => ({
    ratings: {
      helpfulness: 5,
      clarity: 5,
      relevance: 5,
      tone: 5,
    },
    comment: '',
  }))
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
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
      setIsDetectedOpen(false)
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
        setDetectedItems(Array.isArray(s?.detected_items) ? s.detected_items : [])
        if (s?.feedback && typeof s.feedback === 'object') {
          setFeedback({
            ratings: {
              helpfulness: Number(s.feedback?.ratings?.helpfulness ?? 5),
              clarity: Number(s.feedback?.ratings?.clarity ?? 5),
              relevance: Number(s.feedback?.ratings?.relevance ?? 5),
              tone: Number(s.feedback?.ratings?.tone ?? 5),
            },
            comment: String(s.feedback?.comment ?? ''),
          })
        }
        setActivePanel(s?.status === 'closed' && !s?.feedback ? 'rate' : 'chat')
        setIntake({
          occasion: s?.intake?.occasion ?? '',
          weather: s?.intake?.weather ?? '',
          dress_code: s?.intake?.dress_code ?? '',
          budget: s?.intake?.budget ?? '',
          desired_vibe: s?.intake?.desired_vibe ?? '',
          custom_note: s?.intake?.custom_note ?? '',
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

  function canonicalKeyFor(label, category) {
    const l = String(label ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
    const c = String(category ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
    return `${l}|${c}`
  }

  async function loadWardrobeKeys() {
    if (!apiBase || !token) return
    try {
      const res = await fetch(`${apiBase}/wardrobe-items`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return

      const items = Array.isArray(data?.items) ? data.items : []
      const keys = new Set()
      const nextMap = new Map()
      for (const it of items) {
        const key = canonicalKeyFor(it?.label, it?.category)
        keys.add(key)
        if (it?.id) nextMap.set(key, it.id)
      }
      setWardrobeCanonicalKeys(keys)
      setWardrobeKeyToId(nextMap)
    } catch {
      // ignore
    }
  }

  async function finishAnalysis() {
    if (!session?.id) return
    if (!apiBase || !token) return
    if (isFinishing) return
    if (session?.status === 'closed') return

    setIsFinishing(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/outfit-chats/${session.id}/finish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.message || 'Failed to finish analysis')
        return
      }

      const nextSession = data?.session ?? null
      if (nextSession) {
        setSession(nextSession)
        setMessages(Array.isArray(nextSession?.messages) ? nextSession.messages : [])
      } else {
        setSession((s) => (s ? { ...s, status: 'closed' } : s))
      }

      setActivePanel('rate')
      onNotify?.('info', 'Analysis finished. Please rate the conversation.')
    } catch {
      setError('Failed to finish analysis')
    } finally {
      setIsFinishing(false)
    }
  }

  async function submitFeedback() {
    if (!session?.id) return
    if (!apiBase || !token) return
    if (isSubmittingFeedback) return

    setIsSubmittingFeedback(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/outfit-chats/${session.id}/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ratings: feedback.ratings,
          comment: feedback.comment,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.message || 'Failed to submit feedback')
        return
      }

      const nextSession = data?.session ?? null
      if (nextSession) setSession(nextSession)

      onNotify?.('info', 'Thanks for your feedback!')
      setActivePanel('chat')
    } catch {
      setError('Failed to submit feedback')
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  useEffect(() => {
    loadWardrobeKeys()
  }, [apiBase, token])

  function resetChat() {
    setError('')
    setSession(null)
    setMessages([])
    setDetectedItems([])
    setSavedDetectedIds(new Set())
    setSavingDetectedIds(new Set())
    setRemovingDetectedIds(new Set())
    setIsDetectedOpen(true)
    setComposer('')
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
    setIntake({ occasion: '', weather: '', dress_code: '', budget: '', desired_vibe: '', custom_note: '' })
  }

  function onPickFile(file) {
    setError('')
    setSession(null)
    setMessages([])
    setDetectedItems([])
    setSavedDetectedIds(new Set())
    setSavingDetectedIds(new Set())
    setRemovingDetectedIds(new Set())
    setIsDetectedOpen(true)
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
      form.append('intake[custom_note]', intake.custom_note || '')

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

      if (res.status === 429) {
        const retryAfter = typeof data?.retry_after === 'number' ? data.retry_after : null
        setError(retryAfter ? `${data?.message || 'AI quota exceeded.'} Retry in ${retryAfter}s.` : data?.message || 'AI quota exceeded. Please retry shortly.')
        return
      }

      if (!res.ok) {
        setError(data?.message || 'Analyze failed')
        return
      }

      const s = data?.session ?? null
      setSession(s)
      setMessages(Array.isArray(s?.messages) ? s.messages : [])
      setDetectedItems(Array.isArray(data?.detected_items) ? data.detected_items : Array.isArray(s?.detected_items) ? s.detected_items : [])
      setIsDetectedOpen(true)
      setComposer('')
      onNotify?.('info', `Chat started. Turns: ${s?.turns_used ?? 1}/${turnsMax}`)
    } catch {
      setError('Analyze failed')
    } finally {
      setIsLoading(false)
    }
  }

  async function saveToWardrobe(detectedId) {
    if (!apiBase || !token) return
    if (!detectedId) return
    if (savedDetectedIds.has(detectedId)) return
    if (savingDetectedIds.has(detectedId)) return

    setError('')
    setSavingDetectedIds((prev) => {
      const next = new Set(prev)
      next.add(detectedId)
      return next
    })
    try {
      const res = await fetch(`${apiBase}/wardrobe-items`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ detected_item_id: detectedId }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.message || 'Failed to save wardrobe item')
        return
      }

      setSavedDetectedIds((prev) => {
        const next = new Set(prev)
        next.add(detectedId)
        return next
      })

      if (data?.item?.id) {
        const key = canonicalKeyFor(data?.item?.label, data?.item?.category)
        setWardrobeCanonicalKeys((prev) => {
          const next = new Set(prev)
          next.add(key)
          return next
        })
        setWardrobeKeyToId((prev) => {
          const next = new Map(prev)
          next.set(key, data.item.id)
          return next
        })
      }

      await loadWardrobeKeys()

      onNotify?.('info', data?.created ? 'Saved to wardrobe.' : 'Already in wardrobe.')
    } catch {
      setError('Failed to save wardrobe item')
    } finally {
      setSavingDetectedIds((prev) => {
        const next = new Set(prev)
        next.delete(detectedId)
        return next
      })
    }
  }

  async function removeFromWardrobeByKey(canonicalKey, detectedId) {
    if (!apiBase || !token) return
    if (!canonicalKey) return
    if (!detectedId) return

    const wardrobeId = wardrobeKeyToId.get(canonicalKey)
    if (!wardrobeId) return

    if (removingDetectedIds.has(detectedId)) return

    setRemovingDetectedIds((prev) => {
      const next = new Set(prev)
      next.add(detectedId)
      return next
    })

    setError('')
    try {
      const res = await fetch(`${apiBase}/wardrobe-items/${wardrobeId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })

      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}))
        setError(data?.message || 'Failed to remove wardrobe item')
        return
      }

      setWardrobeCanonicalKeys((prev) => {
        const next = new Set(prev)
        next.delete(canonicalKey)
        return next
      })
      setWardrobeKeyToId((prev) => {
        const next = new Map(prev)
        next.delete(canonicalKey)
        return next
      })
      setSavedDetectedIds((prev) => {
        const next = new Set(prev)
        next.delete(detectedId)
        return next
      })

      setHoveredDetectedId((v) => (v === detectedId ? null : v))

      onNotify?.('info', 'Removed from wardrobe.')
    } catch {
      setError('Failed to remove wardrobe item')
    } finally {
      setRemovingDetectedIds((prev) => {
        const next = new Set(prev)
        next.delete(detectedId)
        return next
      })
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
  const isTurnLimitReached = turnsUsed >= turnsMax
  const isSessionClosed = session?.status === 'closed'
  const isLimitReached = isTurnLimitReached || isSessionClosed
  const hasFeedback = Boolean(session?.feedback)
  const isFinishedAndRated = isSessionClosed && hasFeedback

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
              {isContextOpen ? 'Hide context' : sessionId ? 'Show context' : 'Edit context'}
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

                <div style={{ marginTop: 12 }}>
                  <div className="dg-scanText" style={{ marginBottom: 8 }}>
                    Custom note (optional): add any extra detail you want DressGenius to consider (max 64 characters).
                  </div>
                  <input
                    className="dg-input"
                    type="text"
                    value={intake.custom_note}
                    maxLength={64}
                    placeholder="E.g. 'No heels', 'I hate tight waistbands', 'Prefer vegan leather'"
                    disabled={canChat || isLoading || isSending}
                    onChange={(e) => {
                      const v = e.target.value
                      setContextField('custom_note', v)
                    }}
                  />
                </div>
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
              {Array.isArray(detectedItems) && detectedItems.length ? (
                <div className="dg-scanBlock">
                  <div className="dg-turnHeader">
                    <div className="dg-turnTitle">Detected pieces</div>
                    <button
                      className="dg-iconBtn"
                      type="button"
                      aria-label={isDetectedOpen ? 'Collapse detected pieces' : 'Expand detected pieces'}
                      onClick={() => setIsDetectedOpen((v) => !v)}
                    >
                      <FontAwesomeIcon icon={isDetectedOpen ? faChevronUp : faChevronDown} />
                    </button>
                  </div>
                  <div className="dg-scanText">Save pieces you own to build your wardrobe.</div>

                  <div className={isDetectedOpen ? 'dg-collapse dg-collapseOpen' : 'dg-collapse'} aria-hidden={!isDetectedOpen}>
                    <div className="dg-collapseInner">
                      <div className="dg-historyList dg-detectedList">
                        {detectedItems.map((it) => {
                          const key = canonicalKeyFor(it?.label, it?.category)
                          const alreadySaved = wardrobeCanonicalKeys.has(key) || savedDetectedIds.has(it.id)
                          const isSaving = savingDetectedIds.has(it.id)
                          const isRemoving = removingDetectedIds.has(it.id)
                          const isHoveringSaved = alreadySaved && hoveredDetectedId === it.id

                          return (
                            <div key={it.id} className="dg-historyRow">
                              <div className="dg-historyText">
                                <div className="dg-historyTitle">{sentenceCase(it.label)}</div>
                                {it.category ? <div className="dg-historyMeta">{sentenceCase(it.category)}</div> : null}
                              </div>

                              <button
                                className={alreadySaved ? isHoveringSaved ? 'dg-iconBtn dg-iconBtnDanger' : 'dg-iconBtn dg-iconBtnSuccess' : 'dg-iconBtn'}
                                type="button"
                                title={alreadySaved ? isHoveringSaved ? 'Remove from wardrobe' : 'Saved to wardrobe' : 'Save to wardrobe'}
                                aria-label={alreadySaved ? isHoveringSaved ? 'Remove from wardrobe' : 'Saved to wardrobe' : isSaving ? 'Saving to wardrobe' : 'Save to wardrobe'}
                                disabled={isLoading || isSending || isSaving || isRemoving}
                                onMouseEnter={() => {
                                  if (alreadySaved) setHoveredDetectedId(it.id)
                                }}
                                onMouseLeave={() => {
                                  setHoveredDetectedId((v) => (v === it.id ? null : v))
                                }}
                                onClick={() => {
                                  if (alreadySaved) removeFromWardrobeByKey(key, it.id)
                                  else saveToWardrobe(it.id)
                                }}
                              >
                                <FontAwesomeIcon
                                  icon={isSaving || isRemoving ? faCircleNotch : alreadySaved ? isHoveringSaved ? faXmark : faCheck : faPlus}
                                  spin={isSaving || isRemoving}
                                />
                              </button>
                            </div>
                          )
                        })}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button
                          className="dg-iconBtn"
                          type="button"
                          aria-label="Collapse detected pieces"
                          onClick={() => setIsDetectedOpen(false)}
                        >
                          <FontAwesomeIcon icon={faChevronUp} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="dg-scanBlock">
                <div className="dg-turnHeader">
                  <div className="dg-turnTitle">Chat session</div>
                  <div className={isLimitReached ? 'dg-turnBadge dg-turnBadgeClosed' : 'dg-turnBadge'}>
                    {isTurnLimitReached ? 'Limit reached' : isSessionClosed ? 'Finished' : 'Active'}
                  </div>
                </div>
                <div className="dg-turnMeta">Turns used: {turnsUsed}/{turnsMax}</div>
                <div className="dg-turnBar" aria-label="Turn usage">
                  <div className="dg-turnBarFill" style={{ width: `${Math.min(100, Math.round((turnsUsed / turnsMax) * 100))}%` }} />
                </div>
              </div>

              {activePanel === 'rate' ? (
                <div className="dg-scanBlock">
                  <div className="dg-scanTitle">Rate this conversation</div>
                  <div className="dg-scanText">Help improve DressGenius: rate the chat and optionally leave a note.</div>

                  {(
                    [
                      ['helpfulness', 'Helpfulness'],
                      ['clarity', 'Clarity'],
                      ['relevance', 'Relevance'],
                      ['tone', 'Tone'],
                    ]
                  ).map(([key, label]) => (
                    <div key={key} className="dg-ratingRow">
                      <div className="dg-ratingLabel">{label}</div>
                      <div className="dg-ratingPills">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            className={feedback.ratings[key] === n ? 'dg-ratingPill dg-ratingPillActive' : 'dg-ratingPill'}
                            disabled={isSubmittingFeedback}
                            onClick={() =>
                              setFeedback((s) => ({
                                ...s,
                                ratings: { ...s.ratings, [key]: n },
                              }))
                            }
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <textarea
                    className="dg-input dg-chatInput"
                    rows={3}
                    placeholder="Optional note (what was good/bad?)"
                    value={feedback.comment}
                    disabled={isSubmittingFeedback}
                    onChange={(e) => setFeedback((s) => ({ ...s, comment: e.target.value }))}
                  />

                  <button className="dg-btn dg-btnPrimary" type="button" onClick={submitFeedback} disabled={isSubmittingFeedback}>
                    {isSubmittingFeedback ? 'Submitting…' : hasFeedback ? 'Update rating' : 'Submit rating'}
                  </button>

                  <button className="dg-btn dg-btnGhost" type="button" onClick={() => setActivePanel('chat')} disabled={isSubmittingFeedback}>
                    Back to chat
                  </button>
                </div>
              ) : isFinishedAndRated ? (
                <div className="dg-scanBlock">
                  <div className="dg-scanTitle">Your feedback</div>
                  <div className="dg-scanText">Thanks for rating this conversation.</div>

                  <div className="dg-ratingRow">
                    <div className="dg-ratingLabel">Helpfulness</div>
                    <div className="dg-scanText">{session?.feedback?.ratings?.helpfulness ?? '—'}/5</div>
                  </div>
                  <div className="dg-ratingRow">
                    <div className="dg-ratingLabel">Clarity</div>
                    <div className="dg-scanText">{session?.feedback?.ratings?.clarity ?? '—'}/5</div>
                  </div>
                  <div className="dg-ratingRow">
                    <div className="dg-ratingLabel">Relevance</div>
                    <div className="dg-scanText">{session?.feedback?.ratings?.relevance ?? '—'}/5</div>
                  </div>
                  <div className="dg-ratingRow">
                    <div className="dg-ratingLabel">Tone</div>
                    <div className="dg-scanText">{session?.feedback?.ratings?.tone ?? '—'}/5</div>
                  </div>

                  {session?.feedback?.comment ? (
                    <div style={{ marginTop: 12 }}>
                      <div className="dg-ratingLabel" style={{ marginBottom: 6 }}>Comment</div>
                      <div className="dg-scanText">{session.feedback.comment}</div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="dg-chatThread">
                    {messages.map((m) => (
                      <div key={m.id ?? `${m.role}-${m.created_at}`} className={m.role === 'user' ? 'dg-chatMsg dg-chatMsgUser' : 'dg-chatMsg dg-chatMsgAssistant'}>
                        <div className="dg-chatRole">{m.role === 'user' ? 'You' : 'DressGenius'}</div>
                        <div className="dg-chatText">{renderChatContent(m.content)}</div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {!isSessionClosed ? (
                    <div className="dg-chatComposer">
                      <textarea
                        className="dg-input dg-chatInput"
                        rows={3}
                        placeholder={isLimitReached ? 'Turn limit reached.' : 'Ask a follow-up question…'}
                        value={composer}
                        disabled={isLoading || isSending || isFinishing || isLimitReached}
                        onChange={(e) => setComposer(e.target.value)}
                      />
                      <button className="dg-btn dg-btnPrimary" type="button" onClick={sendMessage} disabled={isLoading || isSending || isFinishing || isLimitReached || !composer.trim()}>
                        {isSending ? 'Sending…' : 'Send'}
                      </button>
                      <button className="dg-btn dg-btnFinish" type="button" onClick={finishAnalysis} disabled={isLoading || isSending || isFinishing || isLimitReached}>
                        {isFinishing ? 'Finishing…' : 'Finish analysis'}
                      </button>
                      <button className="dg-btn dg-btnGhost" type="button" onClick={resetChat} disabled={isLoading || isSending}>
                        New chat
                      </button>
                    </div>
                  ) : (
                    <div className="dg-chatComposer">
                      <button className="dg-btn dg-btnGhost" type="button" onClick={() => setActivePanel('rate')} disabled={isLoading || isSending || isFinishing || hasFeedback}>
                        {hasFeedback ? 'Already rated' : 'Rate this conversation'}
                      </button>
                      <button className="dg-btn dg-btnGhost" type="button" onClick={resetChat} disabled={isLoading || isSending}>
                        New chat
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}

export default OutfitScanPage
