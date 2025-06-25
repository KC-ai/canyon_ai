import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Canyon CPQ</h1>
        <p className="text-xl text-gray-600 mb-8">Streamline your quote-to-cash process with intelligent workflow automation</p>
        <div className="flex justify-center gap-4">
          <Link 
            href="/quotes/create"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Create Your First Quote
          </Link>
          <Link 
            href="/quotes"
            className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            View Existing Quotes
          </Link>
        </div>
      </div>

      {/* Key Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-4xl mb-4">💰</div>
          <h3 className="text-lg font-semibold mb-2">Smart Quoting</h3>
          <p className="text-gray-600">Create professional quotes with automated pricing and approval workflows</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-4xl mb-4">⚡</div>
          <h3 className="text-lg font-semibold mb-2">Workflow Automation</h3>
          <p className="text-gray-600">Streamline approvals with customizable workflows and real-time notifications</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-4xl mb-4">📈</div>
          <h3 className="text-lg font-semibold mb-2">Business Insights</h3>
          <p className="text-gray-600">Track performance metrics and analyze your sales pipeline effectively</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link 
            href="/quotes/create"
            className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl mr-3">➕</span>
            <div>
              <div className="font-medium">New Quote</div>
              <div className="text-sm text-gray-600">Create a quote</div>
            </div>
          </Link>
          
          <Link 
            href="/quotes"
            className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl mr-3">📋</span>
            <div>
              <div className="font-medium">View Quotes</div>
              <div className="text-sm text-gray-600">Manage existing quotes</div>
            </div>
          </Link>
          
          <Link 
            href="/insights"
            className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl mr-3">📊</span>
            <div>
              <div className="font-medium">Insights</div>
              <div className="text-sm text-gray-600">View analytics</div>
            </div>
          </Link>
          
          <div className="flex items-center p-4 border rounded-lg bg-gray-50 opacity-60">
            <span className="text-2xl mr-3">🔧</span>
            <div>
              <div className="font-medium">Settings</div>
              <div className="text-sm text-gray-600">Coming soon</div>
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Getting Started</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">1</span>
            <span>Create your first quote with our intuitive quote builder</span>
          </div>
          <div className="flex items-center">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">2</span>
            <span>Configure approval workflows for your sales process</span>
          </div>
          <div className="flex items-center">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">3</span>
            <span>Track and analyze your quote performance in Insights</span>
          </div>
        </div>
      </div>
    </div>
  )
}