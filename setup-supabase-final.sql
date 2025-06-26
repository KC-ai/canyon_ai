-- Canyon.ai CPQ Database Setup for Supabase - FINAL VERSION
-- Based on actual codebase analysis from JSON data and TypeScript types
-- Run this in your Supabase SQL Editor

-- Drop tables in dependency order if they exist
DROP TABLE IF EXISTS workflow_steps CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;
DROP TABLE IF EXISTS quote_items CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;

-- Create quotes table
-- Based on /frontend/types/quotes.ts and /backend/data/quotes.json
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,  -- Using TEXT to match JSON data
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'expired')),
    valid_until TIMESTAMP WITH TIME ZONE,
    total_amount DECIMAL(12,2) NOT NULL,
    workflow_id UUID,  -- Will reference workflows table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quote_items table  
-- Based on /frontend/types/quotes.ts and /backend/data/quote_items.json
CREATE TABLE quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,  -- Field name from actual data
    description TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workflows table (NOT approval_workflows)
-- Based on /frontend/types/workflows.ts and /backend/data/workflows.json
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,  -- Using TEXT to match JSON data
    name TEXT NOT NULL,
    description TEXT,
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'active', 'completed', 'cancelled', 'failed')),
    is_active BOOLEAN DEFAULT true,
    trigger_amount DECIMAL(12,2),
    trigger_discount_percent DECIMAL(5,2),
    auto_start BOOLEAN DEFAULT true,
    allow_parallel_steps BOOLEAN DEFAULT false,
    require_all_approvals BOOLEAN DEFAULT true,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workflow_steps table
-- Based on /frontend/types/workflows.ts and /backend/data/workflow_steps.json
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    persona TEXT NOT NULL 
        CHECK (persona IN ('ae', 'deal_desk', 'cro', 'legal', 'finance', 'customer')),
    "order" INTEGER NOT NULL,  -- Using "order" to match actual data (order is reserved keyword)
    is_required BOOLEAN NOT NULL DEFAULT true,
    auto_approve_threshold DECIMAL(12,2),
    escalation_threshold DECIMAL(12,2),
    max_processing_days INTEGER DEFAULT 3,
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected', 'skipped')),
    assigned_user_id TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by TEXT,
    action_taken TEXT CHECK (action_taken IN ('approve', 'reject', 'request_changes', 'escalate')),
    comments TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add the foreign key constraint from quotes to workflows
ALTER TABLE quotes ADD CONSTRAINT fk_quotes_workflow 
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_quotes_user_id ON quotes(user_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_workflow_id ON quotes(workflow_id);
CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX idx_workflows_quote_id ON workflows(quote_id);
CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);
CREATE INDEX idx_workflow_steps_order ON workflow_steps(workflow_id, "order");

-- Enable Row Level Security
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (using user_id field since we're using TEXT, not auth.users references)
-- For production, you'll need to modify these to work with Supabase auth
CREATE POLICY "quotes_policy" ON quotes 
    FOR ALL USING (true);  -- Temporarily allow all access for migration

CREATE POLICY "quote_items_policy" ON quote_items 
    FOR ALL USING (true);  -- Temporarily allow all access for migration

CREATE POLICY "workflows_policy" ON workflows 
    FOR ALL USING (true);  -- Temporarily allow all access for migration

CREATE POLICY "workflow_steps_policy" ON workflow_steps 
    FOR ALL USING (true);  -- Temporarily allow all access for migration

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

CREATE TRIGGER update_quote_items_updated_at BEFORE UPDATE ON quote_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_steps_updated_at BEFORE UPDATE ON workflow_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable real-time for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE quote_items;
ALTER PUBLICATION supabase_realtime ADD TABLE workflows;
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_steps;