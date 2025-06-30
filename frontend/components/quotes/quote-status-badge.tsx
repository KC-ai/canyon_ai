import { Badge } from "@/components/ui/badge"
import type { QuoteStatus } from "@/types/quote"

interface QuoteStatusBadgeProps {
  status: QuoteStatus
  className?: string
}

const statusConfig: Record<QuoteStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-800" },
  draft_reopened: { label: "Draft (Reopened)", className: "bg-blue-100 text-blue-800" },
  pending_deal_desk: { label: "Deal Desk Review", className: "bg-yellow-100 text-yellow-800" },
  pending_cro: { label: "CRO Review", className: "bg-orange-100 text-orange-800" },
  pending_legal: { label: "Legal Review", className: "bg-purple-100 text-purple-800" },
  pending_finance: { label: "Finance Review", className: "bg-red-100 text-red-800" },
  approved: { label: "Approved", className: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-800" },
}

export function QuoteStatusBadge({ status, className }: QuoteStatusBadgeProps) {
  const config = statusConfig[status]

  return <Badge className={`${config.className} ${className || ""}`}>{config.label}</Badge>
}
