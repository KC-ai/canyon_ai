'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Quote, QuoteStatus } from '@/types/quotes'
import { Button } from '@/components/ui/button'

export function RealtimeTest() {
  const [status, setStatus] = useState<string>('')

  const simulateQuoteUpdate = async () => {
    setStatus('Broadcasting quote update...')
    
    const mockQuote: Quote = {
      id: '47a2d9ae-bb64-4e51-ac12-1cb8253731c3', // Use existing quote ID
      user_id: 'user-123',
      customer_name: 'Acme Corp (Updated)',
      customer_email: 'contact@acme.com',
      title: 'Enterprise Software License (Updated)',
      description: 'Updated annual software license',
      status: QuoteStatus.APPROVED,
      valid_until: undefined,
      items: [],
      total_amount: 15000.00,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
    }

    await supabase.channel('shared_quotes_channel').send({
      type: 'broadcast',
      event: 'quote_updated',
      payload: mockQuote
    })

    setStatus('Update broadcasted!')
    setTimeout(() => setStatus(''), 3000)
  }

  const simulateQuoteCreation = async () => {
    setStatus('Broadcasting new quote...')
    
    const mockQuote: Quote = {
      id: `realtime-${Date.now()}`,
      user_id: 'user-123',
      customer_name: 'Real-time Customer',
      customer_email: 'realtime@example.com',
      title: 'Real-time Test Quote',
      description: 'A quote created via real-time broadcast',
      status: QuoteStatus.DRAFT,
      valid_until: undefined,
      items: [],
      total_amount: 5000.00,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await supabase.channel('shared_quotes_channel').send({
      type: 'broadcast',
      event: 'quote_created',
      payload: mockQuote
    })

    setStatus('New quote broadcasted!')
    setTimeout(() => setStatus(''), 3000)
  }

  const simulateQuoteDeletion = async () => {
    setStatus('Broadcasting quote deletion...')
    
    await supabase.channel('shared_quotes_channel').send({
      type: 'broadcast',
      event: 'quote_deleted',
      payload: { id: '3b0368ab-7c3a-4865-951b-1a2113569cbb' } // Use existing quote ID
    })

    setStatus('Deletion broadcasted!')
    setTimeout(() => setStatus(''), 3000)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Real-time Testing</h3>
      <p className="text-gray-600 mb-4">
        Test real-time updates by simulating quote changes. Watch the quotes list update automatically!
      </p>
      
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={simulateQuoteUpdate} variant="outline">
            Update Existing Quote
          </Button>
          <Button onClick={simulateQuoteCreation} variant="outline">
            Create New Quote
          </Button>
          <Button onClick={simulateQuoteDeletion} variant="outline">
            Delete Quote
          </Button>
        </div>
        
        {status && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-blue-800">{status}</p>
          </div>
        )}
      </div>
    </div>
  )
}