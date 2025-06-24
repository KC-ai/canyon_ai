export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
        <p className="text-gray-600">Analytics and performance metrics</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Conversion Rate</h3>
          <p className="text-3xl font-bold text-green-600">68%</p>
          <p className="text-sm text-gray-600">+5% from last month</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Avg. Quote Value</h3>
          <p className="text-3xl font-bold text-blue-600">$12,150</p>
          <p className="text-sm text-gray-600">+12% from last month</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Response Time</h3>
          <p className="text-3xl font-bold text-purple-600">2.4 hrs</p>
          <p className="text-sm text-gray-600">-0.5 hrs from last month</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Quote Performance</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span>Won Quotes</span>
            <div className="flex items-center gap-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '68%'}}></div>
              </div>
              <span className="text-sm text-gray-600">68%</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Pending Quotes</span>
            <div className="flex items-center gap-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{width: '22%'}}></div>
              </div>
              <span className="text-sm text-gray-600">22%</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Lost Quotes</span>
            <div className="flex items-center gap-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{width: '10%'}}></div>
              </div>
              <span className="text-sm text-gray-600">10%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}