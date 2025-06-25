// Test Supabase connection and check existing tables
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://hdcsxkxohgtpitfljqhx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkY3N4a3hvaGd0cGl0ZmxqcWh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NDQxOTQsImV4cCI6MjA2NjMyMDE5NH0.X7QxTT4_WhimIn-iDHrdfOXQ5UfHjL6kxYZs3Hde8Gw'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTables() {
  console.log('Testing Supabase connection...')
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('quotes').select('count').limit(1)
    
    if (error) {
      console.log('Error accessing quotes table:', error.message)
      if (error.message.includes('relation "public.quotes" does not exist')) {
        console.log('❌ Tables do not exist yet')
        return false
      }
    } else {
      console.log('✅ Quotes table exists!')
      
      // Check other tables
      const tables = ['quote_items', 'workflows', 'workflow_steps']
      for (const table of tables) {
        try {
          const { error: tableError } = await supabase.from(table).select('count').limit(1)
          if (tableError) {
            console.log(`❌ ${table} table missing:`, tableError.message)
          } else {
            console.log(`✅ ${table} table exists!`)
          }
        } catch (e) {
          console.log(`❌ ${table} table error:`, e.message)
        }
      }
      return true
    }
  } catch (e) {
    console.log('Connection error:', e.message)
    return false
  }
}

checkTables()