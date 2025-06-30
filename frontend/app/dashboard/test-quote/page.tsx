'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function TestQuotePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const testQuoteCreation = async () => {
    setLoading(true);
    try {
      // Simple test quote
      const testQuote = {
        customer_name: "Test Company",
        customer_email: "test@example.com",
        customer_company: "Test Corp",
        title: "Test Quote",
        description: "This is a test quote",
        discount_percent: 25,
        items: [
          {
            name: "Test Product",
            description: "Test product description",
            quantity: 1,
            unit_price: 1000,
            discount_percent: 10
          }
        ]
      };

      const created = await apiClient.createQuote(testQuote);
      setResult(created);
      
      toast({
        title: "Success!",
        description: `Quote created with ID: ${created.id}`,
      });

      // Try to submit it
      const submitted = await apiClient.submitQuote(created.id);
      toast({
        title: "Submitted!",
        description: "Quote submitted for approval",
      });

    } catch (error: any) {
      console.error('Test failed:', error);
      toast({
        title: "Error",
        description: error.message || "Test failed",
        variant: "destructive",
      });
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Quote Creation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Click the button to test creating a quote through the API.</p>
          
          <Button 
            onClick={testQuoteCreation} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Testing..." : "Test Quote Creation"}
          </Button>

          {result && (
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}