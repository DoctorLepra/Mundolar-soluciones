const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bipjineolzejsdtgpygg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcGppbmVvbHplanNkdGdweWdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU1NDMxMCwiZXhwIjoyMDgzMTMwMzEwfQ.gVWCmBdNA3HpNd8trt0f2OHgsambheNwOqchwWZkrSE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExactQuery() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, description, image_url, position')
    .eq('status', 'Activo')
    .is('parent_id', null)
    .limit(4)
    .order('position', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Categories found with exact query:', data.length);
  data.forEach(cat => {
    console.log(`ID: ${cat.id}, Name: ${cat.name}, Position: ${cat.position}, Image: ${cat.image_url}`);
  });
}

checkExactQuery();
