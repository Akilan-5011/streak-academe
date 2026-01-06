import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, name, adminCode } = await req.json();
    
    console.log('Admin registration attempt for:', email);

    // Validate admin code
    const validAdminCode = Deno.env.get('ADMIN_SECRET_CODE');
    if (!adminCode || adminCode !== validAdminCode) {
      console.log('Invalid admin code provided');
      return new Response(
        JSON.stringify({ error: 'Invalid admin code' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create the user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (authError) {
      console.error('Auth error:', authError.message);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user?.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User creation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created with ID:', userId);

    // Update the user_roles table to set admin role
    // First, check if the role already exists (from trigger)
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id, role')
      .eq('user_id', userId)
      .single();

    if (existingRole) {
      // Update existing role to admin
      const { error: updateError } = await supabaseAdmin
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Role update error:', updateError.message);
      } else {
        console.log('Role updated to admin for user:', userId);
      }
    } else {
      // Insert admin role
      const { error: insertError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (insertError) {
        console.error('Role insert error:', insertError.message);
      } else {
        console.log('Admin role inserted for user:', userId);
      }
    }

    return new Response(
      JSON.stringify({ success: true, userId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
