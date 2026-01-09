import React from 'react'

function PlaceholderPage({ title, subtitle, onBack }) {
  return (
    <>
      <div className="dg-cardHeader">
        <h1 className="dg-cardTitle">{title}</h1>
        {subtitle ? <p className="dg-cardHint">{subtitle}</p> : null}
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
