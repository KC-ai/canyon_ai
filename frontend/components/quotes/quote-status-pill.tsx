import { Badge } from "@/components/ui/badge"
import type { QuoteStatus } from "@/types/quote"

interface QuoteStatusPillProps {
  status: QuoteStatus
  className?: string
}

const statusConfig: Record<QuoteStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-800" },
  draft_reopened: { label: "Draft", className: "bg-gray-100 text-gray-800" },
  pending_deal_desk: { label: "Deal Desk", className: "bg-blue-100 text-blue-800" },
  pending_cro: { label: "CRO Review", className: "bg-blue-100 text-blue-800" },
  pending_legal: { label: "Legal Review", className: "bg-blue-100 text-blue-800" },
  pending_finance: { label: "Finance Review", className: "bg-blue-100 text-blue-800" },
  approved: { label: "Approved", className: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
  terminated: { label: "Terminated", className: "bg-gray-900 text-white" },
}

export function QuoteStatusPill({ status, className }: QuoteStatusPillProps) {
  const config = statusConfig[status]
  return <Badge className={`${config.className} ${className || ""}`}>{config.label}</Badge>
}
