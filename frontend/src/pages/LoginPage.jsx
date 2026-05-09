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
          <div className="login-brand-top">
            <BrandMark inverted />
          </div>

          <div className="login-brand-body">
            <p className="eyebrow">NTG Portal</p>
            <h1 id="page-title">Vi hjælper dit gods på vej</h1>
            <p>
              Global transport og logistik fra vejtransport til søfragt — samlet i ét workspace for kunder, chauffører og operatører.
            </p>
          </div>

          <div className="login-brand-bottom">
            <div className="login-stats">
              <div className="login-stat">
                <strong>100+</strong>
                <span>Lande</span>
              </div>
              <div className="login-stat">
                <strong>3.500+</strong>
                <span>Medarbejdere</span>
              </div>
              <div className="login-stat">
                <strong>1991</strong>
                <span>Grundlagt</span>
              </div>
            </div>
            <div className="login-services">
              <span>Vejtransport</span>
              <span>Søfragt</span>
              <span>Luftfragt</span>
              <span>Express</span>
              <span>Lagerlogistik</span>
            </div>
          </div>
        </section>

        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-panel-inner">

            <div className="login-form-logo">
              <BrandMark />
            </div>

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
                  placeholder="name@ntg.com"
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
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="login-trust">
              <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
                <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
                  <path d="M12 2 3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7l-9-5Z" />
                  <path d="m9 12 2 2 4-4" />
                </g>
              </svg>
              Secured NTG corporate access
            </div>

          </div>
        </section>

      </div>
    </main>
  )
}
