import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Upload, Database, Clock, CheckCircle, XCircle } from 'lucide-react'

export default function BatchesPage() {
  // Mock data for demonstration - will be replaced with real API calls
  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      return [
        {
          id: 'batch-1',
          filename: 'customers.csv',
          uploadedBy: 'john.doe@example.com',
          uploadedAt: new Date('2025-11-09T10:00:00Z'),
          recordCount: 1000,
          processedCount: 950,
          status: 'completed' as const,
          processingStats: {
            duplicatesFound: 150,
            clustersCreated: 45,
            goldenRecordsCreated: 850,
            processingTimeMs: 45000,
          },
        },
        {
          id: 'batch-2',
          filename: 'suppliers.csv',
          uploadedBy: 'jane.smith@example.com',
          uploadedAt: new Date('2025-11-09T11:30:00Z'),
          recordCount: 500,
          processedCount: 200,
          status: 'processing' as const,
        },
      ]
    },
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Database className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Batches</h1>
          <p className="mt-2 text-gray-600">
            Manage and monitor CSV upload batches and their processing status
          </p>
        </div>
        <Link
          to="/upload"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload New Batch
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {batches?.map((batch) => (
              <li key={batch.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(batch.status)}
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {batch.filename}
                        </p>
                        <p className="text-sm text-gray-500">
                          Uploaded by {batch.uploadedBy} • {batch.uploadedAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(batch.status)}`}>
                        {batch.status}
                      </span>
                      <Link
                        to={`/clusters?batchId=${batch.id}`}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        View Clusters
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Records</dt>
                      <dd className="text-sm text-gray-900">
                        {batch.processedCount.toLocaleString()} / {batch.recordCount.toLocaleString()}
                      </dd>
                    </div>

                    {batch.processingStats && (
                      <>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Duplicates Found</dt>
                          <dd className="text-sm text-gray-900">
                            {batch.processingStats.duplicatesFound.toLocaleString()}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Clusters Created</dt>
                          <dd className="text-sm text-gray-900">
                            {batch.processingStats.clustersCreated.toLocaleString()}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Processing Time</dt>
                          <dd className="text-sm text-gray-900">
                            {(batch.processingStats.processingTimeMs / 1000).toFixed(1)}s
                          </dd>
                        </div>
                      </>
                    )}
                  </div>

                  {batch.status === 'processing' && (
                    <div className="mt-4">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(batch.processedCount / batch.recordCount) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {Math.round((batch.processedCount / batch.recordCount) * 100)}% complete
                      </p>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {batches?.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No batches</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by uploading your first CSV file.
          </p>
          <div className="mt-6">
            <Link
              to="/upload"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload CSV
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
