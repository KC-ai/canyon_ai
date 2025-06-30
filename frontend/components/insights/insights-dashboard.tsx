"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Clock, DollarSign, TrendingUp, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"

const stats = [
  {
    title: "Total Quotes",
    value: "156",
    change: "+12%",
    changeType: "positive",
    icon: BarChart3,
  },
  {
    title: "Pipeline Value",
    value: "$2.4M",
    change: "+18%",
    changeType: "positive",
    icon: DollarSign,
  },
  {
    title: "Avg. Approval Time",
    value: "2.1 days",
    change: "-8%",
    changeType: "positive",
    icon: Clock,
  },
  {
    title: "Win Rate",
    value: "72%",
    change: "+5%",
    changeType: "positive",
    icon: TrendingUp,
  },
]

const approvalTimeData = [
  { persona: "Account Executive", avgTime: 0.5, count: 45 },
  { persona: "Deal Desk", avgTime: 1.2, count: 38 },
  { persona: "CRO", avgTime: 1.5, count: 15 },
  { persona: "Legal Team", avgTime: 2.8, count: 28 },
  { persona: "Finance Team", avgTime: 3.2, count: 8 },
]

const quotesByStageData = [
  { stage: "Draft", count: 12, percentage: 15 },
  { stage: "Deal Desk", count: 18, percentage: 23 },
  { stage: "CRO Review", count: 5, percentage: 6 },
  { stage: "Legal Review", count: 8, percentage: 10 },
  { stage: "Finance Review", count: 3, percentage: 4 },
  { stage: "Approved", count: 25, percentage: 32 },
  { stage: "Rejected", count: 8, percentage: 10 },
]

const approvalTrendsData = [
  { month: "Jan", approved: 45, rejected: 8, avgTime: 2.3 },
  { month: "Feb", approved: 52, rejected: 6, avgTime: 2.1 },
  { month: "Mar", approved: 48, rejected: 9, avgTime: 2.4 },
  { month: "Apr", approved: 61, rejected: 5, avgTime: 1.9 },
  { month: "May", approved: 55, rejected: 7, avgTime: 2.0 },
  { month: "Jun", approved: 58, rejected: 4, avgTime: 1.8 },
]

const COLORS = ["#1f2937", "#374151", "#4b5563", "#6b7280", "#9ca3af", "#10b981", "#ef4444"]

export function InsightsDashboard() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics & Insights</h1>
        <p className="text-gray-600 mt-1">Performance metrics and trends for your CPQ process</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
              <div className="p-2 bg-gray-100 rounded-lg">
                <stat.icon className="h-4 w-4 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <p
                className={`text-xs mt-1 font-medium ${stat.changeType === "positive" ? "text-green-600" : "text-red-600"}`}
              >
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Average Approval Time by Persona */}
        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Average Approval Time by Persona</CardTitle>
            <CardDescription>Time taken for each approval stage</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={approvalTimeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="persona"
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  label={{ value: "Days", angle: -90, position: "insideLeft" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                  formatter={(value: any) => [`${value} days`, "Avg Time"]}
                />
                <Bar dataKey="avgTime" fill="#1f2937" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quotes by Stage */}
        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Quotes by Stage</CardTitle>
            <CardDescription>Current distribution across workflow stages</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={quotesByStageData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ stage, percentage }) => `${stage} (${percentage}%)`}
                  labelLine={false}
                  fontSize={12}
                >
                  {quotesByStageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quote Approval Trends */}
      <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Quote Approval Trends</CardTitle>
          <CardDescription>Monthly approval and rejection trends with average processing time</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={approvalTrendsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "#6b7280" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="approved"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: "#10b981", r: 4 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="rejected"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ fill: "#ef4444", r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgTime"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ fill: "#6366f1", r: 4 }}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Bottlenecks
            </CardTitle>
            <CardDescription>Stages with longest approval times</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 font-medium">Finance Team</span>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 font-medium">
                3.2 days avg
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 font-medium">Legal Review</span>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 font-medium">
                2.8 days avg
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 font-medium">CRO Approval</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800 font-medium">
                1.5 days avg
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Quote Value Distribution</CardTitle>
            <CardDescription>Breakdown by deal size</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 font-medium">{"< $25K"}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div className="bg-gray-900 h-2 rounded-full" style={{ width: "45%" }}></div>
                </div>
                <span className="text-sm font-semibold">45%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 font-medium">$25K - $100K</span>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div className="bg-gray-900 h-2 rounded-full" style={{ width: "35%" }}></div>
                </div>
                <span className="text-sm font-semibold">35%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 font-medium">{"> $100K"}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div className="bg-gray-900 h-2 rounded-full" style={{ width: "20%" }}></div>
                </div>
                <span className="text-sm font-semibold">20%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest workflow actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">Quote approved</p>
                <p className="text-xs text-gray-500">Acme Corp - 2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">Pending legal review</p>
                <p className="text-xs text-gray-500">Global Solutions - 4 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">Quote rejected</p>
                <p className="text-xs text-gray-500">TechStart Inc - 1 day ago</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
