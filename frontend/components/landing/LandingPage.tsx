'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Canyon CPQ</h1>
            </div>
            <Link href="/login">
              <Button className="bg-blue-600 hover:bg-blue-700">Sign In</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Streamline Your
            <span className="text-blue-600 block">Quote-to-Cash Process</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Canyon CPQ simplifies quote creation, pricing, and approval workflows. 
            Configure products, generate quotes, and manage approvals with intelligent automation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
                Get Started with Google
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="text-5xl mb-6">"</div>
            <h3 className="text-xl font-semibold mb-4">Smart Quote Creation</h3>
            <p className="text-gray-600">
              Create professional quotes with automated pricing, discounts, and product configurations
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="text-5xl mb-6">≡</div>
            <h3 className="text-xl font-semibold mb-4">Approval Workflows</h3>
            <p className="text-gray-600">
              Customizable approval chains with drag-and-drop workflow builder for Deal Desk, CRO, Legal, and Finance
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="text-5xl mb-6">≡</div>
            <h3 className="text-xl font-semibold mb-4">Business Insights</h3>
            <p className="text-gray-600">
              Track approval times, quote performance, and sales pipeline metrics with comprehensive analytics
            </p>
          </div>
        </div>

        {/* Workflow Section */}
        <div className="mt-20 bg-white rounded-xl shadow-md p-8 md:p-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How Canyon CPQ Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">1</div>
              <h4 className="font-semibold mb-2">AE Creates Quote</h4>
              <p className="text-sm text-gray-600">Sales team configures products and pricing</p>
            </div>
            <div className="hidden md:block text-center text-gray-400">→</div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">2</div>
              <h4 className="font-semibold mb-2">Approval Workflow</h4>
              <p className="text-sm text-gray-600">Automatic routing to Deal Desk, CRO, Legal, Finance</p>
            </div>
            <div className="hidden md:block text-center text-gray-400">→</div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">3</div>
              <h4 className="font-semibold mb-2">Customer Delivery</h4>
              <p className="text-sm text-gray-600">Final approved quote sent to customer</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center bg-blue-600 rounded-xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join teams who trust Canyon CPQ to streamline their sales process
          </p>
          <Link href="/login">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              Sign In with Google
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}