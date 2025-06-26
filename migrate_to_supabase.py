#!/usr/bin/env python3
"""
Migration script to transfer data from JSON files to Supabase database.
Run this once after setting up the Supabase tables.
"""

import json
import os
from datetime import datetime
from typing import Dict, Any, List
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Supabase connection details
# You'll need to get these from your Supabase project settings
# SUPABASE_DB_URL = "postgresql://postgres.hdcsxkxohgtpitfljqhx:Horus@80u1der!@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# TODO: Replace with your actual Supabase database URL
# Get this from: Supabase Dashboard → Settings → Database → Connection string → URI
#Horus@80u1der!
SUPABASE_DB_URL = "postgresql://postgres:Horus%4080u1der%21@db.hdcsxkxohgtpitfljqhx.supabase.co:5432/postgres"

# Note: Special characters in password are URL-encoded:
# @ becomes %40
# ! becomes %21

# Data file paths
DATA_DIR = "/Users/kashyap/canyon_ai/backend/data"
QUOTES_FILE = os.path.join(DATA_DIR, "quotes.json")
QUOTE_ITEMS_FILE = os.path.join(DATA_DIR, "quote_items.json")
WORKFLOWS_FILE = os.path.join(DATA_DIR, "workflows.json")
WORKFLOW_STEPS_FILE = os.path.join(DATA_DIR, "workflow_steps.json")

def load_json_data(file_path: str) -> Dict[str, Any]:
    """Load data from JSON file."""
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        logger.info(f"Loaded {len(data)} records from {file_path}")
        return data
    except FileNotFoundError:
        logger.warning(f"File not found: {file_path}")
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in {file_path}: {e}")
        return {}

def connect_to_supabase():
    """Connect to Supabase database."""
    try:
        conn = psycopg2.connect(SUPABASE_DB_URL)
        logger.info("Connected to Supabase database")
        return conn
    except psycopg2.Error as e:
        logger.error(f"Failed to connect to Supabase: {e}")
        raise

