import React from 'react'

function HomePage({ user, isSubmitting, onLogout }) {
  return (
    <>
      <div className="dg-cardHeader">
        <h1 className="dg-cardTitle">You’re in</h1>
        <p className="dg-cardHint">
          Signed in as <strong>{user?.email}</strong>
        </p>
      </div>

      <div className="dg-actions">
        <button className="dg-btn dg-btnPrimary" type="button" onClick={onLogout} disabled={isSubmitting}>
          {isSubmitting ? 'Logging out…' : 'Logout'}
        </button>
      </div>
    </>
  )
}

export default HomePage
