import React, { useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'

function WardrobePage({ apiBase, token, onBack, onNotify }) {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const grouped = useMemo(() => {
    const byCat = new Map()
    for (const it of items) {
      const cat = it?.category || 'other'
      if (!byCat.has(cat)) byCat.set(cat, [])
      byCat.get(cat).push(it)
    }
    return Array.from(byCat.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [items])

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
          grouped.map(([cat, list]) => (
            <div key={cat} className="dg-scanBlock">
              <div className="dg-scanTitle">{cat}</div>
              <div className="dg-historyList">
                {list.map((it) => (
                  <div key={it.id} className="dg-historyRow">
                    <div className="dg-historyText">
                      <div className="dg-historyTitle">{it.label}</div>
                      {Array.isArray(it.colors) && it.colors.length ? (
                        <div className="dg-historyMeta">{it.colors.join(', ')}</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
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
