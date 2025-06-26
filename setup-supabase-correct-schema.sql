-- Canyon.ai CPQ Database Setup for Supabase
-- Based on /docs/database-schema.md - Correct Schema
-- Run this in your Supabase SQL Editor

-- Drop tables in dependency order if they exist
DROP TABLE IF EXISTS workflow_steps CASCADE;
DROP TABLE IF EXISTS approval_workflows CASCADE;
DROP TABLE IF EXISTS quote_items CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;

-- Create quotes table
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'in_approval', 'approved', 'rejected', 'sent')),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quote_items table
CREATE TABLE quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    total_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create approval_workflows table
CREATE TABLE approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    current_step INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workflow_steps table
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES approval_workflows(id) ON DELETE CASCADE NOT NULL,
    persona TEXT NOT NULL 
        CHECK (persona IN ('AE', 'Deal Desk', 'CRO', 'Legal', 'Finance')),
    order_index INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
    required BOOLEAN NOT NULL DEFAULT true,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_quotes_created_by ON quotes(created_by);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX idx_workflows_quote_id ON approval_workflows(quote_id);
CREATE INDEX idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);
CREATE INDEX idx_workflow_steps_order ON workflow_steps(workflow_id, order_index);

-- Enable Row Level Security
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "quotes_policy" ON quotes 
    FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "quote_items_policy" ON quote_items 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM quotes 
            WHERE quotes.id = quote_items.quote_id 
            AND quotes.created_by = auth.uid()
        )
    );

CREATE POLICY "approval_workflows_policy" ON approval_workflows 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM quotes 
            WHERE quotes.id = approval_workflows.quote_id 
            AND quotes.created_by = auth.uid()
        )
    );

CREATE POLICY "workflow_steps_policy" ON workflow_steps 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM approval_workflows 
            JOIN quotes ON quotes.id = approval_workflows.quote_id
            WHERE approval_workflows.id = workflow_steps.workflow_id 
            AND quotes.created_by = auth.uid()
        )
    );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_workflows_updated_at BEFORE UPDATE ON approval_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable real-time for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE quote_items;
ALTER PUBLICATION supabase_realtime ADD TABLE approval_workflows;
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_steps;