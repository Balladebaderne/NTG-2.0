import React, { useMemo, useState } from 'react'
import { login } from './auth/authClient'
import { clearSession, readRememberedRole, readSession, saveSession } from './auth/sessionStore'
import { ROLE_OPTIONS } from './ui/roleOptions'

export function App() {
  const rememberedRole = readRememberedRole()
  const [activeRole, setActiveRole] = useState(rememberedRole || ROLE_OPTIONS[0].id)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberRole, setRememberRole] = useState(Boolean(rememberedRole))
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [session, setSession] = useState(readSession())
  const [isSubmitting, setIsSubmitting] = useState(false)

  const role = useMemo(
    () => ROLE_OPTIONS.find((candidate) => candidate.id === activeRole) || ROLE_OPTIONS[0],
    [activeRole],
  )

  function selectRole(roleId) {
    setActiveRole(roleId)
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Enter both email and password to continue.')
      return
    }

    setIsSubmitting(true)

    try {
      const nextSession = await login({
        email,
        password,
        role: activeRole,
      })

      saveSession(nextSession, { rememberRole })
      setSession(nextSession)
      setPassword('')
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSignOut() {
    clearSession()
    setSession(null)
    setEmail('')
    setPassword('')
    setError('')
  }

  if (session) {
    const signedInRole =
      ROLE_OPTIONS.find((candidate) => candidate.id === session.user.role) || ROLE_OPTIONS[0]

    return (
      <main className="app-shell signed-in">
        <section className="dashboard" aria-labelledby="dashboard-title">
          <div>
            <p className="eyebrow">Signed in as {signedInRole.label}</p>
            <h1 id="dashboard-title">{signedInRole.destination}</h1>
            <p className="dashboard-copy">
              {session.user.email} now has a JWT session for this login domain.
            </p>
          </div>

          <div className="permission-panel" aria-label={`${signedInRole.label} permissions`}>
            {signedInRole.permissions.map((permission) => (
              <span key={permission}>{permission}</span>
            ))}
          </div>

          <button className="secondary-button" type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="brand-panel" aria-labelledby="page-title">
        <div className="brand-mark" aria-hidden="true">
          NTG
        </div>
        <p className="eyebrow">Secure role access</p>
        <h1 id="page-title">NTG operations login</h1>
        <p className="brand-copy">
          Select your operational role, sign in through the login service, and receive a signed JWT
          for later protected API access.
        </p>

        <div className="status-grid" aria-label="Login capabilities">
          <span>Role-based access</span>
          <span>Signed JWT</span>
          <span>SQLite users</span>
          <span>Gateway ready</span>
        </div>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h2 id="login-title">Sign in</h2>
          </div>
        </div>

        <fieldset className="role-picker">
          <legend>Choose role</legend>
          <div className="role-grid">
            {ROLE_OPTIONS.map((candidate) => (
              <button
                aria-pressed={candidate.id === activeRole}
                className="role-option"
                key={candidate.id}
                onClick={() => selectRole(candidate.id)}
                type="button"
              >
                <span>{candidate.label}</span>
                <small>{candidate.destination}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              autoComplete="email"
              id="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              type="email"
              value={email}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="password-control">
              <input
                autoComplete="current-password"
                id="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                type="button"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <label className="checkbox-row" htmlFor="remember-role">
            <input
              checked={rememberRole}
              id="remember-role"
              onChange={(event) => setRememberRole(event.target.checked)}
              type="checkbox"
            />
            Remember selected role on this device
          </label>

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Signing in...' : `Continue as ${role.label}`}
          </button>
        </form>
      </section>
    </main>
  )
}
