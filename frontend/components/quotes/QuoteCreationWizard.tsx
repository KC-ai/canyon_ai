'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QuoteItemCreate, QuoteStatus } from '@/types/quotes'
import { ApprovalWorkflowCreate, WorkflowStepFormData, PersonaType } from '@/types/workflows'
import { useRealtimeQuotes } from '@/hooks/useRealtimeQuotes'
import { showToast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import WorkflowBuilder from '@/components/workflows/WorkflowBuilder'

interface WizardStep {
  id: string
  title: string
  description: string
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'details',
    title: 'Quote Details',
    description: 'Enter customer information and quote details'
  },
  {
    id: 'items',
    title: 'Quote Items',
    description: 'Add products or services to your quote'
  },
  {
    id: 'workflow',
    title: 'Approval Workflow',
    description: 'Configure the approval process for this quote'
  },
  {
    id: 'review',
    title: 'Review & Submit',
    description: 'Review your quote and workflow before submitting'
  }
]

export function QuoteCreationWizard() {
  const router = useRouter()
  const { createQuote } = useRealtimeQuotes()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)

  // Quote form data
  const [quoteData, setQuoteData] = useState({
    customer_name: '',
    customer_email: '',
    title: '',
    description: '',
    status: QuoteStatus.PENDING, // Set to pending so workflow applies
    discount_percent: 0,
    discount_amount: 0
  })

  const [items, setItems] = useState<QuoteItemCreate[]>([
    { name: '', description: '', quantity: 1, unit_price: 1, discount_percent: 0, discount_amount: 0 }
  ])

  // Workflow data
  const [workflowData, setWorkflowData] = useState<ApprovalWorkflowCreate>({
    name: '',
    description: '',
    auto_start: true,
    allow_parallel_steps: false,
    require_all_approvals: true,
    steps: [
      {
        id: `step-1-${Date.now()}`,
        name: 'Sales Review',
        description: 'Initial sales team review',
        persona: PersonaType.AE,
        order: 1,
        is_required: true,
        auto_approve_threshold: '',
        escalation_threshold: '',
        max_processing_days: 2
      },
      {
        id: `step-2-${Date.now()}`,
        name: 'Deal Desk Review', 
        description: 'Deal desk analysis and pricing review',
        persona: PersonaType.DEAL_DESK,
        order: 2,
        is_required: true,
        auto_approve_threshold: '',
        escalation_threshold: '',
        max_processing_days: 3
      }
    ]
  })

  // Navigation
  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length - 1))
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0))

  // Quote form handlers
  const handleQuoteChange = (field: string, value: string) => {
    let processedValue = value
    
    // Auto-correct leading zeros in number fields  
    if (field === 'unit_price' || field === 'quantity') {
      processedValue = value.replace(/^0+(\d)/, '$1')
    }
    
    setQuoteData(prev => ({ ...prev, [field]: processedValue }))
  }

  const handleItemChange = (index: number, field: string, value: string | number) => {
    let processedValue = value
    
    // Auto-correct leading zeros in number fields
    if (typeof value === 'string' && (field === 'unit_price' || field === 'quantity')) {
      processedValue = value.replace(/^0+(\d)/, '$1')
      const numValue = parseFloat(processedValue as string)
      if (!isNaN(numValue)) {
        processedValue = numValue
      }
    }
    
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], [field]: processedValue }
    setItems(updatedItems)
  }

  const addItem = () => {
    setItems(prev => [...prev, { name: '', description: '', quantity: 1, unit_price: 1, discount_percent: 0, discount_amount: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index))
    }
  }

  // Discount calculation functions
  const calculateItemDiscount = (item: QuoteItemCreate): number => {
    const subtotal = item.quantity * item.unit_price
    let discount = 0
    
    if (item.discount_amount && item.discount_amount > 0) {
      discount = item.discount_amount
    } else if (item.discount_percent && item.discount_percent > 0) {
      discount = subtotal * (item.discount_percent / 100)
    }
    
    // Don't allow discount to exceed subtotal
    return Math.min(discount, subtotal)
  }

  const calculateTotal = (): number => {
    return items.reduce((total, item) => {
      const itemSubtotal = item.quantity * item.unit_price
      const itemDiscount = calculateItemDiscount(item)
      return total + (itemSubtotal - itemDiscount)
    }, 0)
  }

  // Workflow handlers
  const handleWorkflowUpdate = async (workflow: ApprovalWorkflowCreate) => {
    setWorkflowData(workflow)
  }

  // Validation
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0: // Details
        const hasRequiredFields = !!(quoteData.customer_name && quoteData.title)
        // Email validation if provided
        if (quoteData.customer_email.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          return hasRequiredFields && emailRegex.test(quoteData.customer_email.trim())
        }
        return hasRequiredFields
      case 1: // Items
        return items.length > 0 && items.every(item => item.name && item.unit_price > 0)
      case 2: // Workflow
        return workflowData.steps.length > 0
      case 3: // Review
        return true
      default:
        return false
    }
  }


  // Submit quote with workflow
  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Set workflow name based on quote
      const finalWorkflowData = {
        ...workflowData,
        name: workflowData.name || `${quoteData.title} - Approval Workflow`
      }

      // Create quote with custom workflow using new API
      const { api } = await import('../../lib/api')
      const quote = await api.post('/api/quotes/with-workflow', {
        ...quoteData,
        items,
        workflow: finalWorkflowData
      })

      showToast.success('Quote and custom workflow created successfully!')
      router.push('/quotes')
    } catch (error) {
      console.error('Failed to create quote:', error)
      console.error('Error type:', typeof error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      let errorMessage = 'Failed to create quote with workflow'
      
      if (error && typeof error === 'object') {
        if ('message' in error) {
          errorMessage = error.message as string
        } else if ('detail' in error) {
          errorMessage = error.detail as string
        } else if ('status' in error && error.status === 401) {
          errorMessage = 'Authentication required. Please log in again.'
        } else if ('status' in error && error.status === 403) {
          errorMessage = 'Permission denied. You may not have access to create quotes.'
        } else if ('status' in error) {
          errorMessage = `Server error (${error.status}). Please try again.`
        }
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      showToast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Quote Details
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input
                  id="customer_name"
                  value={quoteData.customer_name}
                  onChange={(e) => handleQuoteChange('customer_name', e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <Label htmlFor="customer_email">Customer Email</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={quoteData.customer_email}
                  onChange={(e) => handleQuoteChange('customer_email', e.target.value)}
                  placeholder="Enter customer email"
                  onBlur={(e) => {
                    const email = e.target.value.trim()
                    if (email) {
                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                      if (!emailRegex.test(email)) {
                        // You could add error state here if needed
                        console.warn('Invalid email format')
                      }
                    }
                  }}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="title">Quote Title *</Label>
              <Input
                id="title"
                value={quoteData.title}
                onChange={(e) => handleQuoteChange('title', e.target.value)}
                placeholder="Enter quote title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                value={quoteData.description}
                onChange={(e) => handleQuoteChange('description', e.target.value)}
                placeholder="Enter quote description"
              />
            </div>
          </div>
        )

      case 1: // Quote Items
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Quote Items</h3>
              <Button onClick={addItem} variant="outline">
                Add Item
              </Button>
            </div>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <Label>Item Name *</Label>
                      <Input
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        placeholder="Product or service name"
                      />
                    </div>
                    <div>
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label>Unit Price *</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label>Description</Label>
                    <Input
                      value={item.description || ''}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Item description"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <Label>Discount (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={item.discount_percent || 0}
                        onChange={(e) => handleItemChange(index, 'discount_percent', parseFloat(e.target.value) || 0)}
                        placeholder="0"
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
                  {items.length > 1 && (
                    <div className="mt-3 flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove Item
                      </Button>
                    </div>
                  )}
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
                </div>
              ))}
            </div>
            <div className="text-right">
              <div className="text-xl font-bold">
                Total: ${calculateTotal().toFixed(2)}
              </div>
            </div>
          </div>
        )

      case 2: // Workflow Configuration
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Configure Approval Workflow</h3>
              <p className="text-gray-600 mb-6">
                Set up the approval process for this quote. You can drag and drop steps to reorder them.
              </p>
            </div>
            <WorkflowBuilder
              initialWorkflow={workflowData}
              onSave={handleWorkflowUpdate}
              onCancel={() => {}} // No-op since we're in a wizard
              loading={false}
              showSubmit={false}
            />
          </div>
        )

      case 3: // Review
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium mb-4">Review Your Quote</h3>
              
              {/* Quote Summary */}
              <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Customer:</span> {quoteData.customer_name}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {quoteData.customer_email || 'N/A'}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Title:</span> {quoteData.title}
                  </div>
                  {quoteData.description && (
                    <div className="col-span-2">
                      <span className="font-medium">Description:</span> {quoteData.description}
                    </div>
                  )}
                </div>
                
                {/* Items Summary */}
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Items ({items.length})</h4>
                  <div className="space-y-2">
                    {items.map((item, index) => {
                      const itemSubtotal = item.quantity * item.unit_price
                      const itemDiscount = calculateItemDiscount(item)
                      const itemTotal = itemSubtotal - itemDiscount
                      
                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between">
                            <span>{item.name} (×{item.quantity} @ ${item.unit_price})</span>
                            <span>${itemSubtotal.toFixed(2)}</span>
                          </div>
                          {itemDiscount > 0 && (
                            <div className="flex justify-between text-sm text-red-600">
                              <span className="ml-4">Discount</span>
                              <span>-${itemDiscount.toFixed(2)}</span>
                            </div>
                          )}
                          {itemDiscount > 0 && (
                            <div className="flex justify-between text-sm font-medium">
                              <span className="ml-4">Line Total</span>
                              <span>${itemTotal.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="border-t mt-3 pt-3 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}</span>
                    </div>
                    {items.some(item => calculateItemDiscount(item) > 0) && (
                      <div className="flex justify-between text-red-600">
                        <span>Total Discounts:</span>
                        <span>-${items.reduce((sum, item) => sum + calculateItemDiscount(item), 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Workflow Summary */}
              <div className="mt-6">
                <h4 className="font-medium mb-3">Approval Workflow</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    {workflowData.steps.map((step, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                          {step.order}
                        </div>
                        <span>{step.name}</span>
                        <span className="text-gray-500">({step.persona})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center ${index < WIZARD_STEPS.length - 1 ? 'flex-1' : ''}`}
          >
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  index <= currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index + 1}
              </div>
              <div className="mt-2 text-center">
                <div className={`text-sm font-medium ${
                  index <= currentStep ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-500 max-w-24">
                  {step.description}
                </div>
              </div>
            </div>
            {index < WIZARD_STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 transition-colors ${
                  index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white p-8 rounded-lg border border-gray-200 min-h-96">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {WIZARD_STEPS[currentStep].title}
          </h2>
          <p className="text-gray-600">
            {WIZARD_STEPS[currentStep].description}
          </p>
        </div>
        
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          Previous
        </Button>

        <div className="flex gap-3">
          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button
              onClick={nextStep}
              disabled={!validateCurrentStep()}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!validateCurrentStep() || loading}
            >
              {loading ? 'Creating...' : 'Create Quote & Workflow'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}