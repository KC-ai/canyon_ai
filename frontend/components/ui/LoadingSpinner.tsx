import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '',
  text 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-blue-200 border-t-blue-600 ${sizeClasses[size]}`} />
      {text && <span className="ml-2 text-sm text-gray-600">{text}</span>}
    </div>
  )
}

export const LoadingOverlay: React.FC<{ children: React.ReactNode; loading: boolean; text?: string }> = ({
  children,
  loading,
  text = 'Loading...'
}) => {
  return (
    <div className="relative">
      {children}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <LoadingSpinner size="lg" text={text} />
        </div>
      )}
    </div>
  )
}

export const InlineLoader: React.FC<{ loading: boolean; text?: string }> = ({ loading, text }) => {
  if (!loading) return null
  
  return (
    <div className="flex items-center justify-center py-2">
      <LoadingSpinner size="sm" text={text} />
    </div>
  )
}