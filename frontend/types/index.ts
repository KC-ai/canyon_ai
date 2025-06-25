// Core type definitions
export interface User {
  id: string
  email: string
  name?: string
  created_at: string
  updated_at: string
}

export interface ApiResponse<T = any> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  has_next: boolean
  has_prev: boolean
}

// Type definitions barrel exports
export * from './quotes'
export * from './workflows'
export * from './auth'
export * from './analytics'
