import { CreateQuoteForm } from "@/components/quotes/create-quote-form"
import { Suspense } from "react"

function CreateQuoteContent() {
  return <CreateQuoteForm />
}

export default function CreateQuotePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateQuoteContent />
    </Suspense>
  )
}
