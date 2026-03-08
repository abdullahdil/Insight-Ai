# Insight AI: Production Deployment Guide

Great! The Chrome Extension UI is built, the freemium logic works locally, and now it's time to **launch Insight AI to real users**.

To make this extension secure and capable of handling actual payments through Polar.sh, we must deploy the backend code I wrote for you into a real **Supabase** cloud database.

Follow these exact steps:

---

## Step 1: Create Your Supabase Project
1. Go to [Supabase.com](https://supabase.com/) and create a free account.
2. Click **New Project** and give it a name like "Insight-AI-Backend".
3. Once the project dashboard finishes loading (it takes a few minutes), look for the green **Connect** button at the top or go to **Project Settings > API**.
4. You will see two critical pieces of information:
   * **Project URL** (e.g., `https://abcdefg.supabase.co`)
   * **anon / public key** (A huge string of text starting with `eyJh...`)
5. Open `auth.js` in your extension code. Replace `YOUR_PROJECT_ID` with the actual URL, and replace `YOUR_ANON_KEY` with the long anon key.

---

## Step 2: Build the Database
1. Inside your Supabase Dashboard, go to the **SQL Editor** (it's the `</>` icon on the left sidebar).
2. Open the file I created for you at `backend/supabase/schema.sql`.
3. Copy all the text inside `schema.sql` and paste it into the Supabase SQL Editor.
4. Click **Run**.
5. *Success! You now have a secure `users` table that tracks emails, plans, and daily summary limits.*

---

## Step 3: Connect the Polar.sh Payment Webhook
*This is the script that tells your database when someone pays.*

1. You need to install the [Supabase CLI](https://supabase.com/docs/guides/cli) on your computer. If you have NodeJS installed, you can just run this in your terminal:
   ```bash
   npx supabase login
   npx supabase init
   ```
2. We need to deploy the edge function I wrote at `backend/supabase/functions/polar-webhook/index.ts`. Run this command:
   ```bash
   npx supabase functions deploy polar-webhook --project-ref YOUR_PROJECT_REF
   ```
   *(You can find your `PROJECT_REF` in your Project Settings > General. It's usually the middle part of your URL, like the `abcdefg` from step 1).*
3. Go to [Polar.sh](https://polar.sh/), create a Product (e.g., "Insight AI Pro"), and go to **Settings > Webhooks**.
4. Add a new Endpoint pointing to your newly deployed function:
   * `https://YOUR_PROJECT_REF.supabase.co/functions/v1/polar-webhook`
5. Polar will give you a **Webhook Secret** (starts with `whsec_...`). Go back to Supabase, find **Edge Functions > polar-webhook > Secrets**, and add a new secret named `POLAR_WEBHOOK_SECRET` with that value.

---

## Step 4: Finalize the Extension
1. Go to Polar.sh, find the Checkout Link for your "Pro" product, and copy its ID.
2. Open `popup.js`, search `YOUR_POLAR_PRODUCT_ID` and replace it with your real ID string.
3. Open `manifest.json`. You must replace `"client_id": "1234567890-example.apps.googleusercontent.com"` with a real OAuth Client ID from Google Cloud Console so users can seamlessly sign in natively via Chrome Identity. Follow [Google's guide here step-by-step](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth) to get one.

Once those are plugged in, you can ZIP the `d:\Extensions\youtube-ai-summary-extension` folder and submit it to the **Chrome Web Store Developer Dashboard**!
