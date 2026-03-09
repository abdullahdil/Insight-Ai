import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

// Environment variables provided by Supabase Edge Functions automatically
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") as string;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

// The webhook secret from your Polar.sh settings
const POLAR_WEBHOOK_SECRET = Deno.env.get("POLAR_WEBHOOK_SECRET") as string;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const rawBody = await req.text();
    // Polar uses standardwebhooks (svix) for signature verification
    const signature = req.headers.get("webhook-signature");
    const timestamp = req.headers.get("webhook-timestamp");
    const id = req.headers.get("webhook-id");

    if (!signature || !timestamp || !id) {
      return new Response("Missing Webhook Headers", { status: 400 });
    }

    // Manual basic validation via crypto HMAC (StandardSvix format: v1,...) is available via the svix package,
    // For simplicity, we assume you verify using standard Webhook lib in production.
    // Deno uses esm.sh to import standardwebhooks:
    const { Webhook } = await import("https://esm.sh/standardwebhooks@1.0.0");
    const wh = new Webhook(POLAR_WEBHOOK_SECRET);

    // This will throw if the signature is invalid
    const payload = wh.verify(rawBody, {
      "webhook-id": id,
      "webhook-signature": signature,
      "webhook-timestamp": timestamp,
    }) as any;

    const { type, data } = payload;

    // We expect the Extension to pass the Supabase `userId` into the Polar checkout link as `metadata.userId`
    // Example Polar Checkout URL generation string: `https://polar.sh/checkout/... ?metadata[userId]=YOUR_USER_ID`
    const userId = data.metadata?.userId || data.customer?.metadata?.userId;

    if (!userId) {
      console.log("Ignored payload: No userId found in Polar metadata.");
      return new Response("No userId in metadata", { status: 200 });
    }

    if (type === 'order.created') {
      // Determine credits to add based on price (in cents). $4 = 50 credits.
      const amount = data.amount || 0;
      let creditsToAdd = 50;

      if (amount >= 1000) {
        creditsToAdd = 500; // $10 pack
      } else if (amount >= 400) {
        creditsToAdd = 50; // $4 pack
      }

      // Fetch the user's current balance so we can mathematically add to it
      const { data: userRow } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

      const currentBalance = userRow?.credits || 0;

      const { error } = await supabase
        .from('users')
        .update({ credits: currentBalance + creditsToAdd })
        .eq('id', userId);

      if (error) throw error;
      console.log(`Successfully added ${creditsToAdd} credits to user ${userId}`);

    } else if (type === 'subscription.created') {
      // Fallback or legacy subscription parsing to just give a chunk of credits per month
      const { data: userRow } = await supabase.from('users').select('credits').eq('id', userId).single();
      const currentBalance = userRow?.credits || 0;
      await supabase.from('users').update({ credits: currentBalance + 100, plan: 'pro' }).eq('id', userId);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("Webhook Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});
