import type { ReactNode } from 'react'

export interface User {
  id: string
  username: string
  email: string
  roles: string[]
}

export interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}

export interface AuthProviderProps {
  children: ReactNode
}
