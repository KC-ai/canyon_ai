'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth'

export default function HomePage() {
  const { user, signOut } = useAuth()
  
  const getUserName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
    }
    if (user?.email) {
      return user.email.split('@')[0]
    }
    return 'User'
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-12">
      <div className="text-center">
        <h1 className="text-4xl font-light text-gray-900 mb-2">
          Welcome {getUserName()}
        </h1>
        <p className="text-gray-600">
          What would you like to do?
        </p>
      </div>
      
      <div className="flex flex-col space-y-6 w-full max-w-xs">
        <Link href="/quotes">
          <button className="w-full py-4 text-lg font-light border border-gray-300 hover:border-gray-400 transition-colors">
            View
          </button>
        </Link>
        
        <Link href="/quotes/create">
          <button className="w-full py-4 text-lg font-light border border-gray-300 hover:border-gray-400 transition-colors">
            Create
          </button>
        </Link>
        
        <Link href="/insights">
          <button className="w-full py-4 text-lg font-light border border-gray-300 hover:border-gray-400 transition-colors">
            Learn
          </button>
        </Link>
        
        <button 
          onClick={signOut}
          className="w-full py-2 text-sm font-light text-gray-500 border border-gray-200 hover:border-gray-300 transition-colors mt-8"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}