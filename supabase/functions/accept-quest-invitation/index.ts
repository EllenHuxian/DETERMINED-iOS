import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { token, userId } = await req.json();

  if (!token) {
    return new Response(JSON.stringify({ error: 'Token required' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  // Fetch invitation with quest and inviter profile details
  const { data: invitation, error } = await supabaseAdmin
    .from('quest_invitations')
    .select(`
      *,
      quest:quests (
        id, habit_name, target_days, bounty, status,
        inviter:profiles!inviter_id (username)
      )
    `)
    .eq('token', token)
    .single();

  if (error || !invitation) {
    return new Response(JSON.stringify({ error: 'Invalid invitation link' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404,
    });
  }

  if (invitation.status === 'accepted') {
    return new Response(JSON.stringify({ error: 'This challenge has already been accepted' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  // No userId = just fetching details for the acceptance screen
  if (!userId) {
    return new Response(JSON.stringify({ invitation }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Accept: update quest owner and activate it
  const { error: questError } = await supabaseAdmin
    .from('quests')
    .update({ owner_id: userId, status: 'active' })
    .eq('id', invitation.quest_id);

  if (questError) {
    return new Response(JSON.stringify({ error: questError.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  await supabaseAdmin
    .from('quest_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id);

  return new Response(JSON.stringify({ success: true, questId: invitation.quest_id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
