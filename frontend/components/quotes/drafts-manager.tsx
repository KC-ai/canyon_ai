"use client"

import { useState, useEffect } from "react"
import { useQuotes } from "@/hooks/use-quotes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, Edit, Trash2, Send, FileText, Loader2 } from "lucide-react"
import Link from "next/link"

interface DraftQuote {
  id: string
  customer: string
  title: string
  amount: number
  items: number
  lastModified: string
  status: "draft" | "ready"
}

// Helper function to format time ago
const getTimeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  return `${Math.floor(seconds / 86400)} days ago`
}

interface DraftsManagerProps {
  onCreateQuote: (draft: DraftQuote) => void
}

export function DraftsManager({ onCreateQuote }: DraftsManagerProps) {
  const { data: quotes = [], isLoading } = useQuotes()
  const [drafts, setDrafts] = useState<DraftQuote[]>([])
  
  // Convert quotes to DraftQuote format
  useEffect(() => {
    const draftQuotes = quotes
      .filter((q: any) => q.status === 'draft' || q.status === 'draft_reopened')
      .map((q: any) => ({
        id: q.id,
        customer: q.customer_name,
        title: q.title,
        amount: q.total_amount || 0,
        items: q.items?.length || 0,
        lastModified: getTimeAgo(q.updated_at || q.created_at),
        status: q.items?.length > 0 ? 'ready' : 'draft' as const
      }))
    setDrafts(draftQuotes)
  }, [quotes])
  const [searchTerm, setSearchTerm] = useState("")

  const filteredDrafts = drafts.filter(
    (draft) =>
      draft.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      draft.title.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleDeleteDraft = (id: string) => {
    setDrafts(drafts.filter((draft) => draft.id !== id))
  }

  const handleCreateQuote = (draft: DraftQuote) => {
    // Remove from drafts and create actual quote
    setDrafts(drafts.filter((d) => d.id !== draft.id))
    onCreateQuote(draft)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quote Drafts</h2>
          <p className="text-gray-600 mt-1">Manage your draft quotes before creating workflows</p>
        </div>
        <Link href="/dashboard/quotes/create">
          <Button className="bg-black hover:bg-gray-800">
            <Plus className="h-4 w-4 mr-2" />
            New Draft
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search drafts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Drafts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDrafts.map((draft) => (
          <Card key={draft.id} className="border-gray-200 hover:border-gray-300 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{draft.customer}</CardTitle>
                  <CardDescription className="mt-1">{draft.title}</CardDescription>
                </div>
                <Badge
                  variant={draft.status === "ready" ? "default" : "secondary"}
                  className={draft.status === "ready" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                >
                  {draft.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Amount</p>
                  <p className="font-medium">{draft.amount > 0 ? `$${draft.amount.toLocaleString()}` : "Not set"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Items</p>
                  <p className="font-medium">{draft.items} items</p>
                </div>
              </div>

              <div className="text-xs text-gray-500">Last modified {draft.lastModified}</div>

              <div className="flex gap-2">
                <Link href={`/dashboard/quotes/create?draft=${draft.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    <Edit className="h-3 w-3 mr-2" />
                    Edit
                  </Button>
                </Link>

                {draft.status === "ready" && (
                  <Button
                    size="sm"
                    className="flex-1 bg-black hover:bg-gray-800"
                    onClick={() => handleCreateQuote(draft)}
                  >
                    <Send className="h-3 w-3 mr-2" />
                    Create Quote
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDeleteDraft(draft.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDrafts.length === 0 && (
        <Card className="border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No drafts found</h3>
            <p className="text-gray-500 text-center mb-4">
              {searchTerm ? "No drafts match your search criteria." : "Start by creating your first quote draft."}
            </p>
            <Link href="/dashboard/quotes/create">
              <Button className="bg-black hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                Create First Draft
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
