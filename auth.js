// SUPABASE SETUP INSTRUCTIONS:
// 1. Enter your Supabase REST URL and anon public key below.
// 2. These are used to communicate with the 'users' table you created via schema.sql.
const SUPABASE_URL = '';
const SUPABASE_KEY = '';

/**
 * Ensures a user exists in the Supabase 'users' table based on their email.
 * If they don't exist, it creates a free tier record for them. 
 */
async function syncUserAuth(email) {
  try {
    // 1. Check if user exists
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    if (data && data.length > 0) {
      return data[0]; // Returns existing user object (id, email, plan, usage_count, last_reset)
    }

    // 2. User does not exist, create a new FREE plan record
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ email: email, plan: 'free', credits: 5 })
    });

    const newUserData = await insertRes.json();
    return newUserData[0];

  } catch (e) {
    console.error("Supabase Auth Error:", e);
    return null;
  }
}

/**
 * Verifies the user has a positive credit balance to generate summaries using our proxy.
 * (Note: Actual deduction happens securely on the Supabase Edge Function).
 */
async function hasCredits(user) {
  // If they somehow have a pro plan that isn't credit-bound, let them through
  if (user.plan === 'pro' && user.credits === null) return { allowed: true, count: 'Unlimited' };
  
  if (user.credits > 0) {
    return { allowed: true, count: user.credits };
  } else {
    return { allowed: false, count: 0 };
  }
}

window.SupabaseAuth = {
  syncUserAuth,
  hasCredits
};
