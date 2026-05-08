import React, { useState } from 'react'
import { login } from '../clients/authClient'
import { BrandMark } from '../components/PortalLayout'

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
      const nextSession = await login({ email, password })
      setPassword('')
      onAuthenticated(nextSession.token)
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-layout">
        <section className="login-brand-panel" aria-labelledby="page-title">
          <BrandMark />
          <p className="eyebrow">NTG role portal</p>
          <h1 id="page-title">Transport visibility for every shipment</h1>
          <p>
            A corporate logistics workspace for customers, drivers, and NTG operators to keep shipment status,
            events, ETA, and support context connected.
          </p>
          <div className="login-capability-grid" aria-label="Portal areas">
            <span>Customer shipment overview</span>
            <span>Driver event updates</span>
            <span>Operator control tower</span>
            <span>Tracking timeline</span>
          </div>
        </section>

        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-panel-inner">
            <div>
              <p className="eyebrow">Welcome back</p>
              <h2 id="login-title">Sign in</h2>
              <p>Access the NTG workspace assigned to your account role.</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <label className="field">
                <span>Email</span>
                <input
                  autoComplete="email"
                  id="email"
                  inputMode="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  type="email"
                  value={email}
                />
              </label>

              <label className="field">
                <span>Password</span>
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
              </label>

              {error ? <p className="form-error" role="alert">{error}</p> : null}

              <button className="button-primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Signing in' : 'Sign in'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}
