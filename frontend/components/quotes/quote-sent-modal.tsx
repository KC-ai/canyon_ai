"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Download, Send } from "lucide-react"
import { QuotePreview } from "./quote-preview"
import type { Quote } from "@/types/quote"

interface QuoteSentModalProps {
  quote: Quote | null
  isOpen: boolean
  onClose: () => void
}

export function QuoteSentModal({ quote, isOpen, onClose }: QuoteSentModalProps) {
  if (!quote) return null

  const handleDownloadPDF = () => {
    // TODO: Implement PDF download functionality
    console.log("Download PDF for quote:", quote.quote_number)
  }

  const handleSendEmail = () => {
    // TODO: Implement email sending functionality
    console.log("Send email for quote:", quote.quote_number)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <div>
              <DialogTitle className="text-2xl">Quote Successfully Sent!</DialogTitle>
              <DialogDescription className="text-base mt-1">
                Quote {quote.quote_number} has been approved and sent to {quote.customer_name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left side - Quote Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Quote Preview</h3>
            <div className="border rounded-lg p-4 bg-gray-50 max-h-[600px] overflow-y-auto">
              <QuotePreview quote={quote} />
            </div>
          </div>

          {/* Right side - Actions and Info */}
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">What happens next?</h4>
              <ul className="space-y-2 text-sm text-green-800">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>The customer has been notified via email</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>They can review and accept the quote online</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>You'll be notified when they take action</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Quick Actions</h4>
              <div className="space-y-2">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={handleDownloadPDF}
                  disabled
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF Copy
                  <span className="ml-auto text-xs text-gray-500">Coming soon</span>
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={handleSendEmail}
                  disabled
                >
                  <Send className="h-4 w-4 mr-2" />
                  Resend Email
                  <span className="ml-auto text-xs text-gray-500">Coming soon</span>
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Quote Details</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-blue-700">Quote Number:</dt>
                  <dd className="font-medium text-blue-900">{quote.quote_number}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-blue-700">Customer:</dt>
                  <dd className="font-medium text-blue-900">{quote.customer_name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-blue-700">Total Amount:</dt>
                  <dd className="font-medium text-blue-900">
                    ${quote.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-blue-700">Discount Applied:</dt>
                  <dd className="font-medium text-blue-900">{quote.discount_percent}%</dd>
                </div>
              </dl>
            </div>

            <div className="pt-4">
              <Button 
                className="w-full bg-black hover:bg-gray-800" 
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}