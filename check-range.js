const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bipjineolzejsdtgpygg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcGppbmVvbHplanNkdGdweWdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU1NDMxMCwiZXhwIjoyMDgzMTMwMzEwfQ.gVWCmBdNA3HpNd8trt0f2OHgsambheNwOqchwWZkrSE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPriceRange() {
  const { data, error } = await supabase
    .from('products')
    .select('price')
    .eq('status', 'Activo');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const prices = data.map(p => Number(p.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  console.log('Price Range:', { min, max, count: prices.length });
}

checkPriceRange();
