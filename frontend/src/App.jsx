import React, { useEffect, useState } from 'react'
import { normalizeRole, roleHomePath } from './components/PortalLayout'
import { AdminLandingPage } from './pages/AdminLandingPage'
import { ChatPage } from './pages/ChatPage'
import {
  CustomerDashboardPage,
  CustomerShipmentsPage,
  CustomerSupportPage,
} from './pages/CustomerPages'
import {
  DriverAssignedShipmentsPage,
  DriverDashboardPage,
  DriverEventsPage,
  DriverLoyaltyPage,
  DriverShipmentUpdatePage,
} from './pages/DriverPages'
import { LoginPage } from './pages/LoginPage'
import {
  OperatorCreateShipmentPage,
  OperatorCustomersPage,
  OperatorDashboardPage,
  OperatorDriversPage,
  OperatorEventsPage,
  OperatorShipmentsPage,
} from './pages/OperatorPages'
import {
  PublicContactPage,
  PublicHomePage,
  PublicServicesPage,
  PublicTrackPage,
} from './pages/PublicPages'
import { ShipmentDetailPage } from './pages/ShipmentDetailPage'
import { readSessionProfile } from './utils/session'

const TOKEN_STORAGE_KEY = 'ntg-login-token'
const PUBLIC_PATHS = new Set(['/', '/services', '/track', '/contact', '/login'])

function currentLocation() {
  return `${window.location.pathname}${window.location.search}`
}

function navigate(path, replace = false) {
  if (currentLocation() === path) return
  const method = replace ? 'replaceState' : 'pushState'
  window.history[method](null, '', path)
}

function parseLocation(location) {
  const url = new URL(location, window.location.origin)
  return {
    pathname: url.pathname.replace(/\/+$/, '') || '/',
    searchParams: url.searchParams,
  }
}

function activeForShipment(profile) {
  const role = normalizeRole(profile?.role)
  if (role === 'driver') return 'driver-assigned'
  if (role === 'operator') return 'operator-shipments'
  return 'customer-shipments'
}

