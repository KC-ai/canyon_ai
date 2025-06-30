import { QuoteWorkflowManager } from "@/components/quotes/quote-workflow-manager"

interface WorkflowPageProps {
  params: {
    id: string
  }
}

export default function QuoteWorkflowPage({ params }: WorkflowPageProps) {
  return <QuoteWorkflowManager quoteId={params.id} />
}
