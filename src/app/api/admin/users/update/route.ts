import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { id, full_name, role } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }

    // Update profile in database
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        full_name, 
        role
      })
      .eq('id', id);

    if (profileError) throw profileError;

    return NextResponse.json({ message: 'Usuario actualizado con éxito' });
  } catch (error: any) {
    console.error('Update User Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
