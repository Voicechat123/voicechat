import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Pobierz token z nagłówka
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Brak tokenu' })

  // Klient z uprawnieniami użytkownika — żeby sprawdzić kto pyta
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
  if (userError || !user) return res.status(401).json({ error: 'Nieautoryzowany' })

  // Klient z uprawnieniami admina — do usunięcia użytkownika
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Usuń dane użytkownika
  await supabaseAdmin.from('messages').delete().or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
  await supabaseAdmin.from('call_signals').delete().or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
  await supabaseAdmin.from('profiles').delete().eq('id', user.id)

  // Usuń konto z Auth — to jest kluczowe!
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (deleteError) return res.status(500).json({ error: deleteError.message })

  res.status(200).json({ success: true })
}
