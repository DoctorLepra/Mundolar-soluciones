
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  // Get one quote to see the fields
  const { data, error } = await supabase.from('quotes').select('*').limit(1).single()
  if (error) {
    console.error('Error fetching quote:', error)
  } else {
    console.log('Sample Quote Record:', JSON.stringify(data, null, 2))
  }
}

check()
