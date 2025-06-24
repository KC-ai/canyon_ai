export enum QuoteStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export interface QuoteItem {
  id: string
  quote_id: string
  name: string
  description?: string
  quantity: number
  unit_price: number
  created_at: string
  updated_at: string
}

export interface QuoteItemCreate {
  name: string
  description?: string
  quantity: number
  unit_price: number
}

export interface Quote {
  id: string
  user_id: string
  customer_name: string
  customer_email?: string
  title: string
  description?: string
  status: QuoteStatus
  valid_until?: string
  items: QuoteItem[]
  total_amount: number
  created_at: string
  updated_at: string
}

export interface QuoteCreate {
  customer_name: string
  customer_email?: string
  title: string
  description?: string
  status?: QuoteStatus
  valid_until?: string
  items: QuoteItemCreate[]
}

export interface QuoteUpdate {
  customer_name?: string
  customer_email?: string
  title?: string
  description?: string
  status?: QuoteStatus
  valid_until?: string
}

export interface QuoteListResponse {
  quotes: Quote[]
  total: number
  page: number
  limit: number
}