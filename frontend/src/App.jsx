import React, { useEffect, useState } from 'react'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'

const TOKEN_STORAGE_KEY = 'ntg-login-token'
const ROUTES = {
  dashboard: '/dashboard',
  login: '/login',
}

function navigate(path, replace = false) {
  if (window.location.pathname === path) {
    return
  }

  const method = replace ? 'replaceState' : 'pushState'
  window.history[method](null, '', path)
}

export function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY))
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    function handleNavigation() {
      setPath(window.location.pathname)
    }

    window.addEventListener('popstate', handleNavigation)
    return () => window.removeEventListener('popstate', handleNavigation)
  }, [])

  useEffect(() => {
    const nextPath = token ? ROUTES.dashboard : ROUTES.login
    const shouldReplace = path === '/' || path !== nextPath

    if (shouldReplace) {
      navigate(nextPath, true)
      setPath(nextPath)
    }
  }, [path, token])

  function handleAuthenticated(nextToken) {
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken)
    setToken(nextToken)
    navigate(ROUTES.dashboard)
    setPath(ROUTES.dashboard)
  }

  function handleSignOut() {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setToken(null)
    navigate(ROUTES.login)
    setPath(ROUTES.login)
  }

  if (token) {
    return <DashboardPage onSignOut={handleSignOut} />
  }

  return <LoginPage onAuthenticated={handleAuthenticated} />
}
