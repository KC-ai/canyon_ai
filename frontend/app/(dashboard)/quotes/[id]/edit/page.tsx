'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Quote, QuoteItemCreate, QuoteStatus } from '@/types/quotes'
import { quotesApi } from '@/lib/quotes'
import { showToast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { workflowsApi } from '@/lib/api'
import WorkflowBuilder from '@/components/workflows/WorkflowBuilder'
import { ApprovalWorkflow, ApprovalWorkflowCreate } from '@/types/workflows'

export default function EditQuotePage() {
  const params = useParams()
  const router = useRouter()
  const quoteId = params.id as string

  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>('')

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    title: '',
    description: '',
    status: QuoteStatus.DRAFT
  })

  const [items, setItems] = useState<QuoteItemCreate[]>([
    { name: '', description: '', quantity: 1, unit_price: 0, discount_percent: 0, discount_amount: 0 }
  ])

  const [workflow, setWorkflow] = useState<ApprovalWorkflow | null>(null)
  const [workflowLoading, setWorkflowLoading] = useState(true)
  const [workflowError, setWorkflowError] = useState<string>('')
  const [workflowSaving, setWorkflowSaving] = useState(false)

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        setLoading(true)
        const fetchedQuote = await quotesApi.getQuote(quoteId)
        setQuote(fetchedQuote)
        
        // Populate form with existing data
        setFormData({
          customer_name: fetchedQuote.customer_name,
          customer_email: fetchedQuote.customer_email || '',
          title: fetchedQuote.title,
          description: fetchedQuote.description || '',
          status: fetchedQuote.status
        })
        
        // Populate items or default
        if (fetchedQuote.items && fetchedQuote.items.length > 0) {
          setItems(fetchedQuote.items.map(item => ({
            name: item.name,
            description: item.description || '',
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent || 0,
            discount_amount: item.discount_amount || 0
          })))
        }
        
        setError('')
      } catch (err) {
        setError('Failed to load quote')
        console.error('Error fetching quote:', err)
      } finally {
        setLoading(false)
      }
    }

    if (quoteId) {
      fetchQuote()
    }
  }, [quoteId])

  // Separate effect for loading workflow after quote is loaded
  useEffect(() => {
    const fetchWorkflow = async () => {
      if (!quote || !quote.workflow_id) {
        setWorkflow(null)
        setWorkflowLoading(false)
        return
      }
      try {
        setWorkflowLoading(true)
        const wf = await workflowsApi.getWorkflow(quote.workflow_id)
        setWorkflow(wf)
        setWorkflowError('')
      } catch (err) {
        setWorkflowError('Failed to load workflow')
        setWorkflow(null)
        console.error('Error fetching workflow:', err)
      } finally {
        setWorkflowLoading(false)
      }
    }

    if (quote) {
      fetchWorkflow()
    }
  }, [quote])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setItems(updatedItems)
  }

  const addItem = () => {
    setItems(prev => [...prev, { name: '', description: '', quantity: 1, unit_price: 0, discount_percent: 0, discount_amount: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index))
    }
  }

  const calculateItemDiscount = (item: QuoteItemCreate): number => {
    const subtotal = item.quantity * item.unit_price
    let discount = 0
    
    if (item.discount_amount && item.discount_amount > 0) {
      discount = item.discount_amount
    } else if (item.discount_percent && item.discount_percent > 0) {
      discount = subtotal * (item.discount_percent / 100)
    }
    
    return Math.min(discount, subtotal)
  }

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const subtotal = item.quantity * item.unit_price
      const discount = calculateItemDiscount(item)
      return total + (subtotal - discount)
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('=== FORM SUBMIT TRIGGERED ===')
    e.preventDefault()
    if (!quote) {
      console.log('No quote found, aborting')
      return
    }

    console.log('Quote ID:', quote.id)
    console.log('Form data:', formData)
    console.log('Items data:', items)
    setSaving(true)
    
    try {
      const updateData = {
        ...formData,
        items: items.filter(item => item.name.trim() !== '')
      }

      console.log('Updating quote with data:', updateData)
      const result = await quotesApi.updateQuote(quote.id, updateData)
      console.log('Quote update result:', result)
      showToast.success('Quote updated successfully!')
      // Don't redirect, let user see the success and stay on edit page
      // router.push(`/quotes/${quote.id}`)
    } catch (err) {
      console.error('QUOTE UPDATE ERROR:', err)
      console.error('Error details:', JSON.stringify(err, null, 2))
      showToast.error(`Failed to update quote: ${err}`)
      setError(`Failed to update quote: ${err}`)
    } finally {
      setSaving(false)
    }
  }

  // Handler for saving workflow changes
  const handleWorkflowSave = async (workflowData: ApprovalWorkflowCreate) => {
    console.log('=== HANDLE WORKFLOW SAVE CALLED ===')
    console.log('Workflow data received:', workflowData)
    console.log('Current workflow:', workflow)
    
    if (!workflow) {
      console.log('No workflow found, returning')
      return
    }
    
    setWorkflowSaving(true)
    try {
      console.log('Calling workflowsApi.updateWorkflow with:', workflow.id, workflowData)
      const updated = await workflowsApi.updateWorkflow(workflow.id, workflowData)
      console.log('Update result:', updated)
      setWorkflow(updated)
      showToast.success('Workflow updated successfully!')
    } catch (err) {
      console.error('=== WORKFLOW SAVE ERROR ===', err)
      showToast.error('Failed to update workflow')
    } finally {
      setWorkflowSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading quote...</p>
        </div>
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">{error || 'Quote not found'}</p>
        <Link href="/quotes" className="mt-2 text-red-600 hover:text-red-800 underline">
          ← Back to Quotes
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Quote</h1>
          <p className="text-gray-600">Update quote details</p>
        </div>
        <Link 
          href={`/quotes/${quoteId}`}
          className="text-gray-600 hover:text-gray-900"
        >
          ← Back to Quote
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Quote Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Quote Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Quote Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="customer_name">Customer Name *</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => handleInputChange('customer_name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="customer_email">Customer Email</Label>
              <Input
                id="customer_email"
                type="email"
                value={formData.customer_email}
                onChange={(e) => handleInputChange('customer_email', e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Quote Items */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Quote Items</h3>
            <Button type="button" onClick={addItem} variant="outline">
              Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Item Name *</Label>
                    <Input
                      value={item.name}
                      onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Unit Price ($) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    {items.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeItem(index)}
                        variant="outline"
                        className="mb-1"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <Label className="text-orange-600 font-medium">Discount (%) *</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={item.discount_percent || 0}
                      onChange={(e) => handleItemChange(index, 'discount_percent', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="border-orange-300 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <Label>Discount Amount ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.discount_amount || 0}
                      onChange={(e) => handleItemChange(index, 'discount_amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div className="mt-2 text-right space-y-1">
                  <div className="text-sm text-gray-600">
                    Subtotal: ${(item.quantity * item.unit_price).toFixed(2)}
                  </div>
                  {(item.discount_percent || item.discount_amount) ? (
                    <>
                      <div className="text-sm text-red-600">
                        Discount: -${calculateItemDiscount(item).toFixed(2)}
                      </div>
                      <div className="text-sm font-medium">
                        Line Total: ${(item.quantity * item.unit_price - calculateItemDiscount(item)).toFixed(2)}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm font-medium">
                      Line Total: ${(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <Label>Description</Label>
                  <Input
                    value={item.description || ''}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    placeholder="Optional item description"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="text-right">
              <p className="text-xl font-bold">
                Total: ${calculateTotal().toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Approval Workflow Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Approval Workflow</h3>
          {workflowLoading ? (
            <div className="text-gray-600">Loading workflow...</div>
          ) : workflow ? (
            <WorkflowBuilder
              initialWorkflow={workflow}
              onSave={handleWorkflowSave}
              onCancel={() => {}}
              loading={workflowSaving}
              showSubmit={false}
            />
          ) : (
            <div className="text-gray-500">No workflow found for this quote.</div>
          )}
          {workflowError && <div className="text-red-600 mt-2">{workflowError}</div>}
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <Button type="submit" disabled={saving} className="relative">
            {saving && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
            )}
            <span className={saving ? 'opacity-0' : ''}>
              {saving ? 'Updating...' : 'Update Quote'}
            </span>
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}