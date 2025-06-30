-- Canyon CPQ Database Setup
-- Run this script in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE persona_type AS ENUM ('ae', 'deal_desk', 'cro', 'legal', 'finance', 'customer');
CREATE TYPE step_status AS ENUM ('pending', 'approved', 'rejected', 'skipped');
CREATE TYPE quote_status AS ENUM (
    'draft', 
    'draft_reopened',
    'pending_deal_desk',
    'pending_cro', 
    'pending_legal',
    'pending_finance',
    'pending_customer',
    'approved',
    'rejected', 
    'terminated'
);

-- Create users table (if not exists)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    persona persona_type NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quotes table with CPQ fields
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_company TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status quote_status DEFAULT 'draft',
    discount_percent DECIMAL(5,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    valid_until DATE,
    
    -- Termination tracking
    terminated_at TIMESTAMPTZ,
    termination_reason TEXT,
    terminated_by UUID REFERENCES users(id),
    
    -- Workflow reference
    current_workflow_id UUID,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quote items table
CREATE TABLE IF NOT EXISTS quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    total_price DECIMAL(12,2) GENERATED ALWAYS AS (
        quantity * unit_price * (1 - COALESCE(discount_percent, 0) / 100)
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workflow steps table
CREATE TABLE IF NOT EXISTS workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    persona persona_type NOT NULL,
    status step_status DEFAULT 'pending',
    assigned_to UUID REFERENCES users(id),
    
    -- Approval tracking
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    comments TEXT,
    
    -- Auto-approval support
    auto_approved BOOLEAN DEFAULT FALSE,
    
    -- Ensure sequential approvals
    can_approve BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint on quote and step order
    UNIQUE(quote_id, step_order)
);

-- Create quote actions audit table
CREATE TABLE IF NOT EXISTS quote_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'submitted', 'approved', 'rejected', 'terminated', 'reopened'
    performed_by UUID NOT NULL REFERENCES users(id),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    details JSONB,
    comments TEXT
);

-- Create indexes for performance
CREATE INDEX idx_quotes_user_id ON quotes(user_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX idx_workflow_steps_quote_id ON workflow_steps(quote_id);
CREATE INDEX idx_workflow_steps_status ON workflow_steps(status);
CREATE INDEX idx_quote_actions_quote_id ON quote_actions(quote_id);

-- Create function to update timestamps
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

CREATE TRIGGER update_workflow_steps_updated_at BEFORE UPDATE ON workflow_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate quote total
CREATE OR REPLACE FUNCTION calculate_quote_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE quotes 
    SET total_amount = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM quote_items
        WHERE quote_id = NEW.quote_id
    )
    WHERE id = NEW.quote_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update quote total when items change
CREATE TRIGGER update_quote_total_on_item_change
AFTER INSERT OR UPDATE OR DELETE ON quote_items
FOR EACH ROW EXECUTE FUNCTION calculate_quote_total();

-- Create function to handle sequential approval logic
CREATE OR REPLACE FUNCTION check_sequential_approval()
RETURNS TRIGGER AS $$
DECLARE
    prev_step_status step_status;
BEGIN
    -- For the first step (step_order = 1), always allow approval
    IF NEW.step_order = 1 THEN
        NEW.can_approve = TRUE;
        RETURN NEW;
    END IF;
    
    -- Check if previous step is approved
    SELECT status INTO prev_step_status
    FROM workflow_steps
    WHERE quote_id = NEW.quote_id 
    AND step_order = NEW.step_order - 1;
    
    -- Only allow approval if previous step is approved or skipped
    IF prev_step_status IN ('approved', 'skipped') THEN
        NEW.can_approve = TRUE;
    ELSE
        NEW.can_approve = FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sequential approval
CREATE TRIGGER enforce_sequential_approval
BEFORE INSERT OR UPDATE ON workflow_steps
FOR EACH ROW EXECUTE FUNCTION check_sequential_approval();

-- Create function to auto-approve customer step
CREATE OR REPLACE FUNCTION auto_approve_customer_step()
RETURNS TRIGGER AS $$
DECLARE
    all_internal_approved BOOLEAN;
    customer_step_id UUID;
BEGIN
    -- Only proceed if this is an approval
    IF NEW.status != 'approved' OR OLD.status = 'approved' THEN
        RETURN NEW;
    END IF;
    
    -- Check if all non-customer steps are approved
    SELECT NOT EXISTS (
        SELECT 1
        FROM workflow_steps
        WHERE quote_id = NEW.quote_id
        AND persona != 'customer'
        AND status NOT IN ('approved', 'skipped')
    ) INTO all_internal_approved;
    
    -- If all internal steps are approved, auto-approve customer step
    IF all_internal_approved THEN
        UPDATE workflow_steps
        SET status = 'approved',
            auto_approved = TRUE,
            approved_at = NOW(),
            comments = 'Auto-approved: All internal approvals completed'
        WHERE quote_id = NEW.quote_id
        AND persona = 'customer'
        AND status = 'pending'
        RETURNING id INTO customer_step_id;
        
        -- Update quote status if customer step was approved
        IF customer_step_id IS NOT NULL THEN
            UPDATE quotes
            SET status = 'approved'
            WHERE id = NEW.quote_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-approval
CREATE TRIGGER auto_approve_customer_on_internal_completion
AFTER UPDATE ON workflow_steps
FOR EACH ROW EXECUTE FUNCTION auto_approve_customer_step();

-- Insert sample users for testing
INSERT INTO users (email, full_name, persona) VALUES
    ('ae@example.com', 'Alex Executive', 'ae'),
    ('dd@example.com', 'Dana Desk', 'deal_desk'),
    ('cro@example.com', 'Charlie Revenue', 'cro'),
    ('legal@example.com', 'Larry Legal', 'legal'),
    ('finance@example.com', 'Fiona Finance', 'finance'),
    ('customer@example.com', 'Casey Customer', 'customer')
ON CONFLICT (email) DO NOTHING;

-- Create RLS (Row Level Security) policies
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_actions ENABLE ROW LEVEL SECURITY;

-- Quotes: Users can see their own quotes and quotes they need to approve
CREATE POLICY "Users can view their own quotes" ON quotes
    FOR SELECT USING (
        user_id = auth.uid() OR
        id IN (
            SELECT quote_id FROM workflow_steps 
            WHERE assigned_to = auth.uid()
        )
    );

CREATE POLICY "Users can create quotes" ON quotes
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own quotes" ON quotes
    FOR UPDATE USING (user_id = auth.uid());

-- Quote items: Inherit from quote permissions
CREATE POLICY "Users can view quote items" ON quote_items
    FOR SELECT USING (
        quote_id IN (
            SELECT id FROM quotes WHERE user_id = auth.uid()
        ) OR
        quote_id IN (
            SELECT quote_id FROM workflow_steps WHERE assigned_to = auth.uid()
        )
    );

-- Workflow steps: Users can see steps for quotes they're involved with
CREATE POLICY "Users can view workflow steps" ON workflow_steps
    FOR SELECT USING (
        assigned_to = auth.uid() OR
        quote_id IN (SELECT id FROM quotes WHERE user_id = auth.uid())
    );

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;