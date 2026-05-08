import React from 'react'

function buildNavItems(profile) {
  return [
    profile?.role === 'admin' ? { id: 'admin', label: 'Admin', path: '/admin' } : null,
    { id: 'operations', label: 'Operations', path: '/dashboard' },
    { id: 'support', label: 'Support', path: '/support' },
    { id: 'chat', label: 'Chat', path: '/chat' },
  ].filter(Boolean)
}

export function SignedInHeader({ active, onNavigate, onSignOut, profile }) {
  const homePath = profile?.role === 'admin' ? '/admin' : '/dashboard'
  const navItems = buildNavItems(profile)

  return (
    <header className="top-bar signed-in-header">
      <button className="brand-button" type="button" onClick={() => onNavigate(homePath)}>
        NTG
      </button>
      <nav aria-label="Primary navigation" className="primary-nav">
        {navItems.map((item) => (
          <button
            aria-current={active === item.id ? 'page' : undefined}
            className={active === item.id ? 'is-active' : undefined}
            key={item.id}
            onClick={() => onNavigate(item.path)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="profile-actions">
        <div className="profile-chip" aria-label="Signed in user">
          <span>{profile?.roleLabel || 'Signed in'}</span>
          <strong>{profile?.name || 'NTG user'}</strong>
        </div>
        <button className="secondary-button compact" type="button" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </header>
  )
}
