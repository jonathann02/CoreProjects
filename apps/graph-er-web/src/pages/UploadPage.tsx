import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react'
import { EntityInputSchema } from '@graph-er/shared'

interface FileValidation {
  isValid: boolean
  errors: string[]
  preview?: any[]
}

export default function UploadPage() {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validation, setValidation] = useState<FileValidation | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Mock upload process
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Simulate successful upload
      return {
        sessionId: `session-${Date.now()}`,
        batchId: `batch-${Date.now()}`,
      }
    },
    onSuccess: (data) => {
      navigate(`/batches`)
    },
  })

  const validateFile = useCallback(async (file: File): Promise<FileValidation> => {
    const errors: string[] = []

    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      errors.push('Only CSV files are allowed')
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      errors.push('File size must be less than 10MB')
    }

    if (errors.length > 0) {
      return { isValid: false, errors }
    }

    // Read and validate CSV content
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())

      if (lines.length < 2) {
        return { isValid: false, errors: ['CSV file must contain at least a header row and one data row'] }
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      const requiredHeaders = ['name', 'email'] // At minimum

      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
      if (missingHeaders.length > 0) {
        return { isValid: false, errors: [`Missing required columns: ${missingHeaders.join(', ')}`] }
      }

      // Preview first few rows
      const preview = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        return row
      })

      return { isValid: true, errors: [], preview }
    } catch (error) {
      return { isValid: false, errors: ['Failed to read CSV file'] }
    }
  }, [])

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file)
    const validationResult = await validateFile(file)
    setValidation(validationResult)
  }, [validateFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleUpload = useCallback(() => {
    if (selectedFile && validation?.isValid) {
      uploadMutation.mutate(selectedFile)
    }
  }, [selectedFile, validation, uploadMutation])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Upload CSV File</h1>
        <p className="mt-2 text-gray-600">
          Upload a CSV file containing entity data for deduplication and entity resolution
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <div
            className={`upload-area ${isDragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="space-y-4">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div>
                <p className="text-xl font-medium text-gray-900">
                  Drop your CSV file here, or{' '}
                  <label className="text-blue-600 hover:text-blue-500 cursor-pointer">
                    browse
                    <input
                      type="file"
                      className="hidden"
                      accept=".csv"
                      onChange={handleFileInput}
                    />
                  </label>
                </p>
                <p className="text-gray-500">Supports CSV files up to 10MB</p>
              </div>
            </div>
          </div>

          {/* File Preview */}
          {selectedFile && validation && (
            <div className="mt-6 border-t pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                {validation.isValid ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
              </div>

              {/* Validation Errors */}
              {validation.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-red-800">Validation Errors:</h4>
                  <ul className="mt-2 list-disc list-inside text-sm text-red-700">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Preview */}
              {validation.isValid && validation.preview && validation.preview.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Data Preview:</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(validation.preview[0]).map((header) => (
                            <th
                              key={header}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {validation.preview.map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).map((value, cellIndex) => (
                              <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {String(value).slice(0, 50)}{String(value).length > 50 ? '...' : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedFile(null)}
                  className="mr-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!validation?.isValid || uploadMutation.isPending}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <div className="loading-spinner mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload & Process
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">CSV Format Requirements</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>Your CSV file should include at least these columns:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><strong>name</strong> - Full name of the person or organization</li>
            <li><strong>email</strong> - Email address (optional but recommended)</li>
            <li><strong>phone</strong> - Phone number (optional)</li>
            <li><strong>address</strong> - Physical address (optional)</li>
            <li><strong>organizationName</strong> - Company/organization name (optional)</li>
          </ul>
          <p className="mt-2">
            Additional columns will be preserved as metadata. The system will automatically
            normalize and deduplicate records based on the available data.
          </p>
        </div>
      </div>
    </div>
  )
}
