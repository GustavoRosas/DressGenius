import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWandMagicSparkles, faSliders, faShirt, faClockRotateLeft } from '@fortawesome/free-solid-svg-icons'

function HomePage({ user, isSubmitting, onSelect }) {
  function go(view) {
    if (isSubmitting) return
    onSelect?.(view)
  }

  return (
    <>
      <div className="dg-cardHeader">
        <h1 className="dg-cardTitle">Home</h1>
        <p className="dg-cardHint">
          Signed in as <strong>{user?.email}</strong>
        </p>
      </div>

      <div className="dg-form">
        <div className="dg-scanBlock">
          <button className="dg-btn dg-btnPrimary dg-menuBtn" type="button" onClick={() => go('scan')} disabled={isSubmitting}>
            <span className="dg-menuIcon" aria-hidden="true">
              <FontAwesomeIcon icon={faWandMagicSparkles} />
            </span>
            Analyze outfit
          </button>
          <button className="dg-btn dg-btnGhost dg-menuBtn" type="button" onClick={() => go('closet')} disabled={isSubmitting}>
            <span className="dg-menuIcon" aria-hidden="true">
              <FontAwesomeIcon icon={faShirt} />
            </span>
            My closet
          </button>
          <button className="dg-btn dg-btnGhost dg-menuBtn" type="button" onClick={() => go('history')} disabled={isSubmitting}>
            <span className="dg-menuIcon" aria-hidden="true">
              <FontAwesomeIcon icon={faClockRotateLeft} />
            </span>
            History
          </button>
          <button className="dg-btn dg-btnGhost dg-menuBtn" type="button" onClick={() => go('ai_prefs')} disabled={isSubmitting}>
            <span className="dg-menuIcon" aria-hidden="true">
              <FontAwesomeIcon icon={faSliders} />
            </span>
            AI Preferences
          </button>
        </div>
      </div>
    </>
  )
}

export default HomePage
