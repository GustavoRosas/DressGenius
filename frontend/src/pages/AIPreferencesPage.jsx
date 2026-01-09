import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faArrowLeft } from '@fortawesome/free-solid-svg-icons'

const STORAGE_KEY = 'dg_ai_preferences_v1'

function clamp01(n) {
  if (Number.isNaN(n)) return 0
  if (n < 0) return 0
  if (n > 100) return 100
  return n
}

function loadPrefs(defaults) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return defaults
    return { ...defaults, ...parsed }
  } catch {
    return defaults
  }
}

function AIPreferencesPage({ onBack }) {
  const defaults = useMemo(
    () => ({
      tone: 60,
      strictness: 45,
      detail: 55,
      creativity: 50,
      trendiness: 45,
      comfort: 55,
      weather: 70,
      budget: 40,
      formality: 35,
      color: 45,
    }),
    []
  )

  const [prefs, setPrefs] = useState(() => loadPrefs(defaults))

  const dragStateRef = useRef({
    key: null,
    left: 0,
    width: 1,
    prevUserSelect: '',
    lastTouchTs: 0,
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch {
      // ignore
    }
  }, [prefs])

  function setPref(key, value) {
    setPrefs((s) => ({ ...s, [key]: clamp01(Number(value)) }))
  }

  function beginDrag(key, trackEl, clientX, inputType) {
    if (!trackEl) return
    const rect = trackEl.getBoundingClientRect()
    const prevUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    dragStateRef.current.key = key
    dragStateRef.current.left = rect.left
    dragStateRef.current.width = Math.max(rect.width, 1)
    dragStateRef.current.prevUserSelect = prevUserSelect
    if (inputType === 'touch') dragStateRef.current.lastTouchTs = Date.now()

    const x = Math.min(Math.max(clientX - dragStateRef.current.left, 0), dragStateRef.current.width)
    const next = Math.round((x / dragStateRef.current.width) * 100)
    setPref(key, next)
  }

  function endDrag() {
    if (!dragStateRef.current.key) return
    document.body.style.userSelect = dragStateRef.current.prevUserSelect
    dragStateRef.current.key = null
  }

  useEffect(() => {
    function onMove(ev) {
      const activeKey = dragStateRef.current.key
      if (!activeKey) return

      const clientX =
        'touches' in ev
          ? (ev.touches?.[0]?.clientX ?? ev.changedTouches?.[0]?.clientX)
          : ev.clientX
      if (typeof clientX !== 'number') return

      if ('preventDefault' in ev) ev.preventDefault()

      const x = Math.min(Math.max(clientX - dragStateRef.current.left, 0), dragStateRef.current.width)
      const next = Math.round((x / dragStateRef.current.width) * 100)
      setPref(activeKey, next)
    }

    function onUp() {
      endDrag()
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    document.addEventListener('touchmove', onMove, { passive: false, capture: true })
    document.addEventListener('touchend', onUp, { capture: true })
    document.addEventListener('touchcancel', onUp, { capture: true })

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchmove', onMove, { capture: true })
      document.removeEventListener('touchend', onUp, { capture: true })
      document.removeEventListener('touchcancel', onUp, { capture: true })
    }
  }, [])

  function labelFor(key, value) {
    const v = Number(value)

    if (key === 'tone') return v < 34 ? 'Direct' : v < 67 ? 'Balanced' : 'Encouraging'
    if (key === 'strictness') return v < 34 ? 'Chill' : v < 67 ? 'Honest' : 'Straightforward'
    if (key === 'detail') return v < 34 ? 'Short' : v < 67 ? 'Normal' : 'Very detailed'
    if (key === 'creativity') return v < 34 ? 'Classic' : v < 67 ? 'Balanced' : 'Bold'
    if (key === 'trendiness') return v < 34 ? 'Timeless' : v < 67 ? 'Modern' : 'Trendy'
    if (key === 'comfort') return v < 34 ? 'Style first' : v < 67 ? 'Balanced' : 'Comfort first'
    if (key === 'weather') return v < 34 ? 'Ignore weather' : v < 67 ? 'Consider' : 'Prioritize weather'
    if (key === 'budget') return v < 34 ? 'Budget' : v < 67 ? 'Mid-range' : 'Premium'
    if (key === 'formality') return v < 34 ? 'Casual' : v < 67 ? 'Smart casual' : 'Formal'
    if (key === 'color') return v < 34 ? 'Neutral' : v < 67 ? 'Balanced' : 'Colorful'

    return ''
  }

  function optionsFor(key) {
    if (key === 'tone') return [{ id: 'direct', label: 'Direct', value: 15 }, { id: 'balanced', label: 'Balanced', value: 50 }, { id: 'encouraging', label: 'Encouraging', value: 85 }]
    if (key === 'strictness') return [{ id: 'chill', label: 'Chill', value: 15 }, { id: 'honest', label: 'Honest', value: 50 }, { id: 'straight', label: 'Straightforward', value: 85 }]
    if (key === 'detail') return [{ id: 'short', label: 'Short', value: 15 }, { id: 'normal', label: 'Normal', value: 50 }, { id: 'detailed', label: 'Very detailed', value: 85 }]
    if (key === 'creativity') return [{ id: 'classic', label: 'Classic', value: 15 }, { id: 'balanced', label: 'Balanced', value: 50 }, { id: 'bold', label: 'Bold', value: 85 }]
    if (key === 'trendiness') return [{ id: 'timeless', label: 'Timeless', value: 15 }, { id: 'modern', label: 'Modern', value: 50 }, { id: 'trendy', label: 'Trendy', value: 85 }]
    if (key === 'comfort') return [{ id: 'style', label: 'Style first', value: 15 }, { id: 'balanced', label: 'Balanced', value: 50 }, { id: 'comfort', label: 'Comfort first', value: 85 }]
    if (key === 'weather') return [{ id: 'ignore', label: 'Ignore weather', value: 15 }, { id: 'consider', label: 'Consider', value: 50 }, { id: 'prioritize', label: 'Prioritize weather', value: 85 }]
    if (key === 'budget') return [{ id: 'budget', label: 'Budget', value: 15 }, { id: 'mid', label: 'Mid-range', value: 50 }, { id: 'premium', label: 'Premium', value: 85 }]
    if (key === 'formality') return [{ id: 'casual', label: 'Casual', value: 15 }, { id: 'smart', label: 'Smart casual', value: 50 }, { id: 'formal', label: 'Formal', value: 85 }]
    if (key === 'color') return [{ id: 'neutral', label: 'Neutral', value: 15 }, { id: 'balanced', label: 'Balanced', value: 50 }, { id: 'colorful', label: 'Colorful', value: 85 }]
    return []
  }

  function optionIdFor(key, value) {
    const v = Number(value)
    const opts = optionsFor(key)
    if (!opts.length) return ''
    if (v < 34) return opts[0].id
    if (v < 67) return opts[1].id
    return opts[2].id
  }

  function Slider({ k, title, hint }) {
    const value = prefs[k]
    const percent = Math.round((Number(value) / 100) * 100)

    const options = optionsFor(k)
    const selectedId = optionIdFor(k, value)

    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)

    const trackRef = useRef(null)

    function onMouseDown(e) {
      if (e.button !== 0) return
      if (Date.now() - dragStateRef.current.lastTouchTs < 800) return
      e.preventDefault()
      e.stopPropagation()
      beginDrag(k, trackRef.current, e.clientX, 'mouse')
    }

    useEffect(() => {
      const el = trackRef.current
      if (!el) return

      function onNativeTouchStart(ev) {
        const x = ev.touches?.[0]?.clientX
        if (typeof x !== 'number') return
        ev.preventDefault()
        ev.stopPropagation()
        beginDrag(k, el, x, 'touch')
      }

      el.addEventListener('touchstart', onNativeTouchStart, { passive: false })
      return () => {
        el.removeEventListener('touchstart', onNativeTouchStart)
      }
    }, [k])

    useEffect(() => {
      if (!isOpen) return

      function onPointerDown(ev) {
        const el = dropdownRef.current
        if (!el) return
        if (el.contains(ev.target)) return
        setIsOpen(false)
      }

      function onKeyDown(ev) {
        if (ev.key === 'Escape') setIsOpen(false)
      }

      document.addEventListener('mousedown', onPointerDown)
      document.addEventListener('touchstart', onPointerDown, { passive: true })
      document.addEventListener('keydown', onKeyDown)

      return () => {
        document.removeEventListener('mousedown', onPointerDown)
        document.removeEventListener('touchstart', onPointerDown)
        document.removeEventListener('keydown', onKeyDown)
      }
    }, [isOpen])

    return (
      <div className="dg-field">
        <span className="dg-label">{title}</span>
        {hint ? <span className="dg-hint">{hint}</span> : null}
        <div className="dg-aiRow">
          <div
            ref={trackRef}
            className="dg-aiTrack"
            role="slider"
            tabIndex={0}
            aria-label={title}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Number(value)}
            onMouseDown={onMouseDown}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault()
                setPref(k, Number(value) - 1)
              }
              if (e.key === 'ArrowRight') {
                e.preventDefault()
                setPref(k, Number(value) + 1)
              }
            }}
            style={{ '--p': `${percent}%` }}
          >
            <div className="dg-aiThumb" style={{ left: `${percent}%` }} />
          </div>
          <div className="dg-aiDropdown" ref={dropdownRef}>
            <button
              className="dg-aiDropBtn"
              type="button"
              aria-label={`${title} preset`}
              aria-haspopup="menu"
              aria-expanded={isOpen}
              onClick={() => setIsOpen((v) => !v)}
            >
              <span className="dg-aiDropText">{options.find((o) => o.id === selectedId)?.label ?? 'Select'}</span>
              <span className="dg-aiDropChevron" aria-hidden="true">
                <FontAwesomeIcon icon={faChevronDown} />
              </span>
            </button>

            {isOpen ? (
              <div className="dg-aiMenu" role="menu">
                {options.map((o) => (
                  <button
                    key={o.id}
                    className={o.id === selectedId ? 'dg-aiMenuItem dg-aiMenuItemActive' : 'dg-aiMenuItem'}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setPref(k, o.value)
                      setIsOpen(false)
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="dg-cardHeader">
        <div className="dg-pageHeaderRow">
          <button className="dg-iconBtn" type="button" aria-label="Back" onClick={onBack}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <div className="dg-pageHeaderText">
            <h1 className="dg-cardTitle">AI Preferences</h1>
            <p className="dg-cardHint">
              Tune how the AI evaluates your outfits and how it communicates suggestions. These settings change the style of recommendations, not your account.
            </p>
          </div>
        </div>
      </div>

      <div className="dg-form">
        <div className="dg-scanBlock">
          <div className="dg-scanTitle">Communication</div>
          <Slider k="tone" title="Tone" hint="How encouraging the AI should sound." />
          <Slider k="strictness" title="Strictness" hint="How harsh/lenient the feedback should be." />
          <Slider k="detail" title="Detail level" hint="How detailed the response should be." />
        </div>

        <div className="dg-scanBlock">
          <div className="dg-scanTitle">Recommendation Style</div>
          <Slider k="creativity" title="Creativity" hint="How experimental the outfit ideas can be." />
          <Slider k="trendiness" title="Trendiness" hint="How much the AI should follow trends." />
          <Slider k="comfort" title="Comfort priority" hint="Balance style vs comfort." />
          <Slider k="weather" title="Weather sensitivity" hint="How much the AI should prioritize weather." />
          <Slider k="budget" title="Budget" hint="Suggestion cost preference." />
        </div>

        <div className="dg-scanBlock">
          <div className="dg-scanTitle">Personal Style</div>
          <Slider k="formality" title="Formality" hint="Casual vs formal outfits." />
          <Slider k="color" title="Color adventurousness" hint="Neutral vs colorful looks." />
        </div>

        <button className="dg-btn dg-btnGhost" type="button" onClick={() => setPrefs(defaults)}>
          Reset to defaults
        </button>

        <button className="dg-btn dg-btnPrimary" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </>
  )
}

export default AIPreferencesPage
