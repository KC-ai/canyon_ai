"use client"

import { useState, useContext, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation" // ✅ Add Next.js router
import { PersonaContext } from "@/app/dashboard/layout"
import { QuotesTable } from "./quotes-table"
import type { Quote } from "@/types/quote"
import { QuoteDetailModal } from "./quote-detail-modal"
import { useToast } from "@/hooks/use-toast"
import { useQuotes } from '@/hooks/use-quotes'
import { apiClient } from '@/lib/api-client'

export function QuotesManager() {
  const { currentPersona } = useContext(PersonaContext)
  const router = useRouter() // ✅ Add router hook
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const { data: quotes = [], isLoading, error, refetch } = useQuotes({ status: statusFilter })
  const { toast } = useToast()
  
  // Auto-refresh quotes every 2 seconds when modal is open
  useEffect(() => {
    if (isModalOpen) {
      const interval = setInterval(() => {
        refetch()
      }, 2000)
      
      return () => clearInterval(interval)
    }
  }, [isModalOpen, refetch])

  // ✅ Get current user ID from localStorage
  const getCurrentUserId = () => {
    try {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        return user.id
      }
    } catch (e) {
      console.error('Failed to parse user data:', e)
    }
    return null
  }

  const handleQuoteAction = async (quoteId: string, action: string, comments?: string) => {
    try {
      // Handle quote state changes via API
      if (action === "reopen") {
        await apiClient.reopenQuote(quoteId)
        toast({
          title: "Quote Reopened",
          description: "Quote has been reopened and moved to drafts.",
        })
      } else if (action === "cancel" || action === "terminate") {
        await apiClient.terminateQuote(quoteId, comments || "Terminated by user")
        toast({
          title: "Quote Terminated",
          description: "Quote has been terminated and moved to terminated status.",
        })
      }

      setIsModalOpen(false)
      setSelectedQuote(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update quote. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleQuoteSelect = (quote: Quote) => {
    setSelectedQuote(quote)
    setIsModalOpen(true)
  }

  const handleDeleteQuote = async (quote: Quote) => {
    // ✅ AE OVERRIDE POWER: Can delete ANY quote regardless of ownership/stage
    if (confirm(`Are you sure you want to delete quote ${quote.quote_number}? This action cannot be undone.`)) {
      try {
        await apiClient.deleteQuote(quote.id)
        toast({
          title: "Quote Deleted",
          description: "Quote has been permanently deleted.",
        })
        // Refetch quotes to update the list
        await refetch()
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete quote. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleUpdateQuote = (quote: Quote) => {
    // Navigate to the update quote page
    router.push(`/dashboard/quotes/create?draft=${quote.id}`)
  }

  const handleReopenQuote = async (quote: Quote) => {
    // Reopen rejected quote and push back to drafts
    if (confirm(`Are you sure you want to reopen quote ${quote.quote_number}? This will move it back to drafts.`)) {
      try {
        await apiClient.reopenQuote(quote.id)
        toast({
          title: "Quote Reopened",
          description: "Quote has been reopened and moved back to drafts.",
        })
        // Refetch quotes to update the list
        await refetch()
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to reopen quote. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleApproveQuote = async (quote: Quote) => {
    // Find the current workflow step for this persona
    const currentStep = quote.workflow_steps?.find(
      (step: any) => step.persona === currentPersona && step.status === "pending"
    )
    
    if (currentStep) {
      try {
        await apiClient.approveStep(currentStep.id)
        toast({
          title: "Quote Approved",
          description: "You have approved this quote.",
        })
        await refetch()
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to approve quote. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleRejectQuote = async (quote: Quote) => {
    const reason = prompt("Please provide a reason for rejecting this quote:")
    if (!reason) return
    
    // Find the current workflow step for this persona
    const currentStep = quote.workflow_steps?.find(
      (step: any) => step.persona === currentPersona && step.status === "pending"
    )
    
    if (currentStep) {
      try {
        await apiClient.rejectStep(currentStep.id, reason)
        toast({
          title: "Quote Rejected",
          description: "You have rejected this quote.",
        })
        await refetch()
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to reject quote. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const getFilteredQuotes = (filter: string): Quote[] => {
    const currentUserId = getCurrentUserId()
    
    // Helper to check if a role was ever part of a quote's workflow
    const wasRoleInvolved = (quote: Quote, persona: string): boolean => {
      if (!quote.workflow_steps) return false
      return quote.workflow_steps.some((step: any) => step.persona === persona)
    }
    
    // Helper to check if a role has already acted on a quote
    const hasRoleActed = (quote: Quote, persona: string): boolean => {
      if (!quote.workflow_steps) return false
      const roleStep = quote.workflow_steps.find((step: any) => step.persona === persona)
      return !!(roleStep && (roleStep.status === 'approved' || roleStep.status === 'rejected'))
    }
    
    switch (filter) {
      case "drafts":
        // AE only sees their own drafts
        return quotes.filter((q) => 
          (q.status === "draft" || q.status === "draft_reopened") && 
          q.user_id === currentUserId
        )
      case "my_queue":
        // For non-AE: show quotes where it's currently their turn to act
        if (currentPersona === "ae") {
          return quotes.filter((q) => 
            (q.status === "draft" || q.status === "draft_reopened") && 
            q.user_id === currentUserId
          )
        }
        // Check if the quote is pending this persona's action
        return quotes.filter((q) => q.status === `pending_${currentPersona}`)
      case "in_progress":
        if (currentPersona === "ae") {
          // AE sees all quotes in workflow
          return quotes.filter((q) => q.status.startsWith("pending_"))
        }
        // Non-AE: quotes they're involved in that aren't completed yet
        return quotes.filter((q) => 
          wasRoleInvolved(q, currentPersona) && 
          !['approved', 'rejected', 'terminated'].includes(q.status)
        )
      case "rejected":
        return quotes.filter((q) => q.status === "rejected")
      case "approved":
        return quotes.filter((q) => q.status === "approved")
      case "all":
        if (currentPersona === "ae") {
          // AE sees ALL quotes
          return quotes
        }
        // Non-AE: only see quotes they were/are involved in
        return quotes.filter((q) => wasRoleInvolved(q, currentPersona))
      default:
        return []
    }
  }

  const getTabsForPersona = (persona: string) => {
    const baseTabs = [{ value: "all", label: "All", count: getFilteredQuotes("all").length }]

    if (persona === "ae") {
      baseTabs.push(
        { value: "drafts", label: "Drafts", count: getFilteredQuotes("drafts").length },
        { value: "in_progress", label: "In Progress", count: getFilteredQuotes("in_progress").length },
        { value: "rejected", label: "Rejected", count: getFilteredQuotes("rejected").length },
        { value: "approved", label: "Approved", count: getFilteredQuotes("approved").length },
      )
    } else {
      baseTabs.push(
        { value: "my_queue", label: "My Queue", count: getFilteredQuotes("my_queue").length },
        { value: "in_progress", label: "In Progress", count: getFilteredQuotes("in_progress").length },
        { value: "rejected", label: "Rejected", count: getFilteredQuotes("rejected").length },
        { value: "approved", label: "Approved", count: getFilteredQuotes("approved").length },
      )
    }

    return baseTabs
  }

  const tabs = getTabsForPersona(currentPersona)
  const [activeTab, setActiveTab] = useState(tabs[0].value)



  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading quotes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-red-500">Error loading quotes. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
            <p className="text-gray-600 mt-1">
              {currentPersona === "ae" ? "Manage your quotes and drafts" : "Review and approve quotes in your workflow"}
            </p>
          </div>
          {currentPersona === "ae" && (
            <Link href="/dashboard/quotes/create">
              <Button className="bg-black hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                Create Quote
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 bg-gray-100 p-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="relative font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 bg-gray-200 text-gray-700 text-xs rounded-full px-2 py-0.5 font-semibold">
                  {tab.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{tab.label}</CardTitle>
                <CardDescription>
                  {tab.value === "all" && "All quotes in the system"}
                  {tab.value === "drafts" && "Quotes in draft status that you can edit"}
                  {tab.value === "my_queue" && "Quotes waiting for your approval"}
                  {tab.value === "in_progress" && "Quotes currently in the approval workflow"}
                  {tab.value === "rejected" && "Quotes that have been rejected"}
                  {tab.value === "approved" && "Quotes that have been approved"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <QuotesTable 
                    quotes={getFilteredQuotes(tab.value)} 
                    onQuoteSelect={handleQuoteSelect}
                    onDeleteQuote={handleDeleteQuote}
                    onUpdateQuote={handleUpdateQuote}
                    onReopenQuote={handleReopenQuote}
                    onApproveQuote={handleApproveQuote}
                    onRejectQuote={handleRejectQuote}
                    currentPersona={currentPersona}
                  />


                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <QuoteDetailModal
        quote={selectedQuote}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedQuote(null)
        }}
        currentPersona={currentPersona as any}
        onQuoteAction={handleQuoteAction}
      />
    </div>
  )
}
