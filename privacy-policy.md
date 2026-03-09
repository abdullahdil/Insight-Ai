# Privacy Policy for Insight AI

**Last Updated:** March 2026

Insight AI ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how your information is collected, used, and safeguarded when you use the Insight AI Chrome Extension (the "Extension").

## 1. Information We Collect

### A. Authentication Data
We use the Chrome Identity API to securely identify you for billing and credit management. 
*   **Email Address:** We automatically collect the email address associated with your active Google Chrome profile. We do not require, collect, or store passwords.
*   **Unique Identifier:** We map your email to a unique UUID in our secure database to manage your account balance.

### B. Usage Data
*   **Credit Balance:** We track the number of AI summaries you generate to securely deduct from your available credits or unlimited Pro access flag.
*   **API Keys:** If you utilize the "Bring Your Own Key" (BYOK) advanced feature, your Google Gemini or OpenAI API keys are strictly saved locally to your device's `chrome.storage.local`. **We never transmit your personal API keys to our servers.**

### C. Content Data
*   **YouTube Transcripts:** When you click "Generate Summary," the text transcript of the active YouTube video is sent to our Supabase Edge Function to be processed by a Large Language Model (Google Gemini). This text is temporarily held in memory strictly for the duration of the generation process and is **never logged, saved, or used to train models**.

## 2. How We Use Your Information

We use the minimal information collected exclusively to:
*   Identify your account to track and manage your "Pay-As-You-Go" summary credits.
*   Upgrade your account plan when a purchase is verified through Polar.sh.
*   Provide the core functionality of summarization.

## 3. Third-Party Services
We utilize the following third-party infrastructure:
*   **Supabase:** Our encrypted PostgreSQL database and Edge Functions platform.
*   **Polar.sh:** Our secure payment infrastructure. Payments are processed securely on their domain. We do not see or store your credit card information.
*   **Google Gemini (API):** Used strictly as a pass-through engine to generate the summaries.

## 4. Data Security
All communications between the Extension and our database utilize secure HTTPS encryption. Your records are protected strictly by Supabase Row Level Security (RLS) policies, ensuring no user can access or modify another user's credit balance.

## 5. Contact Us
If you have questions or concerns regarding this Privacy Policy, please contact the developer via the support email listed on the Chrome Web Store listing.
