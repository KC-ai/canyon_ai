-- Canyon.ai CPQ Database Creation (Tables Only)
-- Run this in your Supabase SQL Editor

-- Create workflows table first
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    quote_id UUID,
    status TEXT NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'active', 'completed', 'failed')),
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

-- Create quotes table
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    title TEXT NOT NULL,
    description TEXT,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'expired')),
    valid_until TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quote_items table
CREATE TABLE quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workflow_steps table
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    persona TEXT NOT NULL 
        CHECK (persona IN ('ae', 'deal_desk', 'cro', 'legal', 'finance', 'customer')),
    order_num INTEGER NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT true,
    max_processing_days INTEGER DEFAULT 3,
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected', 'skipped')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    comments TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add the circular foreign key constraint
ALTER TABLE workflows ADD CONSTRAINT fk_workflows_quote 
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE;