'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ApprovalWorkflow, WorkflowStepCreate, PersonaType } from '@/types/workflows'
import { api } from '@/lib/api'
import { showToast } from '@/lib/toast'
import WorkflowBuilder from '@/components/workflows/WorkflowBuilder'
import { DragDropProvider } from '@/components/workflows/DragDropProvider'

// Sample workflow for demonstration
const createSampleWorkflow = (): ApprovalWorkflow => ({
  id: 'sample-workflow-' + Date.now(),
  user_id: 'demo-user',
  name: 'Sample Deal Approval Workflow',
  description: 'Standard approval workflow for deals over $10K',
  status: 'active' as const,
  is_active: true,
  trigger_amount: 10000,
  auto_start: true,
  allow_parallel_steps: false,
  require_all_approvals: true,
  steps: [
    {
      id: 'step-1',
      workflow_id: 'sample-workflow',
      name: 'AE Review',
      description: 'Account Executive review and validation',
      persona: PersonaType.AE,
      order: 1,
      status: 'pending' as const,
      is_required: true,
      auto_approve_threshold: 5000,
      max_processing_days: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'step-2',
      workflow_id: 'sample-workflow',
      name: 'Deal Desk Review',
      description: 'Deal Desk pricing and terms review',
      persona: PersonaType.DEAL_DESK,
      order: 2,
      status: 'pending' as const,
      is_required: true,
      auto_approve_threshold: 25000,
      max_processing_days: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'step-3',
      workflow_id: 'sample-workflow',
      name: 'Sales Manager Approval',
      description: 'Sales Manager approval for deals over $25K',
      persona: PersonaType.SALES_MANAGER,
      order: 3,
      status: 'pending' as const,
      is_required: true,
      auto_approve_threshold: 50000,
      max_processing_days: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'step-4',
      workflow_id: 'sample-workflow',
      name: 'CRO Final Approval',
      description: 'CRO approval for large deals',
      persona: PersonaType.CRO,
      order: 4,
      status: 'pending' as const,
      is_required: true,
      max_processing_days: 7,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  quote_id: null,
  started_at: null,
  completed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
})

export default function WorkflowsPage() {
  const [workflow, setWorkflow] = useState<ApprovalWorkflow>(createSampleWorkflow())
  const [isSaving, setIsSaving] = useState(false)

  const handleWorkflowSave = async (updatedWorkflow: ApprovalWorkflow) => {
    setIsSaving(true)
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setWorkflow(updatedWorkflow)
      showToast.success('Workflow saved successfully!')
      
      console.log('Saved workflow:', updatedWorkflow)
    } catch (error) {
      console.error('Failed to save workflow:', error)
      showToast.error('Failed to save workflow')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateNewWorkflow = () => {
    const newWorkflow = createSampleWorkflow()
    setWorkflow(newWorkflow)
    showToast.success('New workflow created!')
  }

  const handleLoadEnterpriseWorkflow = () => {
    const enterpriseWorkflow: ApprovalWorkflow = {
      ...workflow,
      id: 'enterprise-workflow-' + Date.now(),
      name: 'Enterprise Deal Approval Workflow',
      description: 'Enhanced approval workflow for enterprise deals with legal review',
      trigger_amount: 100000,
      steps: [
        {
          id: 'enterprise-step-1',
          workflow_id: 'enterprise-workflow',
          name: 'AE Review',
          description: 'Account Executive review',
          persona: PersonaType.AE,
          order: 1,
          status: 'pending' as const,
          is_required: true,
          max_processing_days: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'enterprise-step-2',
          workflow_id: 'enterprise-workflow',
          name: 'Deal Desk Review',
          description: 'Deal Desk comprehensive review',
          persona: PersonaType.DEAL_DESK,
          order: 2,
          status: 'pending' as const,
          is_required: true,
          max_processing_days: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'enterprise-step-3',
          workflow_id: 'enterprise-workflow',
          name: 'Legal Review',
          description: 'Legal team contract and terms review',
          persona: PersonaType.LEGAL,
          order: 3,
          status: 'pending' as const,
          is_required: true,
          max_processing_days: 7,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'enterprise-step-4',
          workflow_id: 'enterprise-workflow',
          name: 'Finance Review',
          description: 'Finance team revenue and cash flow review',
          persona: PersonaType.FINANCE,
          order: 4,
          status: 'pending' as const,
          is_required: true,
          max_processing_days: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'enterprise-step-5',
          workflow_id: 'enterprise-workflow',
          name: 'CRO Final Approval',
          description: 'CRO final approval for enterprise deals',
          persona: PersonaType.CRO,
          order: 5,
          status: 'pending' as const,
          is_required: true,
          max_processing_days: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    }
    
    setWorkflow(enterpriseWorkflow)
    showToast.success('Enterprise workflow loaded!')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Builder</h1>
          <p className="text-gray-600">
            Create and manage approval workflows with drag-and-drop functionality
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateNewWorkflow}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            New Standard Workflow
          </button>
          
          <button
            onClick={handleLoadEnterpriseWorkflow}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Load Enterprise Template
          </button>
          
          <Link
            href="/quotes"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Quotes
          </Link>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">How to use the Workflow Builder</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Drag and Drop:</strong> Grab the drag handle (⋮⋮) on any step to reorder the workflow</li>
                <li><strong>Add Steps:</strong> Click "Add Step" to create new approval steps</li>
                <li><strong>Remove Steps:</strong> Click the trash icon to delete unwanted steps</li>
                <li><strong>Edit Steps:</strong> Click on any step to edit its details, persona, and settings</li>
                <li><strong>Auto-Save:</strong> Changes are automatically saved as you work</li>
                <li><strong>Templates:</strong> Use the template buttons above to load pre-configured workflows</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Builder */}
      <DragDropProvider>
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {workflow.name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {workflow.description}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {isSaving && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                    Saving...
                  </div>
                )}
                
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  workflow.status === 'active' ? 'bg-green-100 text-green-800' :
                  workflow.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <WorkflowBuilder
              workflow={workflow}
              onSave={handleWorkflowSave}
              showDragDrop={true}
              showActions={true}
              autoSave={true}
              enableStepCreation={true}
              enableStepDeletion={true}
              showPersonaSelection={true}
            />
          </div>
        </div>
      </DragDropProvider>

      {/* Workflow Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Summary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Configuration</h4>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Total Steps:</dt>
                <dd className="font-medium text-gray-900">{workflow.steps.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Required Steps:</dt>
                <dd className="font-medium text-gray-900">
                  {workflow.steps.filter(s => s.is_required).length}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Trigger Amount:</dt>
                <dd className="font-medium text-gray-900">
                  {workflow.trigger_amount ? `$${workflow.trigger_amount.toLocaleString()}` : 'None'}
                </dd>
              </div>
            </dl>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Step Order</h4>
            <ol className="space-y-1 text-sm">
              {workflow.steps
                .sort((a, b) => a.order - b.order)
                .map((step, index) => (
                  <li key={step.id} className="flex items-center gap-2">
                    <span className="text-gray-400">{index + 1}.</span>
                    <span className="text-gray-900">{step.name}</span>
                    <span className="text-xs text-gray-500">({step.persona})</span>
                  </li>
                ))}
            </ol>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Personas Involved</h4>
            <div className="space-y-1">
              {Array.from(new Set(workflow.steps.map(s => s.persona))).map(persona => (
                <span
                  key={persona}
                  className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                >
                  {persona.replace('_', ' ').toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}