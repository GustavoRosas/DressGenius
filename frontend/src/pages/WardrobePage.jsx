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
} from '@fortawesome/free-solid-svg-icons'

function WardrobePage({ apiBase, token, onBack, onNotify }) {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)

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
                {activeCategoryItems.map((it) => (
                  <div key={it.id} className="dg-historyRow">
                    <div className="dg-closetIcon" aria-hidden="true">
                      <FontAwesomeIcon icon={pickIcon(it)} />
                    </div>
                    <div className="dg-historyText">
                      <div className="dg-historyTitle">{sentenceCase(it.label)}</div>
                      {renderColors(it.colors) ? <div className="dg-historyMeta">{renderColors(it.colors)}</div> : null}
                    </div>
                  </div>
                ))}
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
                  {list.slice(0, 3).map((it) => (
                    <div key={it.id} className="dg-historyRow">
                      <div className="dg-closetIcon" aria-hidden="true">
                        <FontAwesomeIcon icon={pickIcon(it)} />
                      </div>
                      <div className="dg-historyText">
                        <div className="dg-historyTitle">{sentenceCase(it.label)}</div>
                        {renderColors(it.colors) ? <div className="dg-historyMeta">{renderColors(it.colors)}</div> : null}
                      </div>
                    </div>
                  ))}
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
