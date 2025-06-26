'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { LandingPage } from '@/components/landing/LandingPage'

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      // User is authenticated, redirect to dashboard home page
      router.replace('/home')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LandingPage />
  }

  // Show cool loading animation while redirecting to avoid flashing landing page
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <div className="w-12 h-12 border-4 border-transparent border-t-blue-400 rounded-full animate-spin absolute top-2 left-2 mx-auto opacity-60" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
        </div>
        <p className="mt-6 text-gray-600 font-light">Redirecting...</p>
      </div>
    </div>
  )
}