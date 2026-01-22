import React, { useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faShirt,
  faPersonDress,
  faShoePrints,
  faSocks,
  faVest,
  faUserTie,
  faMitten,
  faHatCowboy,
  faRing,
  faBagShopping,
  faGlasses,
  faGem,
  faXmark,
  faCircleNotch,
  faPen,
  faCheck,
} from '@fortawesome/free-solid-svg-icons'

function WardrobePage({ apiBase, token, onBack, onNotify }) {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [savingId, setSavingId] = useState(null)

  function sentenceCase(value) {
    const s = String(value ?? '').trim()
    if (!s) return ''
    const lower = s.toLowerCase()
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }

  function colorToCss(colorName) {
    const c = String(colorName ?? '').trim().toLowerCase()
    if (!c) return null

    if (c.startsWith('#') || c.startsWith('rgb(') || c.startsWith('rgba(') || c.startsWith('hsl(') || c.startsWith('hsla(')) {
      return c
    }

    const map = {
      black: '#111827',
      white: '#ffffff',
      gray: '#9ca3af',
      grey: '#9ca3af',
      silver: '#d1d5db',
      charcoal: '#374151',
      navy: '#0f172a',
      blue: '#2563eb',
      lightblue: '#60a5fa',
      sky: '#38bdf8',
      teal: '#14b8a6',
      green: '#22c55e',
      olive: '#667a2f',
      yellow: '#facc15',
      mustard: '#d4a017',
      orange: '#f97316',
      red: '#ef4444',
      maroon: '#7f1d1d',
      pink: '#ec4899',
      purple: '#a855f7',
      lavender: '#c4b5fd',
      brown: '#92400e',
      tan: '#d2b48c',
      beige: '#d6c4a8',
      cream: '#fff6d5',
      nude: '#e7c3a1',
      gold: '#d4af37',
      bronze: '#b08d57',
    }

    const key = c.replace(/\s+/g, '')
    return map[key] || c
  }

  function renderColors(colors) {
    if (!Array.isArray(colors) || !colors.length) return null
    return (
      <div className="dg-colorRow">
        {colors.map((c) => (
          <span key={c} className="dg-colorChip">
            <span className="dg-colorDot" style={{ background: colorToCss(c) || 'transparent' }} aria-hidden="true" />
            {c}
          </span>
        ))}
      </div>
    )
  }

  function pickIcon(item) {
    const label = String(item?.label ?? '').toLowerCase()
    const category = String(item?.category ?? '').toLowerCase()
    const hay = `${category} ${label}`

    if (/(shoe|sneaker|boot|heel|loafer|sandal|slide|flat)/.test(hay)) return faShoePrints
    if (/(sock|socks)/.test(hay)) return faSocks

    if (/(dress|gown|skirt)/.test(hay)) return faPersonDress
    if (/(pants|trouser|jean|denim|short)/.test(hay)) return faVest

    if (/(coat|jacket|blazer|hoodie|cardigan|sweater|outerwear)/.test(hay)) return faVest
    if (/(shirt|tee|t-shirt|top|blouse|tank|camisole)/.test(hay)) return faShirt

    if (/(tie|suit)/.test(hay)) return faUserTie
    if (/(glove|mitt)/.test(hay)) return faMitten
    if (/(hat|cap|beanie)/.test(hay)) return faHatCowboy
    if (/(bag|purse|handbag|tote|backpack)/.test(hay)) return faBagShopping
    if (/(glass|sunglass|glasses)/.test(hay)) return faGlasses
    if (/(ring)/.test(hay)) return faRing
    if (/(necklace|bracelet|earring|jewelry|jewel)/.test(hay)) return faGem

    return faShirt
  }

  const grouped = useMemo(() => {
    const byCat = new Map()
    for (const it of items) {
      const cat = it?.category || 'other'
      if (!byCat.has(cat)) byCat.set(cat, [])
      byCat.get(cat).push(it)
    }
    return Array.from(byCat.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [items])

  const activeCategoryItems = useMemo(() => {
    if (!activeCategory) return []
    const found = grouped.find(([cat]) => cat === activeCategory)
    return found ? found[1] : []
  }, [activeCategory, grouped])

  async function removeNow(item) {
    if (!item?.id) return
    if (!apiBase || !token) return
    if (deletingId) return

    setError('')
    setDeletingId(item.id)
    try {
      const res = await fetch(`${apiBase}/wardrobe-items/${item.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })

      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}))
        setError(data?.message || 'Failed to remove item')
        return
      }

      setItems((prev) => prev.filter((x) => x?.id !== item.id))
      onNotify?.('info', 'Removed from closet.')
    } catch {
      setError('Failed to remove item')
    } finally {
      setDeletingId(null)
    }
  }

  function startEdit(item) {
    setError('')
    setEditingId(item.id)
    setEditValue(String(item.label ?? ''))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
  }

  async function saveEdit(item) {
    if (!item?.id) return
    if (!apiBase || !token) return
    if (savingId) return

    const nextLabel = editValue.trim()
    if (!nextLabel) {
      setError('Name is required.')
      return
    }
    if (nextLabel.length > 64) {
      setError('Name must be at most 64 characters.')
      return
    }

    setSavingId(item.id)
    setError('')
    try {
      const res = await fetch(`${apiBase}/wardrobe-items/${item.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ label: nextLabel }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.message || 'Failed to rename item')
        return
      }

      const updated = data?.item
      if (updated?.id) {
        setItems((prev) => prev.map((x) => (x?.id === updated.id ? { ...x, label: updated.label } : x)))
      }
      cancelEdit()
      onNotify?.('info', 'Updated item name.')
    } catch {
      setError('Failed to rename item')
    } finally {
      setSavingId(null)
    }
  }

  function renderItemRow(it) {
    const isBusy = deletingId === it.id
    const isEditing = editingId === it.id
    const isSaving = savingId === it.id
    return (
      <div key={it.id} className="dg-historyRow">
        <div className="dg-closetIcon" aria-hidden="true">
          <FontAwesomeIcon icon={pickIcon(it)} />
        </div>
        <div className="dg-historyText">
          {isEditing ? (
            <input
              className="dg-input"
              type="text"
              value={editValue}
              maxLength={64}
              disabled={isSaving}
              onChange={(e) => setEditValue(e.target.value)}
            />
          ) : (
            <div className="dg-historyTitle">{sentenceCase(it.label)}</div>
          )}
          {renderColors(it.colors) ? <div className="dg-historyMeta">{renderColors(it.colors)}</div> : null}
        </div>

        {isEditing ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="dg-iconBtn dg-iconBtnSuccess"
              type="button"
              title="Save name"
              aria-label="Save name"
              disabled={isSaving}
              onClick={() => saveEdit(it)}
            >
              <FontAwesomeIcon icon={isSaving ? faCircleNotch : faCheck} spin={isSaving} />
            </button>
            <button
              className="dg-iconBtn"
              type="button"
              title="Cancel"
              aria-label="Cancel"
              disabled={isSaving}
              onClick={cancelEdit}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="dg-iconBtn"
              type="button"
              title="Edit name"
              aria-label="Edit name"
              disabled={isBusy}
              onClick={() => startEdit(it)}
            >
              <FontAwesomeIcon icon={faPen} />
            </button>
            <button
              className="dg-iconBtn dg-iconBtnDanger"
              type="button"
              title="Remove this piece from your closet"
              aria-label="Remove this piece from your closet"
              disabled={isBusy}
              onClick={() => removeNow(it)}
            >
              <FontAwesomeIcon icon={isBusy ? faCircleNotch : faXmark} spin={isBusy} />
            </button>
          </div>
        )}
      </div>
    )
  }

  useEffect(() => {
    if (!apiBase || !token) return
    let mounted = true

    async function load() {
      setIsLoading(true)
      setError('')
      try {
        const res = await fetch(`${apiBase}/wardrobe-items`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data?.message || 'Failed to load wardrobe')
          return
        }

        if (!mounted) return
        setItems(Array.isArray(data?.items) ? data.items : [])
      } catch {
        setError('Failed to load wardrobe')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [apiBase, token])

  return (
    <>
      <div className="dg-cardHeader">
        <div className="dg-pageHeaderRow">
          <button className="dg-iconBtn" type="button" aria-label="Back" onClick={onBack}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <div className="dg-pageHeaderText">
            <h1 className="dg-cardTitle">My Closet</h1>
            <p className="dg-cardHint">Your saved wardrobe items.</p>
          </div>
        </div>
      </div>

      <div className="dg-form">
        {isLoading ? (
          <div className="dg-scanBlock">
            <div className="dg-scanTitle">Loading…</div>
          </div>
        ) : error ? (
          <div className="dg-alert">{error}</div>
        ) : items.length ? (
          activeCategory ? (
            <div className="dg-scanBlock">
              <div className="dg-scanTitle">{sentenceCase(activeCategory)}</div>
              <div className="dg-historyList">
                {activeCategoryItems.map((it) => renderItemRow(it))}
              </div>

              <button className="dg-btn dg-btnGhost" type="button" onClick={() => setActiveCategory(null)}>
                Back to My Closet
              </button>
            </div>
          ) : (
            grouped.map(([cat, list]) => (
              <div key={cat} className="dg-scanBlock">
                <div className="dg-scanTitle">{sentenceCase(cat)}</div>
                <div className="dg-historyList">
                  {list.slice(0, 3).map((it) => renderItemRow(it))}
                </div>

                {list.length > 3 ? (
                  <button className="dg-btn dg-btnGhost" type="button" onClick={() => setActiveCategory(cat)}>
                    View all {sentenceCase(cat)}
                  </button>
                ) : null}
              </div>
            ))
          )
        ) : (
          <div className="dg-scanBlock">
            <div className="dg-scanTitle">No items yet</div>
            <div className="dg-scanText">Analyze an outfit and save detected pieces to build your closet.</div>
          </div>
        )}

        <button className="dg-btn dg-btnPrimary" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </>
  )
}

export default WardrobePage
