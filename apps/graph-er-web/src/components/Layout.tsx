import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Upload, Database, Network, BarChart3 } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Batches', href: '/batches', icon: Database },
  { name: 'Upload', href: '/upload', icon: Upload },
  { name: 'Clusters', href: '/clusters', icon: Network },
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Network className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">
                  Graph & Entity Resolution Lab
                </span>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex space-x-8">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href ||
                  (item.href === '/batches' && location.pathname === '/')
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
