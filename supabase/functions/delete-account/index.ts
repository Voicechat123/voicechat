import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Pobierz token użytkownika z nagłówka
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Brak autoryzacji' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Klient z tokenem użytkownika — żeby sprawdzić kim jest
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Nie zalogowany' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Klient admin — do usunięcia konta
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Usuń wiadomości
    await supabaseAdmin.from('messages').delete()
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)

    // Usuń sygnały połączeń
    await supabaseAdmin.from('call_signals').delete()
      .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)

    // Usuń avatar ze storage
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('avatar_url').eq('id', user.id).single()
    if (profile?.avatar_url) {
      const path = profile.avatar_url.split('/avatars/')[1]
      if (path) await supabaseAdmin.storage.from('avatars').remove([path])
    }

    // Usuń profil
    await supabaseAdmin.from('profiles').delete().eq('id', user.id)

    // Usuń konto z Auth — to jest kluczowe!
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (deleteError) throw deleteError

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
