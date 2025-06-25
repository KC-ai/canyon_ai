import { api } from './api'
import { Quote, QuoteCreate, QuoteUpdate, QuoteListResponse } from '@/types/quotes'

export const quotesApi = {
  async getQuotes(skip = 0, limit = 100): Promise<QuoteListResponse> {
    return await api.get(`/api/quotes/?skip=${skip}&limit=${limit}`)
  },

  async getQuote(id: string): Promise<Quote> {
    return await api.get(`/api/quotes/${id}`)
  },

  async createQuote(quote: QuoteCreate): Promise<Quote> {
    return await api.post('/api/quotes/', quote)
  },

  async updateQuote(id: string, quote: QuoteUpdate): Promise<Quote> {
    return await api.put(`/api/quotes/${id}`, quote)
  },

  async deleteQuote(id: string): Promise<void> {
    return await api.delete(`/api/quotes/${id}`)
  }
}