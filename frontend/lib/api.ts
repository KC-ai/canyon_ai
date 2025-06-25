import { supabase } from './supabase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface ApiError {
  message: string
  status: number
  code?: string
  details?: any
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private async getAuthHeaders() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return {
        'Content-Type': 'application/json',
        ...(session?.access_token && {
          'Authorization': `Bearer ${session.access_token}`
        })
      }
    } catch (error) {
      console.error('Auth header error:', error)
      return {
        'Content-Type': 'application/json'
      }
    }
  }

  private async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      let errorDetails = null

      try {
        const errorData = await response.json()
        errorMessage = errorData.detail || errorData.message || errorMessage
        errorDetails = errorData
      } catch {
        // Response body isn't JSON, use status text
      }

      const apiError: ApiError = {
        message: errorMessage,
        status: response.status,
        details: errorDetails
      }

      // Add specific error types
      if (response.status === 401) {
        apiError.code = 'UNAUTHORIZED'
      } else if (response.status === 403) {
        apiError.code = 'FORBIDDEN'
      } else if (response.status === 404) {
        apiError.code = 'NOT_FOUND'
      } else if (response.status === 422) {
        apiError.code = 'VALIDATION_ERROR'
      } else if (response.status >= 500) {
        apiError.code = 'SERVER_ERROR'
      } else if (response.status >= 400) {
        apiError.code = 'CLIENT_ERROR'
      }

      throw apiError
    }

    try {
      return await response.json()
    } catch {
      return null
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      const headers = await this.getAuthHeaders()
        
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: { ...headers, ...options.headers },
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      return await this.handleResponse(response)
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError: ApiError = {
          message: 'Request timeout - please check your connection',
          status: 0,
          code: 'TIMEOUT'
        }
        throw timeoutError
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError: ApiError = {
          message: 'Network error - please check your connection',
          status: 0,
          code: 'NETWORK_ERROR'
        }
        throw networkError
      }

      throw error
    }
  }

  async get(endpoint: string) {
    return this.makeRequest(endpoint, { method: 'GET' })
  }

  async post(endpoint: string, data: any) {
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async put(endpoint: string, data: any) {
    return this.makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async delete(endpoint: string) {
    return this.makeRequest(endpoint, { method: 'DELETE' })
  }
}

export const api = new ApiClient()