def migrate_data(quotes_data, quote_items_data, workflows_data, workflow_steps_data):
    """Migrate data from JSON files to Supabase database"""
    try:
        # Connect to database
        conn = psycopg2.connect(SUPABASE_DB_URL)
        cursor = conn.cursor()
        logger.info("Connected to Supabase database")
        
        # Clear existing data in reverse dependency order
        logger.info("Clearing existing data...")
        cursor.execute("DELETE FROM workflow_steps")
        cursor.execute("DELETE FROM workflows")
        cursor.execute("DELETE FROM quote_items")
        cursor.execute("DELETE FROM quotes")
        conn.commit()
        
        # Step 1: Insert quotes WITHOUT workflow_id first
        logger.info("Inserting quotes (without workflow_id)...")
        quotes_inserted = 0
        for quote in quotes_data.values():
            try:
                cursor.execute("""
                    INSERT INTO quotes (
                        id, user_id, customer_name, customer_email, title, description, status, valid_until, total_amount, created_at, updated_at, workflow_id
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NULL)
                """, (
                    quote['id'],
                    quote.get('user_id'),
                    quote.get('customer_name'),
                    quote.get('customer_email'),
                    quote.get('title'),
                    quote.get('description'),
                    quote.get('status', 'draft'),
                    quote.get('valid_until'),
                    float(quote.get('total_amount', 0)),
                    quote.get('created_at'),
                    quote.get('updated_at')
                ))
                quotes_inserted += 1
            except Exception as e:
                logger.error(f"Failed to insert quote {quote['id']}: {e}")
        conn.commit()
        logger.info(f"Inserted {quotes_inserted} quotes")
        
        # Step 2: Insert workflows
        logger.info("Inserting workflows...")
        workflows_inserted = 0
        for workflow in workflows_data.values():
            try:
                cursor.execute("""
                    INSERT INTO workflows (
                        id, user_id, name, description, quote_id, status, is_active, trigger_amount, trigger_discount_percent, auto_start, allow_parallel_steps, require_all_approvals, started_at, completed_at, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    workflow['id'],
                    workflow.get('user_id'),
                    workflow.get('name', ''),
                    workflow.get('description'),
                    workflow.get('quote_id'),
                    workflow.get('status', 'draft'),
                    workflow.get('is_active', True),
                    float(workflow.get('trigger_amount')) if workflow.get('trigger_amount') else None,
                    float(workflow.get('trigger_discount_percent')) if workflow.get('trigger_discount_percent') else None,
                    workflow.get('auto_start', True),
                    workflow.get('allow_parallel_steps', False),
                    workflow.get('require_all_approvals', True),
                    workflow.get('started_at'),
                    workflow.get('completed_at'),
                    workflow.get('created_at'),
                    workflow.get('updated_at')
                ))
                workflows_inserted += 1
            except Exception as e:
                logger.error(f"Failed to insert workflow {workflow['id']}: {e}")
        conn.commit()
        logger.info(f"Inserted {workflows_inserted} workflows")
        
        # Step 3: Update quotes with workflow_id (only if quote exists)
        logger.info("Updating quotes with workflow_id...")
        quotes_updated = 0
        for workflow in workflows_data.values():
            try:
                # First check if the quote exists
                cursor.execute("SELECT id FROM quotes WHERE id = %s", (workflow.get('quote_id'),))
                if cursor.fetchone():
                    cursor.execute("""
                        UPDATE quotes 
                        SET workflow_id = %s 
                        WHERE id = %s
                    """, (workflow['id'], workflow['quote_id']))
                    quotes_updated += 1
                else:
                    logger.warning(f"Quote {workflow.get('quote_id')} not found for workflow {workflow['id']}")
            except Exception as e:
                logger.error(f"Failed to update quote {workflow.get('quote_id')}: {e}")
        conn.commit()
        logger.info(f"Updated {quotes_updated} quotes with workflow_id")
        
        # Step 4: Insert quote items (only if quote exists)
        logger.info("Inserting quote items...")
        items_inserted = 0
        for item in quote_items_data.values():
            try:
                # Check if the quote exists first
                cursor.execute("SELECT id FROM quotes WHERE id = %s", (item['quote_id'],))
                if cursor.fetchone():
                    cursor.execute("""
                        INSERT INTO quote_items (
                            id, quote_id, name, description, quantity, unit_price, discount_percent, discount_amount, created_at, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        item['id'],
                        item['quote_id'],
                        item.get('name'),
                        item.get('description'),
                        int(item.get('quantity', 1)),
                        float(item.get('unit_price', 0)),
                        float(item.get('discount_percent', 0)),
                        float(item.get('discount_amount', 0)),
                        item.get('created_at'),
                        item.get('updated_at')
                    ))
                    items_inserted += 1
                else:
                    logger.warning(f"Quote {item['quote_id']} not found for quote item {item['id']}")
            except Exception as e:
                logger.error(f"Failed to insert quote item {item['id']}: {e}")
        conn.commit()
        logger.info(f"Inserted {items_inserted} quote items")
        
        # Step 5: Insert workflow steps (only if workflow exists)
        logger.info("Inserting workflow steps...")
        steps_inserted = 0
        for step in workflow_steps_data.values():
            try:
                # Check if the workflow exists first
                cursor.execute("SELECT id FROM workflows WHERE id = %s", (step['workflow_id'],))
                if cursor.fetchone():
                    cursor.execute("""
                        INSERT INTO workflow_steps (
                            id, workflow_id, name, description, persona, "order", is_required, auto_approve_threshold, escalation_threshold, max_processing_days, status, assigned_user_id, assigned_at, completed_at, completed_by, action_taken, comments, rejection_reason, created_at, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        step['id'],
                        step['workflow_id'],
                        step.get('name', ''),
                        step.get('description'),
                        step.get('persona'),
                        int(step.get('order', 1)),
                        step.get('is_required', True),
                        float(step.get('auto_approve_threshold')) if step.get('auto_approve_threshold') else None,
                        float(step.get('escalation_threshold')) if step.get('escalation_threshold') else None,
                        int(step.get('max_processing_days', 3)),
                        step.get('status', 'pending'),
                        step.get('assigned_user_id'),
                        step.get('assigned_at'),
                        step.get('completed_at'),
                        step.get('completed_by'),
                        step.get('action_taken'),
                        step.get('comments'),
                        step.get('rejection_reason'),
                        step.get('created_at'),
                        step.get('updated_at')
                    ))
                    steps_inserted += 1
                else:
                    logger.warning(f"Workflow {step['workflow_id']} not found for workflow step {step['id']}")
            except Exception as e:
                logger.error(f"Failed to insert workflow step {step['id']}: {e}")
        conn.commit()
        logger.info(f"Inserted {steps_inserted} workflow steps")
        
        # Print summary
        print("\n" + "="*50)
        print("MIGRATION SUMMARY")
        print("="*50)
        print(f"Quotes migrated: {quotes_inserted}")
        print(f"Quote items migrated: {items_inserted}")
        print(f"Workflows migrated: {workflows_inserted}")
        print(f"Workflow steps migrated: {steps_inserted}")
        print("="*50)
        
        cursor.close()
        conn.close()
        logger.info("Migration completed successfully!")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise

def main():
    """Main function to run the migration"""
    logger.info("Starting data migration from JSON to Supabase")
    
    # Load data from JSON files
    try:
        with open(QUOTES_FILE, 'r') as f:
            quotes_data = json.load(f)
        logger.info(f"Loaded {len(quotes_data)} records from {QUOTES_FILE}")
        
        with open(QUOTE_ITEMS_FILE, 'r') as f:
            quote_items_data = json.load(f)
        logger.info(f"Loaded {len(quote_items_data)} records from {QUOTE_ITEMS_FILE}")
        
        with open(WORKFLOWS_FILE, 'r') as f:
            workflows_data = json.load(f)
        logger.info(f"Loaded {len(workflows_data)} records from {WORKFLOWS_FILE}")
        
        with open(WORKFLOW_STEPS_FILE, 'r') as f:
            workflow_steps_data = json.load(f)
        logger.info(f"Loaded {len(workflow_steps_data)} records from {WORKFLOW_STEPS_FILE}")
        
    except FileNotFoundError as e:
        logger.error(f"Data file not found: {e}")
        return
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in data file: {e}")
        return
    
    # Confirm before proceeding
    print("WARNING: This will clear all existing data in Supabase tables!")
    print("Make sure you have:")
    print("1. Updated SUPABASE_DB_URL with your actual connection string")
    print("2. Backed up any existing data")
    print()
    
    response = input("Do you want to continue? (yes/no): ")
    if response.lower() != 'yes':
        print("Migration cancelled.")
        return
    
    migrate_data(quotes_data, quote_items_data, workflows_data, workflow_steps_data)

if __name__ == "__main__":
    main()