export function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY))
  const [location, setLocation] = useState(() => currentLocation())

  const { pathname, searchParams } = parseLocation(location)
  const profile = readSessionProfile(token)

  useEffect(() => {
    function handleNavigation() {
      setLocation(currentLocation())
    }

    window.addEventListener('popstate', handleNavigation)
    return () => window.removeEventListener('popstate', handleNavigation)
  }, [])

  useEffect(() => {
    if (!token && !PUBLIC_PATHS.has(pathname)) {
      navigate('/login', true)
      setLocation('/login')
      return
    }

    if (token && (pathname === '/' || pathname === '/login' || pathname === '/dashboard')) {
      const homePath = roleHomePath(profile)
      navigate(homePath, true)
      setLocation(homePath)
    }
  }, [pathname, profile?.role, token])

  function handleNavigate(nextPath, replace = false) {
    navigate(nextPath, replace)
    setLocation(currentLocation())
  }

  function handleAuthenticated(nextToken) {
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken)
    const nextProfile = readSessionProfile(nextToken)
    const homePath = roleHomePath(nextProfile)
    setToken(nextToken)
    navigate(homePath)
    setLocation(homePath)
  }

  function handleSignOut() {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setToken(null)
    navigate('/login')
    setLocation('/login')
  }

  if (!token) {
    if (pathname === '/services') return <PublicServicesPage onNavigate={handleNavigate} />
    if (pathname === '/track') return <PublicTrackPage initialQuery={searchParams.get('id') || ''} onNavigate={handleNavigate} />
    if (pathname === '/contact') return <PublicContactPage onNavigate={handleNavigate} />
    if (pathname === '/login') return <LoginPage onAuthenticated={handleAuthenticated} />
    return <PublicHomePage onNavigate={handleNavigate} />
  }

  if (pathname === '/services') return <PublicServicesPage onNavigate={handleNavigate} />
  if (pathname === '/track') return <PublicTrackPage initialQuery={searchParams.get('id') || ''} onNavigate={handleNavigate} />
  if (pathname === '/contact') return <PublicContactPage onNavigate={handleNavigate} />

  const customerShipmentMatch = pathname.match(/^\/customer\/shipments\/([^/]+)$/)
  const driverShipmentUpdateMatch = pathname.match(/^\/driver\/shipments\/([^/]+)\/update$/)
  const operatorShipmentMatch = pathname.match(/^\/operator\/shipments\/([^/]+)$/)
  const legacyShipmentMatch = pathname.match(/^\/shipments\/([^/]+)$/)

  if (customerShipmentMatch) {
    return (
      <ShipmentDetailPage
        active="customer-shipments"
        onNavigate={handleNavigate}
        onSignOut={handleSignOut}
        profile={profile}
        shipmentId={decodeURIComponent(customerShipmentMatch[1])}
        token={token}
      />
    )
  }

  if (operatorShipmentMatch && operatorShipmentMatch[1] !== 'create') {
    return (
      <ShipmentDetailPage
        active="operator-shipments"
        onNavigate={handleNavigate}
        onSignOut={handleSignOut}
        profile={profile}
        shipmentId={decodeURIComponent(operatorShipmentMatch[1])}
        token={token}
      />
    )
  }

  if (legacyShipmentMatch) {
    return (
      <ShipmentDetailPage
        active={activeForShipment(profile)}
        onNavigate={handleNavigate}
        onSignOut={handleSignOut}
        profile={profile}
        shipmentId={decodeURIComponent(legacyShipmentMatch[1])}
        token={token}
      />
    )
  }

  if (driverShipmentUpdateMatch) {
    return (
      <DriverShipmentUpdatePage
        onNavigate={handleNavigate}
        onSignOut={handleSignOut}
        profile={profile}
        shipmentId={decodeURIComponent(driverShipmentUpdateMatch[1])}
        token={token}
      />
    )
  }

  if (pathname === '/customer/dashboard') {
    return <CustomerDashboardPage onNavigate={handleNavigate} onSignOut={handleSignOut} profile={profile} token={token} />
  }
  if (pathname === '/customer/shipments') {
    return <CustomerShipmentsPage onNavigate={handleNavigate} onSignOut={handleSignOut} profile={profile} token={token} />
  }
  if (pathname === '/customer/support') {
    return <CustomerSupportPage onNavigate={handleNavigate} onSignOut={handleSignOut} profile={profile} token={token} />
  }

  if (pathname === '/driver/dashboard') {
    return <DriverDashboardPage onNavigate={handleNavigate} onSignOut={handleSignOut} profile={profile} token={token} />
  }
  if (pathname === '/driver/assigned-shipments') {
    return <DriverAssignedShipmentsPage onNavigate={handleNavigate} onSignOut={handleSignOut} profile={profile} token={token} />
  }
  if (pathname === '/driver/events') {
    return <DriverEventsPage onNavigate={handleNavigate} onSignOut={handleSignOut} profile={profile} token={token} />
  }
  if (pathname === '/driver/loyalty') {
    return <DriverLoyaltyPage onNavigate={handleNavigate} onSignOut={handleSignOut} profile={profile} token={token} />
  }

  if (pathname === '/chat') {
    return <ChatPage onNavigate={handleNavigate} onSignOut={handleSignOut} profile={profile} token={token} />
  }

  if (pathname === '/admin/console') {
    return <AdminLandingPage onNavigate={handleNavigate} onSignOut={handleSignOut} profile={profile} token={token} />
  }

  if (pathname === '/operator/dashboard' || pathname === '/admin') {
    return <OperatorDashboardPage onNavigate={handleNavigate} onSignOut={handleSignOut} profile={profile} token={token} />
  }
  if (pathname === '/operator/shipments') {
    return <OperatorShipmentsPage onNavigate={handleNavigate} onSignOut={handleSignOut} profile={profile} token={token} />
  }
  if (pathname === '/operator/shipments/create') {
    return <OperatorCreateShipmentPage onNavigate={handleNavigate} onSignOut={handleSignOut} profile={profile} token={token} />
  }
  if (pathname === '/operator/drivers') {
    return <OperatorDriversPage onNavigate={handleNavigate} onSignOut={handleSignOut} profile={profile} token={token} />
  }
  if (pathname === '/operator/customers') {
    return <OperatorCustomersPage onNavigate={handleNavigate} onSignOut={handleSignOut} profile={profile} token={token} />
  }
  if (pathname === '/operator/events') {
    return <OperatorEventsPage onNavigate={handleNavigate} onSignOut={handleSignOut} profile={profile} token={token} />
  }

  const role = normalizeRole(profile?.role)
  if (role === 'driver') {
    return <DriverDashboardPage onNavigate={handleNavigate} onSignOut={handleSignOut} profile={profile} token={token} />
  }
  if (role === 'operator') {
    return <OperatorDashboardPage onNavigate={handleNavigate} onSignOut={handleSignOut} profile={profile} token={token} />
  }
  return <CustomerDashboardPage onNavigate={handleNavigate} onSignOut={handleSignOut} profile={profile} token={token} />
}
