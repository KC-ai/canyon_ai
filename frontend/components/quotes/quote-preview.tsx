"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { Quote } from "@/types/quote"

interface QuotePreviewProps {
  quote: Quote
}

export function QuotePreview({ quote }: QuotePreviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const subtotal = quote.items?.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unit_price * (1 - item.discount_percent / 100)
    return sum + itemTotal
  }, 0) || 0

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader className="bg-gray-50 pb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">QUOTE</h1>
            <p className="text-sm text-gray-600 mt-1">{quote.quote_number}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Date</p>
            <p className="font-medium">{formatDate(quote.created_at)}</p>
            <p className="text-sm text-gray-600 mt-2">Valid Until</p>
            <p className="font-medium">{quote.valid_until ? formatDate(quote.valid_until) : 'N/A'}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Customer Information */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Bill To</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-medium text-gray-900">{quote.customer_name}</p>
            {quote.customer_company && (
              <p className="text-gray-600">{quote.customer_company}</p>
            )}
            {quote.customer_email && (
              <p className="text-gray-600">{quote.customer_email}</p>
            )}
          </div>
        </div>

        {/* Quote Details */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Quote Details</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Title:</span>
              <span className="font-medium">{quote.title}</span>
            </div>
            {quote.description && (
              <div className="flex justify-between">
                <span className="text-gray-600">Description:</span>
                <span className="font-medium text-right max-w-xs">{quote.description}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Line Items */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Item</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-600">Qty</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-600">Unit Price</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-600">Discount</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.items?.map((item, index) => {
                  const itemTotal = item.quantity * item.unit_price * (1 - item.discount_percent / 100)
                  return (
                    <tr key={index} className="border-b">
                      <td className="py-3">
                        <p className="font-medium">{item.product_name}</p>
                        {item.description && (
                          <p className="text-sm text-gray-600">{item.description}</p>
                        )}
                      </td>
                      <td className="text-right py-3">{item.quantity}</td>
                      <td className="text-right py-3">{formatCurrency(item.unit_price)}</td>
                      <td className="text-right py-3">{item.discount_percent}%</td>
                      <td className="text-right py-3 font-medium">{formatCurrency(itemTotal)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <Separator />

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {quote.discount_percent > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Overall Discount ({quote.discount_percent}%)</span>
              <span>-{formatCurrency(subtotal * quote.discount_percent / 100)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span className="text-green-600">{formatCurrency(quote.total_amount)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 text-center text-sm text-gray-600">
          <p>Thank you for your business!</p>
          <p className="mt-1">This quote is valid until {quote.valid_until ? formatDate(quote.valid_until) : 'further notice'}.</p>
        </div>
      </CardContent>
    </Card>
  )
}