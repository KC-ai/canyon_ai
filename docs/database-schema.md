# Database Schema – Supabase PostgreSQL

## Core Tables

### `users` (Managed by Supabase Auth)
```sql
-- Automatically created by Supabase Auth
id: UUID (Primary Key)
email: TEXT
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

---

### `quotes`
```sql
id: UUID (Primary Key, Default: gen_random_uuid())
customer_name: TEXT NOT NULL
customer_email: TEXT
discount_percentage: DECIMAL(5,2) DEFAULT 0
total_amount: DECIMAL(12,2) NOT NULL
status: TEXT NOT NULL DEFAULT 'draft' 
  CHECK (status IN ('draft', 'in_approval', 'approved', 'rejected', 'sent'))
created_by: UUID REFERENCES auth.users(id) NOT NULL
notes: TEXT
created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

---

### `quote_items`
```sql
id: UUID (Primary Key, Default: gen_random_uuid())
quote_id: UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL
product_name: TEXT NOT NULL
quantity: INTEGER NOT NULL CHECK (quantity > 0)
unit_price: DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0)
discount_percentage: DECIMAL(5,2) DEFAULT 0
total_price: DECIMAL(12,2) NOT NULL
created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

---

### `approval_workflows`
```sql
id: UUID (Primary Key, Default: gen_random_uuid())
quote_id: UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL
name: TEXT NOT NULL
current_step: INTEGER DEFAULT 0
status: TEXT NOT NULL DEFAULT 'pending' 
  CHECK (status IN ('pending', 'approved', 'rejected'))
created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

---

### `workflow_steps`
```sql
id: UUID (Primary Key, Default: gen_random_uuid())
workflow_id: UUID REFERENCES approval_workflows(id) ON DELETE CASCADE NOT NULL
persona: TEXT NOT NULL 
  CHECK (persona IN ('AE', 'Deal Desk', 'CRO', 'Legal', 'Finance'))
order_index: INTEGER NOT NULL
status: TEXT NOT NULL DEFAULT 'pending' 
  CHECK (status IN ('pending', 'approved', 'rejected', 'skipped'))
required: BOOLEAN NOT NULL DEFAULT true
approved_by: UUID REFERENCES auth.users(id)
approved_at: TIMESTAMP WITH TIME ZONE
notes: TEXT
created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

---

## Indexes for Performance

```sql
CREATE INDEX idx_quotes_created_by ON quotes(created_by);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX idx_workflows_quote_id ON approval_workflows(quote_id);
CREATE INDEX idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);
CREATE INDEX idx_workflow_steps_order ON workflow_steps(workflow_id, order_index);
```

---

## Row Level Security (RLS) Policies

```sql
-- Users can only access their own quotes
CREATE POLICY "quotes_policy" ON quotes FOR ALL USING (auth.uid() = created_by);

-- Users can access quote_items through quotes they own
CREATE POLICY "quote_items_policy" ON quote_items FOR ALL USING (
  EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.created_by = auth.uid())
);

-- Similar policies for workflows and workflow_steps
```

---

## Real-time Subscriptions

- `quotes` table changes  
- `workflow_steps` table changes  
- `approval_workflows` table changes  
- User-specific channels for notifications  

---

## Data Relationships

- One User → Many Quotes  
- One Quote → Many Quote Items  
- One Quote → One Approval Workflow  
- One Approval Workflow → Many Workflow Steps  
- One User → Many Workflow Steps (as approver)