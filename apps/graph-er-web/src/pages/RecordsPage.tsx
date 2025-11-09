import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Mail, Phone, MapPin, Building } from 'lucide-react'

export default function RecordsPage() {
  const { id } = useParams<{ id: string }>()

  const { data: record, isLoading } = useQuery({
    queryKey: ['record', id],
    queryFn: async () => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500))
      return {
        id: id || 'golden-1',
        naturalKey: 'person:john.smith@example.com',
        name: 'John Smith',
        emails: ['john.smith@example.com', 'j.smith@work.com'],
        phones: ['+1-555-0123', '+1-555-0456'],
        addresses: ['123 Main St, Anytown, USA'],
        organizationName: 'Tech Corp',
        sources: ['batch-1', 'batch-2'],
        batchIds: ['batch-1', 'batch-2'],
        createdAt: new Date('2025-11-09T10:00:00Z'),
        updatedAt: new Date('2025-11-09T12:00:00Z'),
        confidence: 0.95,
      }
    },
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Record not found</h3>
        <p className="text-gray-500">The requested record could not be found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{record.name}</h1>
          <p className="text-gray-600">Golden Record • {record.naturalKey}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h2>

            <div className="space-y-4">
              {record.emails.length > 0 && (
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Email Addresses</h3>
                    <div className="mt-1 space-y-1">
                      {record.emails.map((email, index) => (
                        <p key={index} className="text-sm text-gray-600">{email}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {record.phones.length > 0 && (
                <div className="flex items-start space-x-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Phone Numbers</h3>
                    <div className="mt-1 space-y-1">
                      {record.phones.map((phone, index) => (
                        <p key={index} className="text-sm text-gray-600">{phone}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {record.addresses.length > 0 && (
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Addresses</h3>
                    <div className="mt-1 space-y-1">
                      {record.addresses.map((address, index) => (
                        <p key={index} className="text-sm text-gray-600">{address}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {record.organizationName && (
                <div className="flex items-start space-x-3">
                  <Building className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Organization</h3>
                    <p className="mt-1 text-sm text-gray-600">{record.organizationName}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Source Records */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Source Records</h2>
            <div className="space-y-2">
              {record.sources.map((sourceId, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-900">{sourceId}</span>
                  <button className="text-blue-600 hover:text-blue-900 text-sm">
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Metadata</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Record ID</dt>
                <dd className="text-sm text-gray-900 font-mono">{record.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Natural Key</dt>
                <dd className="text-sm text-gray-900 font-mono">{record.naturalKey}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Confidence Score</dt>
                <dd className="text-sm text-gray-900">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    record.confidence > 0.9 ? 'bg-green-100 text-green-800' :
                    record.confidence > 0.7 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {(record.confidence * 100).toFixed(1)}%
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="text-sm text-gray-900">
                  {record.createdAt.toLocaleDateString()} at {record.createdAt.toLocaleTimeString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="text-sm text-gray-900">
                  {record.updatedAt.toLocaleDateString()} at {record.updatedAt.toLocaleTimeString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Batches */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Batches</h2>
            <div className="space-y-2">
              {record.batchIds.map((batchId, index) => (
                <button
                  key={index}
                  className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  {batchId}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Actions</h2>
            <div className="space-y-2">
              <button className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                Edit Record
              </button>
              <button className="w-full px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                Delete Record
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
