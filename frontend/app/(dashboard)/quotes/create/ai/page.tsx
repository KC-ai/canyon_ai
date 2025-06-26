'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateQuoteAIPage() {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!description.trim()) return
    
    setIsGenerating(true)
    
    try {
      // Call AI quote generation API
      const response = await fetch('/api/llm/generate-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          description: description.trim()
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        // Store the generated quote data for the manual creation page
        localStorage.setItem('generatedQuote', JSON.stringify(result.quote))
        localStorage.setItem('aiSuggestions', JSON.stringify(result.suggestions))
        localStorage.setItem('aiConfidence', result.confidence_score.toString())
        
        // Redirect to manual creation page with the generated quote pre-filled
        router.push('/quotes/create/manual?from=ai')
      } else {
        console.error('Failed to generate quote')
        // Fallback to manual creation
        router.push('/quotes/create/manual')
      }
    } catch (error) {
      console.error('Error generating quote:', error)
      // Fallback to manual creation
      router.push('/quotes/create/manual')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Quote with AI</h1>
          <p className="text-gray-600">Describe what you need and let AI generate your quote</p>
        </div>
        <Link 
          href="/quotes/create"
          className="text-gray-600 hover:text-gray-900"
        >
          ← Back to Options
        </Link>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-center mb-4">Describe Your Quote Requirements</h2>
            <p className="text-gray-600 text-center">
              Tell us about your product, service, customer, and any specific requirements
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quote Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Example: I need a quote for enterprise software licensing for 100 users at Acme Corp. The software includes project management tools, user analytics, and priority support. The client is looking for annual billing with a 15% discount for the first year..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Include details about the product/service, customer, pricing, discounts, and timeline
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleGenerate}
                disabled={!description.trim() || isGenerating}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating Quote...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Quote
                  </>
                )}
              </button>
              
              <Link
                href="/quotes/create/manual"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center"
              >
                Create Manually Instead
              </Link>
            </div>
          </div>

          {/* Coming Soon Notice */}
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">AI Quote Generation Coming Soon</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  We're working on AI-powered quote generation. For now, clicking "Generate Quote" will redirect you to the manual creation process.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}