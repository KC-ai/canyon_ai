'use client'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useState } from 'react'

export default function TestApiPage() {
  const { user } = useAuth()
  const [healthStatus, setHealthStatus] = useState<string>('')
  const [authStatus, setAuthStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testHealthEndpoint = async () => {
    setLoading(true)
    try {
      const response = await api.get('/health')
      setHealthStatus(JSON.stringify(response, null, 2))
    } catch (error) {
      setHealthStatus(`Error: ${error}`)
    }
    setLoading(false)
  }

  const testAuthEndpoint = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/test/protected')
      setAuthStatus(JSON.stringify(response, null, 2))
    } catch (error) {
      setAuthStatus(`Error: ${error}`)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">API Test Page</h1>
        <p className="text-gray-600">Test backend connectivity and authentication</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Authentication Status</h3>
        <div className="space-y-2">
          <p><strong>User:</strong> {user?.email || 'Not authenticated'}</p>
          <p><strong>User ID:</strong> {user?.id || 'N/A'}</p>
          <p><strong>Status:</strong> <span className="text-green-600">Authenticated</span></p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">API Tests</h3>
        <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={testHealthEndpoint}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Health Endpoint'}
          </button>
          
          <button
            onClick={testAuthEndpoint}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Auth Endpoint'}
          </button>
        </div>
        
        {healthStatus && (
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-semibold mb-2">Health Response:</h3>
            <pre className="text-sm">{healthStatus}</pre>
          </div>
        )}
        
        {authStatus && (
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-semibold mb-2">Auth Response:</h3>
            <pre className="text-sm">{authStatus}</pre>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}