"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Download, Mail, CheckCircle } from 'lucide-react'
import type { Quote } from "@/types/quote"

interface QuoteDocumentPreviewProps {
  quote: Quote
  isOpen: boolean
  onClose: () => void
}

export function QuoteDocumentPreview({ quote, isOpen, onClose }: QuoteDocumentPreviewProps) {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto bg-white">
        <DialogHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 -m-6 mb-6 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">Quote Sent to Customer!</DialogTitle>
              <p className="text-green-100 mt-1">The quote document has been generated and sent to {quote.customer_name}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-8">
          {/* Professional Quote Document */}
          <div className="bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {/* Document Header */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-700 text-white p-8">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold">Canyon AI</h1>
                  <p className="text-gray-300 mt-2 text-lg">Configure, Price, Quote</p>
                  <div className="mt-4 space-y-1">
                    <p className="text-gray-300">123 Business Ave, Suite 100</p>
                    <p className="text-gray-300">San Francisco, CA 94105</p>
                    <p className="text-gray-300">Phone: (555) 123-4567</p>
                    <p className="text-gray-300">Email: sales@canyonai.com</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-2xl font-bold">{quote.quote_number}</p>
                    <p className="text-gray-300 mt-1">Quote Number</p>
                  </div>
                  <p className="text-gray-300 mt-4">{formatDate(quote.created_at)}</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="border-2 border-gray-100">
                  <CardHeader className="bg-gray-50">
                    <CardTitle className="text-lg">Bill To</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <p className="text-xl font-bold text-gray-900">{quote.customer_name}</p>
                      {quote.customer_email && <p className="text-gray-600">{quote.customer_email}</p>}
                      <div className="mt-4 space-y-1 text-gray-600">
                        <p>123 Customer Street</p>
                        <p>Customer City, ST 12345</p>
                        <p>United States</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-gray-100">
                  <CardHeader className="bg-gray-50">
                    <CardTitle className="text-lg">Quote Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-700">Quote Date:</span>
                      <span className="text-gray-900">{formatDate(quote.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-700">Valid Until:</span>
                      <span className="text-gray-900">{formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-700">Sales Rep:</span>
                      <span className="text-gray-900">{quote.owner}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-700">Payment Terms:</span>
                      <span className="text-gray-900">Net 30</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quote Title and Description */}
              <Card className="border-2 border-gray-100">
                <CardHeader className="bg-gray-50">
                  <CardTitle className="text-xl">{quote.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {quote.description && <p className="text-gray-700 text-lg leading-relaxed">{quote.description}</p>}
                </CardContent>
              </Card>

              {/* Items Table */}
              <Card className="border-2 border-gray-100">
                <CardHeader className="bg-gray-50">
                  <CardTitle className="text-xl">Quote Items</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b-2 border-gray-200">
                        <tr>
                          <th className="text-left py-4 px-6 font-bold text-gray-900">Item</th>
                          <th className="text-center py-4 px-6 font-bold text-gray-900">Qty</th>
                          <th className="text-right py-4 px-6 font-bold text-gray-900">Unit Price</th>
                          <th className="text-right py-4 px-6 font-bold text-gray-900">Discount</th>
                          <th className="text-right py-4 px-6 font-bold text-gray-900">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quote.items.map((item, index) => (
                          <tr key={item.id} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="py-6 px-6">
                              <div>
                                <p className="font-semibold text-gray-900 text-lg">{item.name}</p>
                                {item.description && <p className="text-gray-600 mt-1">{item.description}</p>}
                              </div>
                            </td>
                            <td className="text-center py-6 px-6 font-semibold text-gray-900">{item.quantity}</td>
                            <td className="text-right py-6 px-6 font-semibold text-gray-900">{formatCurrency(item.unit_price)}</td>
                            <td className="text-right py-6 px-6">
                              {item.discount_percent > 0 ? (
                                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm font-semibold">
                                  {item.discount_percent}%
                                </span>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </td>
                            <td className="text-right py-6 px-6 font-bold text-gray-900 text-lg">{formatCurrency(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Section */}
                  <div className="bg-gray-50 border-t-2 border-gray-200 p-6">
                    <div className="max-w-md ml-auto space-y-3">
                      <div className="flex justify-between items-center text-lg">
                        <span className="font-semibold text-gray-700">Subtotal:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(quote.total_amount / (1 - quote.discount_percent / 100))}</span>
                      </div>
                      <div className="flex justify-between items-center text-lg">
                        <span className="font-semibold text-gray-700">Total Discount ({quote.discount_percent}%):</span>
                        <span className="font-semibold text-red-600">
                          -{formatCurrency((quote.total_amount / (1 - quote.discount_percent / 100)) * (quote.discount_percent / 100))}
                        </span>
                      </div>
                      <div className="border-t-2 border-gray-300 pt-3">
                        <div className="flex justify-between items-center text-2xl">
                          <span className="font-bold text-gray-900">Total:</span>
                          <span className="font-bold text-green-600">{formatCurrency(quote.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Terms and Conditions */}
              <Card className="border-2 border-gray-100">
                <CardHeader className="bg-gray-50">
                  <CardTitle className="text-xl">Terms and Conditions</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-gray-900">•</span>
                        <span>Payment terms: Net 30 days from invoice date</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-gray-900">•</span>
                        <span>Quote valid for 30 days from issue date</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-gray-900">•</span>
                        <span>All prices are in USD and exclude applicable taxes</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-gray-900">•</span>
                        <span>Delivery within 30 days of signed agreement</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-gray-900">•</span>
                        <span>Standard warranty and support included</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-gray-900">•</span>
                        <span>Additional terms available upon request</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card className="border-2 border-gray-100">
                <CardContent className="p-6">
                  <div className="text-center space-y-2">
                    <p className="text-lg font-semibold text-gray-900">Questions about this quote?</p>
                    <p className="text-gray-600">Contact your sales representative:</p>
                    <div className="mt-4 space-y-1">
                      <p className="font-semibold text-gray-900">{quote.owner}</p>
                      <p className="text-gray-600">sales@canyonai.com</p>
                      <p className="text-gray-600">(555) 123-4567</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center pt-4 border-t border-gray-200">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8">
              <Mail className="h-5 w-5 mr-2" />
              Email to Customer
            </Button>
            <Button variant="outline" size="lg" className="border-2 border-gray-300 hover:border-gray-400 font-semibold px-8">
              <Download className="h-5 w-5 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline" size="lg" onClick={onClose} className="border-2 border-gray-300 hover:border-gray-400 font-semibold px-8">
              Close Preview
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
