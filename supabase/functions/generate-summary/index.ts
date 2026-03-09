import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, userId } = await req.json()
    
    const apiKey = Deno.env.get('GOOGLE_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    if (!apiKey) throw new Error('Google API key not configured.')
    if (!userId) throw new Error('User UUID not provided.')

    // Pass the user's JWT from the request header so RLS policies know WHO is deducting the credit
    const authHeader = req.headers.get('Authorization')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } }
    })

    // 1. Verify user has enough credits
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single()

    if (fetchError || !user) {
      throw new Error('User not found in database.')
    }
    
    if (user.credits <= 0) {
      throw new Error('Out of credits! Please purchase more summaries.')
    }

    // 2. Generate summary via Gemini
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4 }
      })
    })

    const data = await res.json()
    if (data.error) throw new Error(data.error.message || 'Gemini API Error')
    
    let summaryHtml = data.candidates[0].content.parts[0].text;

    // 3. Deduct 1 credit securely
    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: user.credits - 1 })
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to deduct credit:', updateError)
    }

    return new Response(
      JSON.stringify({ summaryHtml, creditsRemaining: user.credits - 1 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
