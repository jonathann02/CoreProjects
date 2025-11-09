import React from 'react'
import { useAuth } from '../hooks'
import { LoginForm } from './LoginForm'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole
}) => {
  const { isAuthenticated, user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginForm />
  }

  // Check role if required
  if (requiredRole && user && !user.roles.includes(requiredRole)) {
    return (
      <div className="error-container">
        <h2>Access Denied</h2>
        <p>You don't have permission to access this resource.</p>
        <p>Required role: {requiredRole}</p>
        <p>Your roles: {user.roles.join(', ')}</p>
      </div>
    )
  }

  return <>{children}</>
}
