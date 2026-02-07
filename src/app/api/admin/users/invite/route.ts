import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase with Service Role Key for admin actions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { full_name, email, role } = await request.json();

    if (!full_name || !email || !role) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || '';
    const redirectTo = `${origin}/auth/actualizar-password`;

    // 1. Invite user via Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name, role },
      redirectTo
    });

    if (authError) throw authError;

    // 2. Create profile in public.profiles
    // Note: We do this manually because admin.inviteUserByEmail doesn't trigger auth.onAuthStateChange in a way that's easy to catch for profiles sometimes,
    // and we want to ensure the full_name and role are set correctly.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        full_name,
        email, // Store email in profiles table too for easier access
        role,
        force_password_change: true
      });

    if (profileError) {
        // If profile fails, we might want to log it, but the user is already invited
        console.error('Error creating profile:', profileError);
    }

    return NextResponse.json({ success: true, user: authData.user });
  } catch (error: any) {
    console.error('Invitation error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
