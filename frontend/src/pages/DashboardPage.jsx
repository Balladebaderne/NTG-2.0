import React from 'react'

export function DashboardPage({ onSignOut }) {
  return (
    <main className="app-shell signed-in">
      <section className="dashboard" aria-labelledby="dashboard-title">
        <div>
          <p className="eyebrow">Signed in</p>
          <h1 id="dashboard-title">JWT session active</h1>
          <p className="dashboard-copy">
            A signed JWT was issued by the login service and stored for later API requests.
          </p>
        </div>

        <button className="secondary-button" type="button" onClick={onSignOut}>
          Sign out
        </button>
      </section>
    </main>
  )
}
