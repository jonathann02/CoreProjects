import { useState, useEffect, useCallback } from 'react'
import { api } from './services/api'
import type { ProductDto, PagedResult } from './types/api'
import { useAuth } from './hooks'
import { AuthProvider } from './contexts'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import './App.css'

function AdminPanel() {
  const [products, setProducts] = useState<PagedResult<ProductDto> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { user, logout } = useAuth()

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      const result = await api.getProducts(search || undefined, page, 10)
      setProducts(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleEdit = (product: ProductDto) => {
    setEditingProduct(product)
  }

  const handleSave = async (updatedProduct: Partial<ProductDto>) => {
    if (!editingProduct) return

    try {
      const updateRequest = {
        name: updatedProduct.name || editingProduct.name,
        description: updatedProduct.description || editingProduct.description,
        price: updatedProduct.price || editingProduct.price,
        currency: updatedProduct.currency || editingProduct.currency,
        stockQty: updatedProduct.stockQty || editingProduct.stockQty,
      }

      await api.updateProduct(editingProduct.id, updateRequest)
      setEditingProduct(null)
      await loadProducts() // Reload the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product')
    }
  }

  const handleCancel = () => {
    setEditingProduct(null)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>Catalog Admin Panel</h1>
          {user && (
            <div className="user-info">
              <span>Welcome, {user.username}</span>
              <button onClick={logout} className="logout-btn">
                Logout
              </button>
            </div>
          )}
        </div>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <main className="app-main">
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {loading ? (
          <div className="loading">Loading products...</div>
        ) : products ? (
          <>
            <div className="products-grid">
              {products.items.map((product) => (
                <div key={product.id} className="product-card">
                  {editingProduct?.id === product.id ? (
                    <ProductEditForm
                      product={product}
                      onSave={handleSave}
                      onCancel={handleCancel}
                    />
                  ) : (
                    <ProductCard
                      product={product}
                      onEdit={() => handleEdit(product)}
                    />
                  )}
                </div>
              ))}
            </div>

            {products.totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={!products.hasPreviousPage}
                >
                  Previous
                </button>
                <span>
                  Page {products.page} of {products.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(products.totalPages, p + 1))}
                  disabled={!products.hasNextPage}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">No products found</div>
        )}
      </main>
    </div>
  )
}

interface ProductCardProps {
  product: ProductDto
  onEdit: () => void
}

function ProductCard({ product, onEdit }: ProductCardProps) {
  return (
    <div className="product-content">
      <div className="product-header">
        <h3>{product.name}</h3>
        <span className={`status ${product.isActive ? 'active' : 'inactive'}`}>
          {product.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="product-details">
        <p><strong>SKU:</strong> {product.sku}</p>
        <p><strong>Price:</strong> {product.price} {product.currency}</p>
        <p><strong>Stock:</strong> {product.stockQty}</p>
        {product.description && (
          <p><strong>Description:</strong> {product.description}</p>
        )}
      </div>

      <div className="product-actions">
        <button onClick={onEdit} className="edit-btn">
          Edit
        </button>
      </div>
    </div>
  )
}

interface ProductEditFormProps {
  product: ProductDto
  onSave: (updates: Partial<ProductDto>) => void
  onCancel: () => void
}

function ProductEditForm({ product, onSave, onCancel }: ProductEditFormProps) {
  const [formData, setFormData] = useState({
    name: product.name,
    description: product.description,
    price: product.price,
    currency: product.currency,
    stockQty: product.stockQty,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="product-edit-form">
      <div className="form-group">
        <label>Name:</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label>Description:</label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Price:</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
            required
          />
        </div>

        <div className="form-group">
          <label>Currency:</label>
          <select
            value={formData.currency}
            onChange={(e) => handleChange('currency', e.target.value)}
            required
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="SEK">SEK</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Stock Quantity:</label>
        <input
          type="number"
          min="0"
          value={formData.stockQty}
          onChange={(e) => handleChange('stockQty', parseInt(e.target.value) || 0)}
          required
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="save-btn">Save</button>
        <button type="button" onClick={onCancel} className="cancel-btn">Cancel</button>
      </div>
    </form>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProtectedRoute requiredRole="ADMIN">
          <AdminPanel />
        </ProtectedRoute>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
