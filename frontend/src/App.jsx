import React, { useEffect, useState } from 'react'
import { ChatPage } from './pages/ChatPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { ShipmentDetailPage } from './pages/ShipmentDetailPage'
import { SupportPage } from './pages/SupportPage'

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

function shipmentIdFromPath(path) {
  const match = path.match(/^\/shipments\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : null
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
    if (!token && path !== ROUTES.login) {
      navigate(ROUTES.login, true)
      setPath(ROUTES.login)
      return
    }

    if (token && (path === '/' || path === ROUTES.login)) {
      navigate(ROUTES.dashboard, true)
      setPath(ROUTES.dashboard)
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
    const shipmentId = shipmentIdFromPath(path)

    function handleNavigate(nextPath) {
      navigate(nextPath)
      setPath(nextPath)
    }

    if (shipmentId) {
      return (
        <ShipmentDetailPage
          onNavigate={handleNavigate}
          onSignOut={handleSignOut}
          shipmentId={shipmentId}
          token={token}
        />
      )
    }

    if (path === '/support') {
      return <SupportPage onNavigate={handleNavigate} onSignOut={handleSignOut} token={token} />
    }

    if (path === '/chat') {
      return <ChatPage onNavigate={handleNavigate} onSignOut={handleSignOut} token={token} />
    }

    return <DashboardPage onNavigate={handleNavigate} onSignOut={handleSignOut} token={token} />
  }

  return <LoginPage onAuthenticated={handleAuthenticated} />
}
