"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Loader2 } from "lucide-react"
import { useAuth } from "@/app/providers"
import { useQuotes } from "@/hooks/use-quotes"
import { useMemo } from "react"

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

// Helper to get current stage from status
const getStageFromStatus = (status: string) => {
  const stageMap: Record<string, string> = {
    'pending_deal_desk': 'Deal Desk Review',
    'pending_cro': 'CRO Approval',
    'pending_legal': 'Legal Review',
    'pending_finance': 'Finance Review',
    'pending_customer': 'Customer Delivery',
    'approved': 'Customer Delivery',
    'rejected': 'Rejected',
    'terminated': 'Terminated'
  }
  return stageMap[status] || 'In Progress'
}

export function DashboardOverview() {
  const { user } = useAuth()
  const { data: quotes = [], isLoading } = useQuotes()
  
  // Get first name from user data
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 
                   user?.email?.split('@')[0] || 
                   'there'
  
  // Calculate stats from real data
  const stats = useMemo(() => {
    const totalQuotes = quotes.length
    const totalValue = quotes.reduce((sum: number, q: any) => sum + (q.total_amount || 0), 0)
    const approvedQuotes = quotes.filter((q: any) => q.status === 'approved').length
    const winRate = totalQuotes > 0 ? Math.round((approvedQuotes / totalQuotes) * 100) : 0
    
    return [
      {
        title: "Total Quotes",
        value: totalQuotes.toString(),
        change: "+12%",
        icon: FileText,
      },
      {
        title: "Pipeline Value",
        value: `$${(totalValue / 1000000).toFixed(1)}M`,
        change: "+8%",
        icon: FileText,
      },
      {
        title: "Avg. Approval Time",
        value: "2.3 days",
        change: "-15%",
        icon: FileText,
      },
      {
        title: "Win Rate",
        value: `${winRate}%`,
        change: "+5%",
        icon: FileText,
      },
    ]
  }, [quotes])
  
  // Get recent quotes
  const recentQuotes = useMemo(() => {
    return quotes
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)
      .map((q: any) => ({
        id: q.id,
        customer: q.customer_name,
        title: q.title,
        amount: q.total_amount || 0,
        status: q.status === 'approved' ? 'approved' : 'pending',
        stage: getStageFromStatus(q.status),
        created: getTimeAgo(q.created_at)
      }))
  }, [quotes])
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }
  
  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Hi {firstName}!</h1>
        <p className="text-gray-600 mt-1">Here's what's happening with your quotes.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
              <div className="p-2 bg-gray-100 rounded-lg">
                <stat.icon className="h-4 w-4 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <p className="text-xs text-green-600 mt-1 font-medium">{stat.change} from last month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Quotes */}
      <Card className="border-gray-200 hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Recent Quotes</CardTitle>
          <CardDescription>Latest quotes and their approval status</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {recentQuotes.map((quote) => (
              <div
                key={quote.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-900 truncate">{quote.customer}</h4>
                    <Badge
                      variant={quote.status === "approved" ? "default" : "secondary"}
                      className={
                        quote.status === "approved"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : "bg-yellow-100 text-yellow-800 border-yellow-200"
                      }
                    >
                      {quote.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-1 truncate">{quote.title}</p>
                  <p className="text-xs text-gray-500">
                    {quote.stage} • {quote.created}
                  </p>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <p className="font-bold text-gray-900">${quote.amount.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
