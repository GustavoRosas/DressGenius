import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'

function PlaceholderPage({ title, subtitle, onBack }) {
  return (
    <>
      <div className="dg-cardHeader">
        <div className="dg-pageHeaderRow">
          <button className="dg-iconBtn" type="button" aria-label="Back" onClick={onBack}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <div className="dg-pageHeaderText">
            <h1 className="dg-cardTitle">{title}</h1>
            {subtitle ? <p className="dg-cardHint">{subtitle}</p> : null}
          </div>
        </div>
      </div>

      <div className="dg-form">
        <div className="dg-scanBlock">
          <div className="dg-scanTitle">Coming soon</div>
          <div className="dg-scanText">This section is a placeholder for now.</div>
        </div>

        <button className="dg-btn dg-btnPrimary" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </>
  )
}

export default PlaceholderPage
