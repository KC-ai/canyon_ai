'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Quote } from '@/types/quotes'
import { quotesApi } from '@/lib/quotes'
import { showToast } from '@/lib/toast'

export function useRealtimeQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // Load initial quotes
  const loadQuotes = useCallback(async () => {
    try {
      setLoading(true)
      console.log('Loading quotes...')
      const response = await quotesApi.getQuotes()
      console.log('Quotes loaded successfully:', response.quotes.length, 'quotes')
      setQuotes(response.quotes)
      setError('')
    } catch (err) {
      console.error('Detailed error loading quotes:', {
        error: err,
        message: (err as any)?.message,
        status: (err as any)?.status,
        details: (err as any)?.details
      })
      setError(`Failed to load quotes: ${(err as any)?.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }, [])

  // Optimistic update helper
  const optimisticUpdate = useCallback((updater: (quotes: Quote[]) => Quote[]) => {
    setQuotes(prev => updater(prev))
  }, [])

  // Create quote with optimistic update
  const createQuote = useCallback(async (quoteData: any) => {
    const tempId = `temp-${Date.now()}`
    const optimisticQuote: Quote = {
      id: tempId,
      user_id: 'current-user',
      ...quoteData,
      items: quoteData.items || [],
      total_amount: quoteData.items?.reduce((sum: number, item: any) => 
        sum + (item.quantity * item.unit_price), 0) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Optimistic update
    optimisticUpdate(prev => [optimisticQuote, ...prev])

    try {
      const newQuote = await quotesApi.createQuote(quoteData)
      // Replace optimistic quote with real one
      optimisticUpdate(prev => 
        prev.map(q => q.id === tempId ? newQuote : q)
      )
      
      // Simple broadcast without awaiting
      supabase.channel('shared_quotes_channel').send({
        type: 'broadcast',
        event: 'quote_created',
        payload: newQuote
      })
      
      return newQuote
    } catch (error) {
      // Revert optimistic update on error
      optimisticUpdate(prev => prev.filter(q => q.id !== tempId))
      showToast.error(error as Error)
      throw error
    }
  }, [optimisticUpdate])

  // Update quote with optimistic update
  const updateQuote = useCallback(async (quoteId: string, updateData: any) => {
    // Store original for rollback
    let originalQuote: Quote | undefined

    // Optimistic update
    optimisticUpdate(prev => 
      prev.map(quote => {
        if (quote.id === quoteId) {
          originalQuote = quote
          return { 
            ...quote, 
            ...updateData, 
            updated_at: new Date().toISOString() 
          }
        }
        return quote
      })
    )

    try {
      const updatedQuote = await quotesApi.updateQuote(quoteId, updateData)
      // Replace optimistic update with real data
      optimisticUpdate(prev => 
        prev.map(q => q.id === quoteId ? updatedQuote : q)
      )
      
      // Simple broadcast without awaiting
      supabase.channel('shared_quotes_channel').send({
        type: 'broadcast',
        event: 'quote_updated',
        payload: updatedQuote
      })
      
      return updatedQuote
    } catch (error) {
      // Revert on error
      if (originalQuote) {
        optimisticUpdate(prev => 
          prev.map(q => q.id === quoteId ? originalQuote! : q)
        )
      }
      showToast.error(error as Error)
      throw error
    }
  }, [optimisticUpdate])

  // Delete quote with optimistic update
  const deleteQuote = useCallback(async (quoteId: string) => {
    // Store original for rollback
    let originalQuotes: Quote[]

    // Optimistic update
    optimisticUpdate(prev => {
      originalQuotes = prev
      return prev.filter(q => q.id !== quoteId)
    })

    try {
      await quotesApi.deleteQuote(quoteId)
      
      // Simple broadcast without awaiting
      supabase.channel('shared_quotes_channel').send({
        type: 'broadcast',
        event: 'quote_deleted',
        payload: { id: quoteId }
      })
    } catch (error) {
      // Revert on error
      setQuotes(originalQuotes!)
      showToast.error(error as Error)
      throw error
    }
  }, [optimisticUpdate])

  useEffect(() => {
    loadQuotes()
  }, [loadQuotes])

  // Set up real-time subscription (temporarily disabled due to timeout issues)
  useEffect(() => {
    // TODO: Re-enable when Supabase is properly configured
    console.log('Real-time subscription disabled - using backend API only')
    
    // Uncomment below when ready to use Supabase real-time:
    /*
    const channel = supabase.channel('shared_quotes_channel')
    channel
      .on('broadcast', { event: 'quote_updated' }, (payload) => {
        console.log('Real-time quote update:', payload)
        const updatedQuote = payload.payload as Quote
        optimisticUpdate(prev => 
          prev.map(q => q.id === updatedQuote.id ? updatedQuote : q)
        )
      })
      .on('broadcast', { event: 'quote_created' }, (payload) => {
        console.log('Real-time quote created:', payload)
        const newQuote = payload.payload as Quote
        optimisticUpdate(prev => {
          if (prev.some(q => q.id === newQuote.id)) {
            return prev
          }
          return [newQuote, ...prev]
        })
      })
      .on('broadcast', { event: 'quote_deleted' }, (payload) => {
        console.log('Real-time quote deleted:', payload)
        const quoteId = payload.payload.id
        optimisticUpdate(prev => prev.filter(q => q.id !== quoteId))
      })
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })

    return () => {
      console.log('Cleaning up subscription: shared_quotes_channel')
      channel.unsubscribe()
      supabase.removeChannel(channel)
    }
    */
  }, [])

  return {
    quotes,
    loading,
    error,
    loadQuotes,
    createQuote,
    updateQuote,
    deleteQuote,
    optimisticUpdate
  }
}