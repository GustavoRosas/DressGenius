import React, { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'

function OutfitChatHistoryPage({ apiBase, token, onOpenSession, onBack }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    if (!apiBase || !token) return

    let mounted = true

    async function load() {
      setIsLoading(true)
      setError('')
      try {
        const res = await fetch(`${apiBase}/outfit-chats`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data?.message || 'Failed to load history')
          return
        }

        if (!mounted) return
        setSessions(Array.isArray(data?.sessions) ? data.sessions : [])
      } catch {
        setError('Failed to load history')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [apiBase, token])

  const hasSessions = sessions.length > 0
  const showPlaceholder = isLoading && !error && sessions.length === 0

  return (
    <>
      <div className="dg-cardHeader">
        <div className="dg-pageHeaderRow">
          <button className="dg-iconBtn" type="button" aria-label="Back" onClick={onBack}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <div className="dg-pageHeaderText">
            <h1 className="dg-cardTitle">History</h1>
            <p className="dg-cardHint">Your previous outfit chats.</p>
          </div>
        </div>
      </div>

      <div className="dg-form">
        {error ? <div className="dg-alert">{error}</div> : null}

        {showPlaceholder ? (
          <div className="dg-scanBlock" aria-busy="true" aria-label="Loading chat history">
            <div className="dg-scanTitle">Loading...</div>
            <div className="dg-historyList">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="dg-historyItem" style={{ opacity: 0.7 }}>
                  <div className="dg-historyThumb" />
                  <div className="dg-historyMeta">
                    <div className="dg-historyTitle">&nbsp;</div>
                    <div className="dg-historySub">&nbsp;</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!error && !isLoading && !hasSessions ? (
          <div className="dg-scanBlock">
            <div className="dg-scanTitle">No chats yet</div>
            <div className="dg-scanText">Start an Analyze Outfit chat to see it here.</div>
          </div>
        ) : null}

        {hasSessions ? (
          <div className="dg-scanBlock">
            <div className="dg-historyList">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  className="dg-historyItem"
                  type="button"
                  onClick={() => onOpenSession?.(s.id)}
                  disabled={isLoading}
                >
                  {s.image_url ? <img className="dg-historyThumb" src={s.image_url} alt="Outfit" /> : <div className="dg-historyThumb" />}
                  <div className="dg-historyMeta">
                    <div className="dg-historyTitle">{s.title || `Outfit Chat #${s.id}`}</div>
                    <div className="dg-historySub">
                      {typeof s.score === 'number' ? `Score: ${s.score}` : 'Score: —'}
                      {' · '}
                      Turns: {s.turns_used ?? 0}/10
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <button className="dg-btn dg-btnPrimary" type="button" onClick={onBack} disabled={isLoading}>
          Back
        </button>
      </div>
    </>
  )
}

export default OutfitChatHistoryPage
