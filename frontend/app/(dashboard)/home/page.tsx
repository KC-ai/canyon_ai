'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const { user } = useAuth()
  
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
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome {getUserName()}! 👋
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          What would you like to do today?
        </p>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
          <Link href="/quotes" className="flex-1">
            <Button 
              size="lg" 
              variant="outline"
              className="w-full h-16 text-lg flex flex-col items-center justify-center gap-2 hover:bg-gray-50"
            >
              <span className="text-2xl">📋</span>
              View My Quotes
            </Button>
          </Link>
          
          <Link href="/quotes/create" className="flex-1">
            <Button 
              size="lg" 
              className="w-full h-16 text-lg flex flex-col items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <span className="text-2xl">➕</span>
              Create a New Quote
            </Button>
          </Link>
          
          <Link href="/insights" className="flex-1">
            <Button 
              size="lg" 
              variant="outline"
              className="w-full h-16 text-lg flex flex-col items-center justify-center gap-2 hover:bg-gray-50"
            >
              <span className="text-2xl">📈</span>
              View Insights
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Quotes</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-900">5</p>
            </div>
            <div className="text-3xl">⏳</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">$124K</p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Quote #QT-001 approved by Deal Desk</span>
            </div>
            <span className="text-sm text-gray-500">2 hours ago</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>Quote #QT-002 pending CRO approval</span>
            </div>
            <span className="text-sm text-gray-500">4 hours ago</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>New quote #QT-003 created</span>
            </div>
            <span className="text-sm text-gray-500">1 day ago</span>
          </div>
        </div>
      </div>
    </div>
  )
}