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
      body: JSON.stringify({ email: email, plan: 'free', usage_count: 0 })
    });

    const newUserData = await insertRes.json();
    return newUserData[0];

  } catch (e) {
    console.error("Supabase Auth Error:", e);
    return null;
  }
}

/**
 * Checks and increments the user's daily usage limit.
 * Resets daily count automatically if 24 hours have passed.
 */
async function checkAndIncrementUsage(user) {
  if (user.plan === 'pro') return { allowed: true };

  const now = new Date();
  const lastReset = new Date(user.last_reset || now);
  const hoursSinceReset = Math.abs(now - lastReset) / 36e5;

  let newUsageCount = user.usage_count;

  // Reset limits daily
  if (hoursSinceReset >= 24) {
    newUsageCount = 0;
  }

  if (newUsageCount >= 3) {
    return { allowed: false, count: 3 };
  }

  // Increment usage on Supabase
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(user.email)}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usage_count: newUsageCount + 1,
        last_reset: hoursSinceReset >= 24 ? now.toISOString() : user.last_reset
      })
    });
    return { allowed: true, count: newUsageCount + 1 };
  } catch (e) {
    console.error("Supabase limit check error:", e);
    return { allowed: false, count: newUsageCount };
  }
}

window.SupabaseAuth = {
  syncUserAuth,
  checkAndIncrementUsage
};
