"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Sparkles, Calculator, Users, Info, Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { apiClient } from '@/lib/api-client'
import { useToast } from "@/hooks/use-toast"
import { useQuote } from "@/hooks/use-quotes"

interface QuoteItem {
  id: string
  name: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
}

export function CreateQuoteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const draftId = searchParams.get('draft')
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("ai")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Load existing quote data if draftId is provided
  const { data: existingQuote } = useQuote(draftId || '')

  // Manual form state
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [quoteTitle, setQuoteTitle] = useState("")
  const [quoteDescription, setQuoteDescription] = useState("")
  const [items, setItems] = useState<QuoteItem[]>([
    {
      id: "1",
      name: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
    },
  ])

  // AI form state
  const [aiPrompt, setAiPrompt] = useState("")
  const [generatedQuote, setGeneratedQuote] = useState<any>(null)
  
  // Load existing quote data when it's available
  useEffect(() => {
    if (existingQuote && draftId) {
      setCustomerName(existingQuote.customer_name || "")
      setCustomerEmail(existingQuote.customer_email || "")
      setQuoteTitle(existingQuote.title || "")
      setQuoteDescription(existingQuote.description || "")
      
      // Transform items from API format to UI format
      if (existingQuote.items && existingQuote.items.length > 0) {
        const transformedItems = existingQuote.items.map((item: any, index: number) => ({
          id: item.id || (index + 1).toString(),
          name: item.name || "",
          description: item.description || "",
          quantity: item.quantity || 1,
          unitPrice: item.unit_price || 0,
          discount: item.discount_percent || 0
        }))
        setItems(transformedItems)
      }
      
      // Switch to manual tab when editing
      setActiveTab("manual")
      setIsUpdating(true)
    }
  }, [existingQuote, draftId])

  const addItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      name: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
    }
    setItems([...items, newItem])
  }

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const calculateItemTotal = (item: QuoteItem) => {
    const subtotal = item.quantity * item.unitPrice
    const discountAmount = subtotal * (item.discount / 100)
    return subtotal - discountAmount
  }

  const calculateQuoteTotal = () => {
    return items.reduce((total, item) => total + calculateItemTotal(item), 0)
  }

  const calculateOverallDiscount = () => {
    const totalBeforeDiscount = items.reduce(
      (total, item) => total + item.quantity * item.unitPrice,
      0
    )
    const totalAfterDiscount = calculateQuoteTotal()
    if (totalBeforeDiscount === 0) return 0
    return ((totalBeforeDiscount - totalAfterDiscount) / totalBeforeDiscount) * 100
  }

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description for the quote",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      const quote = await apiClient.generateQuoteFromAI(aiPrompt)
      
      // Transform the API response to match our UI format
      const generatedQuoteData = {
        customer: quote.customer_name || "New Customer",
        title: quote.title || "Generated Quote",
        description: quote.description || aiPrompt,
        items: quote.items || []
      }

      setGeneratedQuote(generatedQuoteData)
      toast({
        title: "Success",
        description: "Quote generated successfully!",
      })
    } catch (error) {
      console.error("Failed to generate quote:", error)
      toast({
        title: "Error",
        description: "Failed to generate quote. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const useGeneratedQuote = () => {
    if (generatedQuote) {
      setCustomerName(generatedQuote.customer)
      setQuoteTitle(generatedQuote.title)
      setQuoteDescription(generatedQuote.description)
      setItems(generatedQuote.items)
      setActiveTab("manual")
    }
  }

  const handleSubmit = async (saveAsDraft = false) => {
    try {
      setIsLoading(true)
      
      // Validate required fields
      if (!customerName || !quoteTitle) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        })
        return
      }
      // Transform items to match backend format, filtering out incomplete items
      const transformedItems = items
        .filter(item => item.name && item.unitPrice > 0) // Only include items with name and price
        .map(item => ({
          name: item.name,
          description: item.description || "",
          quantity: item.quantity || 1,
          unit_price: item.unitPrice,
          discount_percent: item.discount || 0
        }))
      
      if (transformedItems.length === 0) {
        toast({
          title: "Error",
          description: "Please add at least one item with a name and price",
          variant: "destructive"
        })
        return
      }

      const quoteData = {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_company: customerName, // Using customer name as company for now
        title: quoteTitle,
        description: quoteDescription,
        discount_percent: calculateOverallDiscount(),
        items: transformedItems
      }

      let resultQuote;
      if (isUpdating && draftId) {
        // Update existing quote
        resultQuote = await apiClient.updateQuote(draftId, quoteData)
        toast({
          title: "Success",
          description: "Quote updated successfully",
        })
      } else {
        // Create new quote
        resultQuote = await apiClient.createQuote(quoteData)
        toast({
          title: "Success",
          description: saveAsDraft ? "Quote saved as draft" : "Quote created successfully",
        })
      }

      if (!saveAsDraft) {
        // Redirect to workflow page where user can start the workflow
        router.push(`/dashboard/quotes/${resultQuote.id}/workflow`)
      } else {
        router.push("/dashboard/quotes")
      }
    } catch (error: any) {
      console.error("Error submitting quote:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create quote",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">Create Quote</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Generate a new quote with AI assistance or manual input
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="bg-gray-50 border-b border-gray-200 px-8 pt-8">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-white shadow-sm border border-gray-200">
                <TabsTrigger
                  value="ai"
                  className="data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm font-medium"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Generation
                </TabsTrigger>
                <TabsTrigger
                  value="manual"
                  className="data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm font-medium"
                >
                  Manual Input
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-8">
              <TabsContent value="ai" className="space-y-8 mt-0">
                <Card className="border-2 border-gray-100 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      AI Quote Generation
                    </CardTitle>
                    <CardDescription className="text-gray-200">
                      Describe your quote requirements in natural language and let AI generate the details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div>
                      <Label htmlFor="ai-prompt" className="text-lg font-semibold text-gray-900">
                        Quote Description
                      </Label>
                      <Textarea
                        id="ai-prompt"
                        placeholder="Example: Customer A wants 100 seats of product X with 25% discount for annual subscription..."
                        value={aiPrompt}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAiPrompt(e.target.value)}
                        rows={5}
                        className="mt-3 text-base border-2 border-gray-200 focus:border-black transition-colors"
                      />
                    </div>

                    <Button
                      onClick={handleAIGenerate}
                      disabled={!aiPrompt.trim() || isGenerating}
                      size="lg"
                      className="w-full bg-black hover:bg-gray-800 text-white px-8 font-medium"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          Generating Quote...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5 mr-3" />
                          Generate Quote
                        </>
                      )}
                    </Button>

                    {generatedQuote && (
                      <Card className="border-2 border-green-200 bg-green-50 shadow-lg">
                        <CardHeader className="bg-green-100 border-b border-green-200">
                          <CardTitle className="text-xl text-green-900">Generated Quote</CardTitle>
                          <CardDescription className="text-green-700">
                            Review and use the AI-generated quote
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <Label className="text-sm font-semibold text-gray-700">Customer</Label>
                              <p className="text-lg font-medium text-gray-900">{generatedQuote.customer}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-semibold text-gray-700">Title</Label>
                              <p className="text-lg font-medium text-gray-900">{generatedQuote.title}</p>
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Items</Label>
                            <div className="space-y-3">
                              {generatedQuote.items.map((item: any) => (
                                <div
                                  key={item.id}
                                  className="flex justify-between items-center p-4 bg-white rounded-lg border border-green-200 shadow-sm"
                                >
                                  <div>
                                    <p className="font-semibold text-gray-900">{item.name}</p>
                                    <p className="text-sm text-gray-600">{item.description}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-gray-900">
                                      ${(item.quantity * item.unitPrice * (1 - item.discount / 100)).toLocaleString()}
                                    </p>
                                    {item.discount > 0 && (
                                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                        <span>{item.discount}% off</span>
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-4 border-t border-green-200">
                            <span className="text-xl font-semibold text-gray-900">Total:</span>
                            <span className="text-2xl font-bold text-green-900">
                              $
                              {generatedQuote.items
                                .reduce(
                                  (total: number, item: any) =>
                                    total + item.quantity * item.unitPrice * (1 - item.discount / 100),
                                  0,
                                )
                                .toLocaleString()}
                            </span>
                          </div>

                          <Button
                            onClick={useGeneratedQuote}
                            size="lg"
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                          >
                            Use This Quote
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="manual" className="space-y-8 mt-0">
                {/* Customer Information */}
                <Card className="border-2 border-gray-100 shadow-lg">
                  <CardHeader className="bg-gray-50 border-b border-gray-200">
                    <CardTitle className="text-xl">Customer Information</CardTitle>
                    <CardDescription>Enter the customer details for this quote</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="customer-name" className="text-base font-semibold text-gray-900">
                          Customer Name *
                        </Label>
                        <Input
                          id="customer-name"
                          value={customerName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerName(e.target.value)}
                          placeholder="Acme Corp"
                          className="mt-2 text-base border-2 border-gray-200 focus:border-black transition-colors h-12"
                        />
                      </div>
                      <div>
                        <Label htmlFor="customer-email" className="text-base font-semibold text-gray-900">
                          Customer Email
                        </Label>
                        <Input
                          id="customer-email"
                          type="email"
                          value={customerEmail}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerEmail(e.target.value)}
                          placeholder="contact@acme.com"
                          className="mt-2 text-base border-2 border-gray-200 focus:border-black transition-colors h-12"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quote Details */}
                <Card className="border-2 border-gray-100 shadow-lg">
                  <CardHeader className="bg-gray-50 border-b border-gray-200">
                    <CardTitle className="text-xl">Quote Details</CardTitle>
                    <CardDescription>Provide the quote title and description</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div>
                      <Label htmlFor="quote-title" className="text-base font-semibold text-gray-900">
                        Quote Title *
                      </Label>
                      <Input
                        id="quote-title"
                        value={quoteTitle}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuoteTitle(e.target.value)}
                        placeholder="Enterprise Software License"
                        className="mt-2 text-base border-2 border-gray-200 focus:border-black transition-colors h-12"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quote-description" className="text-base font-semibold text-gray-900">
                        Description
                      </Label>
                      <Textarea
                        id="quote-description"
                        value={quoteDescription}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQuoteDescription(e.target.value)}
                        placeholder="Detailed description of the quote..."
                        rows={4}
                        className="mt-2 text-base border-2 border-gray-200 focus:border-black transition-colors"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Quote Items */}
                <Card className="border-2 border-gray-100 shadow-lg">
                  <CardHeader className="bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">Quote Items</CardTitle>
                        <CardDescription>Add products or services to this quote</CardDescription>
                      </div>
                      <Button
                        onClick={addItem}
                        variant="outline"
                        size="lg"
                        className="border-2 border-gray-300 hover:border-black bg-transparent"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Add Item
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    {items.map((item: QuoteItem, index: number) => (
                      <Card key={item.id} className="border-2 border-gray-100 shadow-sm">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-6">
                            <h4 className="text-lg font-semibold text-gray-900">Item {index + 1}</h4>
                            {items.length > 1 && (
                              <Button
                                onClick={() => removeItem(item.id)}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                              <Label className="text-base font-semibold text-gray-900">Item Name *</Label>
                              <Input
                                value={item.name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(item.id, "name", e.target.value)}
                                placeholder="Product or service name"
                                className="mt-2 text-base border-2 border-gray-200 focus:border-black transition-colors h-12"
                              />
                            </div>
                            <div>
                              <Label className="text-base font-semibold text-gray-900">Description</Label>
                              <Input
                                value={item.description}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(item.id, "description", e.target.value)}
                                placeholder="Brief description"
                                className="mt-2 text-base border-2 border-gray-200 focus:border-black transition-colors h-12"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div>
                              <Label className="text-base font-semibold text-gray-900">Quantity</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(item.id, "quantity", Number.parseInt(e.target.value) || 1)}
                                className="mt-2 text-base border-2 border-gray-200 focus:border-black transition-colors h-12"
                              />
                            </div>
                            <div>
                              <Label className="text-base font-semibold text-gray-900">Unit Price ($)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  updateItem(item.id, "unitPrice", Number.parseFloat(e.target.value) || 0)
                                }
                                className="mt-2 text-base border-2 border-gray-200 focus:border-black transition-colors h-12"
                              />
                            </div>
                            <div>
                              <Label className="text-base font-semibold text-gray-900">Discount (%)</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={item.discount}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  updateItem(item.id, "discount", Number.parseFloat(e.target.value) || 0)
                                }
                                className="mt-2 text-base border-2 border-gray-200 focus:border-black transition-colors h-12"
                              />
                            </div>
                            <div>
                              <Label className="text-base font-semibold text-gray-900">Total</Label>
                              <div className="mt-2 p-3 bg-gray-50 rounded-lg border-2 border-gray-200 text-base font-bold text-gray-900 h-12 flex items-center">
                                ${calculateItemTotal(item).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Quote Total */}
                    <Card className="border-2 border-black bg-gray-900 text-white shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                              <Calculator className="h-6 w-6" />
                            </div>
                            <span className="text-xl font-semibold">Quote Total</span>
                          </div>
                          <span className="text-3xl font-bold">${calculateQuoteTotal().toLocaleString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>

                {/* Workflow Preview */}
                <Card className="border-2 border-blue-100 bg-blue-50 shadow-lg">
                  <CardHeader className="bg-blue-100 border-b border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-700" />
                        <CardTitle className="text-xl text-blue-900">Approval Workflow Preview</CardTitle>
                      </div>
                      <Badge variant="secondary" className="bg-blue-200 text-blue-800">
                        <span>Overall Discount: {calculateOverallDiscount().toFixed(1)}%</span>
                      </Badge>
                    </div>
                    <CardDescription className="text-blue-700">
                      Based on the total discount, the following approvers will be required
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {/* Always required */}
                      <div className="flex items-center gap-2 p-2 bg-white rounded border border-blue-200 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span className="font-medium text-gray-900">Account Executive</span>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 ml-auto text-xs px-2 py-0.5">
                          <span>Will auto-approve</span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white rounded border border-blue-200 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span className="font-medium text-gray-900">Deal Desk</span>
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800 ml-auto text-xs px-2 py-0.5">
                          <span>Always required</span>
                        </Badge>
                      </div>
                      
                      {/* Conditional approvers based on discount */}
                      {calculateOverallDiscount() > 15 && (
                        <div className="flex items-center gap-2 p-2 bg-white rounded border border-orange-200 text-sm">
                          <div className="w-2 h-2 bg-orange-500 rounded-full" />
                          <span className="font-medium text-gray-900">CRO</span>
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800 ml-auto text-xs px-2 py-0.5">
                            <span>{'>'}15% discount</span>
                          </Badge>
                        </div>
                      )}
                      
                      {calculateOverallDiscount() > 40 && (
                        <div className="flex items-center gap-2 p-2 bg-white rounded border border-red-200 text-sm">
                          <div className="w-2 h-2 bg-red-500 rounded-full" />
                          <span className="font-medium text-gray-900">Finance</span>
                          <Badge variant="secondary" className="bg-red-100 text-red-800 ml-auto text-xs px-2 py-0.5">
                            <span>{'>'}40% discount</span>
                          </Badge>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 p-2 bg-white rounded border border-blue-200 text-sm">
                        <div className="w-2 h-2 bg-purple-500 rounded-full" />
                        <span className="font-medium text-gray-900">Legal</span>
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800 ml-auto text-xs px-2 py-0.5">
                          <span>Always required</span>
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 p-2 bg-white rounded border border-blue-200 text-sm">
                        <div className="w-2 h-2 bg-gray-500 rounded-full" />
                        <span className="font-medium text-gray-900">Customer Delivery</span>
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800 ml-auto text-xs px-2 py-0.5">
                          <span>Final step</span>
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="mt-3 p-3 bg-blue-100 rounded border border-blue-200">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-700 mt-0.5" />
                        <div className="text-xs text-blue-800">
                          <p className="font-medium mb-1">Discount Rules:</p>
                          <ul className="space-y-0.5 ml-3 text-xs">
                            <li>• 0-15%: Deal Desk + Legal</li>
                            <li>• 15-40%: Deal Desk + CRO + Legal</li>
                            <li>• {'>'}40%: Deal Desk + CRO + Finance + Legal</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-4 justify-center pt-4">
                  <Button
                    onClick={() => handleSubmit(false)}
                    size="lg"
                    className="bg-black hover:bg-gray-800 text-white font-semibold px-8 py-4 text-lg"
                    disabled={!customerName || !quoteTitle || items.some((item: QuoteItem) => !item.name)}
                  >
                    Create Quote
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleSubmit(true)}
                    disabled={!customerName || !quoteTitle}
                    className="border-2 border-gray-300 hover:border-black font-semibold px-8 py-4 text-lg"
                  >
                    Save as Draft
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => router.back()}
                    className="border-2 border-gray-300 hover:border-black font-semibold px-8 py-4 text-lg"
                  >
                    Cancel
                  </Button>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
