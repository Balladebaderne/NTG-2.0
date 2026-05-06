import React from 'react'

export function DashboardPage({ onSignOut }) {
  return (
    <main className="app-shell signed-in">
      <section className="dashboard" aria-labelledby="dashboard-title">
        <div>
          <p className="eyebrow">Signed in</p>
          <h1 id="dashboard-title">JWT + navigation test</h1>
          <p className="dashboard-copy">
            A signed JWT was issued and navigation works.
          </p>
        </div>

        <button className="secondary-button" type="button" onClick={onSignOut}>
          Sign out
        </button>
      </section>
    </main>
  )
}
