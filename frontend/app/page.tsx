import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, BarChart3, FileText, Users, Zap } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="ml-2 text-xl font-semibold text-gray-900 tracking-tight">Canyon AI</span>
            </div>
            <Link href="/login">
              <Button variant="outline" className="border-gray-300 bg-transparent font-medium">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            Configure, Price, Quote.
            <br />
            <span className="text-gray-600">Powered by AI.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto font-medium leading-relaxed">
            Streamline your sales process with intelligent quote generation, automated approval workflows, and real-time
            collaboration. Close deals faster with Canyon AI CPQ.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-black hover:bg-gray-800 text-white px-8 font-medium">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">
              Everything you need to close deals faster
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-medium">
              From quote creation to approval workflows, Canyon AI handles the entire CPQ process so your team can focus
              on what matters most.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <Zap className="h-8 w-8 text-black mb-2" />
                <CardTitle className="text-lg font-semibold">AI-Powered Quotes</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="font-medium">
                  Generate accurate quotes instantly using natural language prompts and intelligent pricing models.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <Users className="h-8 w-8 text-black mb-2" />
                <CardTitle className="text-lg font-semibold">Smart Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="font-medium">
                  Automated approval routing based on deal size, discount levels, and custom business rules.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <FileText className="h-8 w-8 text-black mb-2" />
                <CardTitle className="text-lg font-semibold">Real-time Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="font-medium">
                  Keep everyone in sync with live updates, comments, and notifications throughout the approval process.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-black mb-2" />
                <CardTitle className="text-lg font-semibold">Analytics & Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="font-medium">
                  Track performance metrics, approval times, and conversion rates to optimize your sales process.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-black text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-4 tracking-tight">Ready to transform your quote process?</h2>
          <p className="text-lg text-gray-300 mb-8 font-medium">
            Join leading sales teams who trust Canyon AI to accelerate their deal cycles.
          </p>
          <Link href="/login">
            <Button size="lg" variant="secondary" className="bg-white text-black hover:bg-gray-100 font-medium">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="ml-2 text-lg font-semibold text-gray-900 tracking-tight">Canyon AI</span>
            </div>
            <p className="text-gray-500 font-medium">© Future Canyon AI Copyright message.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
