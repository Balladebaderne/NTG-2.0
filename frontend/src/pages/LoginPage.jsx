import React, { useState } from 'react'
import { login } from '../clients/authClient'

export function LoginPage({ onAuthenticated }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      })

      setPassword('')
      onAuthenticated(nextSession.token)
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="brand-panel" aria-labelledby="page-title">
        <div className="brand-mark" aria-hidden="true">
          NTG
        </div>
        <h1 id="page-title">NTG operations</h1>
        <p className="brand-copy">
          Lorem ipsum dolor sit amet.
        </p>

        <div className="status-grid" aria-label="Login capabilities">
          <span>Lorem, ipsum.</span>
          <span>Lorem.</span>
          <span>Lorem, ipsum dolor.</span>
          <span>lorem.</span>
        </div>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h2 id="login-title">Sign in</h2>
          </div>
        </div>

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

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}
