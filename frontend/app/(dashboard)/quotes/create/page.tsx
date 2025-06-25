'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CreateQuotePage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Quote</h1>
          <p className="text-gray-600">Choose how you'd like to create your quote</p>
        </div>
        <Link 
          href="/quotes"
          className="text-gray-600 hover:text-gray-900"
        >
          ← Back to Quotes
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          
          {/* AI-Powered Creation */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-8 border border-blue-200 hover:shadow-lg transition-all duration-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Create with AI</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Let AI help you generate quotes quickly by describing your requirements. Perfect for standard products and services.
              </p>
              <button
                onClick={() => router.push('/quotes/create/ai')}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Start with AI
              </button>
            </div>
          </div>

          {/* Manual Creation */}
          <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-xl p-8 border border-gray-200 hover:shadow-lg transition-all duration-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Create Manually</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Build your quote step-by-step with full control over every detail. Ideal for complex or custom requirements.
              </p>
              <button
                onClick={() => router.push('/quotes/create/manual')}
                className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Create Manually
              </button>
            </div>
          </div>

        </div>

        {/* Quick stats or benefits */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            Both options include approval workflow setup and real-time collaboration
          </p>
        </div>
      </div>
    </div>
  )
}