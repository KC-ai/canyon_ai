import { toast } from 'sonner'
import { ApiError } from './api'

export const showToast = {
  success: (message: string) => {
    toast.success(message)
  },

  error: (error: string | ApiError | Error) => {
    let message = 'An error occurred'
    
    if (typeof error === 'string') {
      message = error
    } else if ('code' in error && error.code) {
      // ApiError with specific codes
      switch (error.code) {
        case 'UNAUTHORIZED':
          message = 'Please sign in to continue'
          break
        case 'FORBIDDEN':
          message = 'You don\'t have permission to perform this action'
          break
        case 'NOT_FOUND':
          message = 'The requested resource was not found'
          break
        case 'VALIDATION_ERROR':
          message = error.message || 'Please check your input and try again'
          break
        case 'TIMEOUT':
          message = 'Request timed out. Please try again.'
          break
        case 'NETWORK_ERROR':
          message = 'Network error. Please check your connection.'
          break
        case 'SERVER_ERROR':
          message = 'Server error. Please try again later.'
          break
        default:
          message = error.message || 'An error occurred'
      }
    } else if ('message' in error) {
      message = error.message
    }

    toast.error(message)
  },

  info: (message: string) => {
    toast.info(message)
  },

  warning: (message: string) => {
    toast.warning(message)
  },

  loading: (message: string) => {
    return toast.loading(message)
  },

  promise: <T>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ) => {
    return toast.promise(promise, {
      loading,
      success,
      error,
    })
  }
}