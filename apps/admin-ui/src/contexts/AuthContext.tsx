import React, { createContext, useState, useEffect } from 'react'
import type { AuthContextType, AuthProviderProps, User } from './AuthTypes'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing token on app start
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token')
    const storedUser = localStorage.getItem('auth_user')

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setToken(storedToken)
        setUser(parsedUser)
      } catch (error) {
        console.error('Failed to parse stored auth data:', error)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string): Promise<void> => {
    try {
      setIsLoading(true)

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Login failed' }))
        throw new Error(errorData.message || `Login failed: ${response.status}`)
      }

      const data = await response.json()
      const { access_token, user: userData } = data

      setToken(access_token)
      setUser(userData)

      // Store in localStorage
      localStorage.setItem('auth_token', access_token)
      localStorage.setItem('auth_user', JSON.stringify(userData))

    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }

  const refreshToken = async (): Promise<void> => {
    if (!token) return

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const data = await response.json()
      const { access_token } = data

      setToken(access_token)
      localStorage.setItem('auth_token', access_token)

    } catch (error) {
      console.error('Token refresh error:', error)
      logout() // Clear auth state on refresh failure
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    logout,
    refreshToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

