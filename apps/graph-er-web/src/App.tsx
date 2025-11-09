import { Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import Layout from './components/Layout'
import BatchesPage from './pages/BatchesPage'
import ClustersPage from './pages/ClustersPage'
import RecordsPage from './pages/RecordsPage'
import UploadPage from './pages/UploadPage'

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false
        }
        return failureCount < 3
      },
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Routes>
          <Route path="/" element={<BatchesPage />} />
          <Route path="/batches" element={<BatchesPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/clusters" element={<ClustersPage />} />
          <Route path="/records/:id" element={<RecordsPage />} />
        </Routes>
      </Layout>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
