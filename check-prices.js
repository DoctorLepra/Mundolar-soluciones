const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bipjineolzejsdtgpygg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcGppbmVvbHplanNkdGdweWdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU1NDMxMCwiZXhwIjoyMDgzMTMwMzEwfQ.gVWCmBdNA3HpNd8trt0f2OHgsambheNwOqchwWZkrSE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, original_price, price_with_iva')
    .ilike('name', '%Radio%prueba%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Products found:', JSON.stringify(data, null, 2));
}

checkProducts();
