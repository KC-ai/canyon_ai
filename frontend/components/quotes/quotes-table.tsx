"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, Trash2, Edit, RotateCcw, Check, X } from "lucide-react"
import { QuoteStatusPill } from "./quote-status-pill"
import type { Quote } from "@/types/quote"

interface QuotesTableProps {
  quotes: Quote[]
  onQuoteSelect?: (quote: Quote) => void
  onDeleteQuote?: (quote: Quote) => void
  onUpdateQuote?: (quote: Quote) => void
  onReopenQuote?: (quote: Quote) => void
  onApproveQuote?: (quote: Quote) => void
  onRejectQuote?: (quote: Quote) => void
  currentPersona?: string
}

type SortField = "quote_number" | "customer_name" | "total_amount" | "discount_percent" | "updated_at"
type SortDirection = "asc" | "desc"

export function QuotesTable({ quotes, onQuoteSelect, onDeleteQuote, onUpdateQuote, onReopenQuote, onApproveQuote, onRejectQuote, currentPersona }: QuotesTableProps) {
  const [sortField, setSortField] = useState<SortField>("updated_at")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const sortedQuotes = [...quotes].sort((a, b) => {
    let aValue: any = a[sortField]
    let bValue: any = b[sortField]

    if (sortField === "updated_at") {
      aValue = new Date(aValue).getTime()
      bValue = new Date(bValue).getTime()
    }

    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }

    if (sortDirection === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }



  return (
    <div className="border border-gray-200 rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("quote_number")}
                className="h-auto p-0 font-medium text-left"
              >
                Quote #
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("customer_name")}
                className="h-auto p-0 font-medium text-left"
              >
                Customer
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("total_amount")}
                className="h-auto p-0 font-medium text-left"
              >
                Amount
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("discount_percent")}
                className="h-auto p-0 font-medium text-left"
              >
                Discount%
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("updated_at")}
                className="h-auto p-0 font-medium text-left"
              >
                Updated
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedQuotes.map((quote) => (
            <TableRow key={quote.id} className="hover:bg-gray-50">
              <TableCell className="font-medium cursor-pointer" onClick={() => onQuoteSelect?.(quote)}>{quote.quote_number}</TableCell>
              <TableCell className="cursor-pointer" onClick={() => onQuoteSelect?.(quote)}>
                {quote.customer_name}
              </TableCell>
              <TableCell className="cursor-pointer" onClick={() => onQuoteSelect?.(quote)}>${quote.total_amount.toLocaleString()}</TableCell>
              <TableCell className="cursor-pointer" onClick={() => onQuoteSelect?.(quote)}>{quote.discount_percent}%</TableCell>
              <TableCell className="cursor-pointer" onClick={() => onQuoteSelect?.(quote)}>
                <QuoteStatusPill status={quote.status} />
              </TableCell>
              <TableCell className="text-gray-600 cursor-pointer" onClick={() => onQuoteSelect?.(quote)}>{quote.owner || 'N/A'}</TableCell>
              <TableCell className="text-gray-600 cursor-pointer" onClick={() => onQuoteSelect?.(quote)}>{formatDate(quote.updated_at)}</TableCell>
              <TableCell>
                {/* ✅ Action buttons based on quote status and persona */}
                <div className="flex items-center gap-1">
                  {/* Draft quotes: Update + Delete buttons */}
                  {(quote.status === "draft" || quote.status === "draft_reopened") && currentPersona === "ae" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onUpdateQuote?.(quote)
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1.5"
                        title="Update Quote"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteQuote?.(quote)
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5"
                        title="Delete Quote"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {/* Rejected quotes: Reopen + Delete buttons */}
                  {quote.status === "rejected" && currentPersona === "ae" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onReopenQuote?.(quote)
                        }}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 p-1.5"
                        title="Reopen Quote"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteQuote?.(quote)
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5"
                        title="Delete Quote"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {/* All other quotes: Just delete button for AE (override power) */}
                  {!["draft", "draft_reopened", "rejected"].includes(quote.status) && currentPersona === "ae" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteQuote?.(quote)
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5"
                      title="Delete Quote (AE Override Power)"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Non-AE personas: Approve/Reject buttons for quotes pending their approval */}
                  {currentPersona !== "ae" && quote.status === `pending_${currentPersona}` && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onApproveQuote?.(quote)
                        }}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 p-1.5"
                        title="Approve Quote"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRejectQuote?.(quote)
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5"
                        title="Reject Quote"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
