document.addEventListener('DOMContentLoaded', () => {
  const apiKeyContainer = document.getElementById('api-key-container');
  const mainContainer = document.getElementById('main-container');
  const apiKeyInput = document.getElementById('api-key');
  const saveApiKeyBtn = document.getElementById('save-api-key');
  const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
  const apiProviderSelect = document.getElementById('api-provider');

  const generateBtn = document.getElementById('generate-btn');
  const generateText = document.getElementById('generate-text');
  const settingsBtn = document.getElementById('settings-btn');

  const loadingDiv = document.getElementById('loading');
  const progressBar = document.getElementById('progress-bar');
  const loadingStatus = document.getElementById('loading-status');

  const errorBox = document.getElementById('error-message');
  const errorText = errorBox.querySelector('span');

  const planBadge = document.getElementById('plan-badge');
  const quotaText = document.getElementById('quota-text');
  const upgradeCard = document.getElementById('upgrade-card');
  const upgradeBtn = document.getElementById('upgrade-btn');

  let hasStoredKey = false;
  let simulatedProgressInterval;

  let currentUser = null;
  let isAuthLoading = true;

  // 1. Initialize Authentication automatically via Chrome Identity
  try {
    if (chrome.identity && chrome.identity.getProfileUserInfo) {
      chrome.identity.getProfileUserInfo(async (userInfo) => {
        let authEmail = userInfo?.email;

        // --- LOCAL DEVELOPMENT FALLBACK ---
        // If the extension isn't published or connected to a Google Cloud OAuth client,
        // Chrome restricts access to the email. We fallback to a mock local ID for testing.
        if (!authEmail) {
          const { localDevId } = await chrome.storage.local.get('localDevId');
          if (!localDevId) {
            const newId = 'guest_' + Math.random().toString(36).substr(2, 9) + '@local.test';
            await chrome.storage.local.set({ localDevId: newId });
            authEmail = newId;
          } else {
            authEmail = localDevId;
          }
        }

        if (authEmail) {
          currentUser = await window.SupabaseAuth.syncUserAuth(authEmail);
          if (currentUser) {
            updatePlanUI();
          } else {
            planBadge.textContent = 'Backend Error';
            planBadge.classList.remove('hidden');
            showError('Database Error: Have you run schema.sql in Supabase yet?');
          }
        }
        isAuthLoading = false;
      });
    } else {
      isAuthLoading = false;
    }
  } catch (e) {
    isAuthLoading = false;
  }

  function updatePlanUI() {
    planBadge.classList.remove('hidden', 'badge-free', 'badge-pro');
    if (currentUser.plan === 'pro') {
      planBadge.classList.add('badge-pro');
      planBadge.textContent = 'Pro Plan';
      quotaText.classList.add('hidden');
    } else {
      planBadge.classList.add('badge-free');
      planBadge.textContent = 'Free Plan';
      quotaText.textContent = `${currentUser.usage_count} / 3 Free Summaries Used Today`;
      quotaText.classList.remove('hidden');
    }
    // Store plan so summary page can restrict Pro features
    chrome.storage.local.set({ userPlan: currentUser.plan });
  }

  upgradeBtn.addEventListener('click', () => {
    if (currentUser) {
      // Open Polar.sh checkout. Passes the Supabase UUID exactly as requested
      // Replace YOUR_POLAR_PRODUCT_ID with actual ID
      window.open(`https://buy.polar.sh/polar_cl_8Af7l7peIYKXogoBiIFo12QnD93OpLB2Ld2sc3ABrkc?metadata[userId]=${currentUser.id}`, '_blank');
    }
  });

  // Load stored API key
  chrome.storage.local.get(['apiKey', 'apiProvider'], (result) => {
    if (result.apiKey) {
      hasStoredKey = true;
      showMainUI();
      apiProviderSelect.value = result.apiProvider || 'gemini';
    } else {
      hasStoredKey = false;
      showApiKeyUI();
    }
  });

  saveApiKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    const provider = apiProviderSelect.value;
    if (key) {
      chrome.storage.local.set({ apiKey: key, apiProvider: provider }, () => {
        hasStoredKey = true;
        showMainUI();
      });
    }
  });

  cancelSettingsBtn.addEventListener('click', () => {
    if (hasStoredKey) {
      showMainUI();
    }
  });

  settingsBtn.addEventListener('click', () => {
    chrome.storage.local.get(['apiKey', 'apiProvider'], (result) => {
      apiKeyInput.value = result.apiKey || '';
      apiProviderSelect.value = result.apiProvider || 'gemini';
      showApiKeyUI(true);
    });
  });

  generateBtn.addEventListener('click', async () => {
    hideError();
    upgradeCard.classList.add('hidden');

    if (isAuthLoading) {
      showError('Hold on, checking your account plan...');
      return;
    }
    if (!currentUser) {
      showError('Database Error: Your Supabase database is missing the users table. Please run schema.sql!');
      return;
    }

    // Freemium Implementation: Check Daily Limits
    const limitCheck = await window.SupabaseAuth.checkAndIncrementUsage(currentUser);
    if (!limitCheck.allowed) {
      upgradeCard.classList.remove('hidden');
      generateBtn.classList.add('hidden'); // Hide button so they upgrade
      quotaText.classList.add('hidden');
      return;
    }

    // UI update limit
    currentUser.usage_count = limitCheck.count;
    updatePlanUI();

    // Check if on YouTube
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !tab.url.includes('youtube.com/watch')) {
      showError('Please open a YouTube video to use Insight AI.');
      return;
    }

    startLoading();

    // 1. Extract transcript text
    chrome.tabs.sendMessage(tab.id, { action: 'extract_text' }, async (response) => {
      if (chrome.runtime.lastError) {
        showError('Could not connect. Refresh the video page and try again.');
        stopLoading();
        return;
      }

      if (response && response.text) {
        try {
          updateProgress(30, 'Generating AI Summary (this takes a few seconds)...');
          await generateSummary(response.text, response.timestampedText, tab.title || 'YouTube Video');
        } catch (err) {
          showError(err.message);
          stopLoading();
        }
      } else {
        showError('Could not extract text. Ensure video has closed captions.');
        stopLoading();
      }
    });
  });

  function startLoading() {
    loadingDiv.classList.remove('hidden');
    generateBtn.disabled = true;
    generateText.textContent = 'Processing...';
    progressBar.style.width = '10%';
    loadingStatus.textContent = 'Extracting transcript...';

    // Simulate gradual progress
    let progress = 10;
    simulatedProgressInterval = setInterval(() => {
      if (progress < 85) {
        progress += Math.random() * 5;
        progressBar.style.width = `${progress}%`;
      }
    }, 1000);
  }

  function updateProgress(percent, text) {
    progressBar.style.width = `${percent}%`;
    loadingStatus.textContent = text;
  }

  function stopLoading() {
    clearInterval(simulatedProgressInterval);
    loadingDiv.classList.add('hidden');
    generateBtn.disabled = false;
    generateText.textContent = 'Generate Summary';
    progressBar.style.width = '0%';
  }

  function showApiKeyUI(allowCancel = false) {
    apiKeyContainer.classList.remove('hidden');
    mainContainer.classList.add('hidden');
    if (allowCancel && hasStoredKey) {
      cancelSettingsBtn.classList.remove('hidden');
    } else {
      cancelSettingsBtn.classList.add('hidden');
    }
    hideError();
  }

  function showMainUI() {
    apiKeyContainer.classList.add('hidden');
    mainContainer.classList.remove('hidden');
    hideError();
  }

  function showError(msg) {
    errorText.textContent = msg;
    errorBox.classList.remove('hidden');
  }

  function hideError() {
    errorBox.classList.add('hidden');
  }

  function formatTimestampedTranscript(timestampedArray) {
    if (!timestampedArray) return "";
    // Output format: [00:00] Hello world...
    return timestampedArray.map(item => {
      const m = Math.floor(item.start / 60).toString().padStart(2, '0');
      const s = Math.floor(item.start % 60).toString().padStart(2, '0');
      return `[${m}:${s}] ${item.text}`;
    }).join('\n').substring(0, 150000); // Respect context window cutoff
  }

  async function generateSummary(text, timestampedText, title) {
    chrome.storage.local.get(['apiKey', 'apiProvider'], async (result) => {
      const apiKey = result.apiKey;
      const provider = result.apiProvider || 'gemini';

      const promptText = `Analyze the following YouTube video transcript and generate a well-structured summary AND a Key Moments list.

Structure your ENTIRE output in clean HTML. Do NOT include <html>, <body>, or <head> tags. Do NOT use markdown code blocks (\`\`\`html). Just return raw HTML.

Part 1: Key Moments
Return a chronological list of important moments with timestamps in a <div> with the class 'key-moments-list'. 
Each moment MUST be structured as a <div> with class 'moment-row' containing a <span> with class 'timestamp' and a <span> with class 'moment-desc'.
Example:
<div class="key-moments-list">
  <div class="moment-row"><span class="timestamp">00:00</span> <span class="moment-desc">Short description of introduction</span></div>
  <div class="moment-row"><span class="timestamp">02:30</span> <span class="moment-desc">Explanation of the main topic</span></div>
</div>

Part 2: The Summary
Structure the output in the following format using <h2>, <p>, and <ul><li>:
1. Video Overview (A short paragraph explaining what the video is about)
2. Key Topics Explained (Write paragraphs describing the main topics discussed)
3. Important Points and Insights (A list of detailed bullet points explaining arguments, examples, or lessons)
4. Practical Takeaways (Summarize the most useful lessons or actionable advice)
5. Conclusion (A short concluding paragraph)

**LENGTH GUIDELINES (CRITICAL):**
Adapt the summary length proportionally to the video length to be concise and highly readable.
- For a short video (under 5 mins), write a brief 1-2 paragraph summary.
- For a medium/long video (e.g., 20 minutes), the summary should be roughly 1 to 2 pages in length (around 400-600 words).
Avoid unnecessary filler and keep the spacing clean.

Transcript with Timestamps:
${formatTimestampedTranscript(timestampedText) || text.substring(0, 150000)}`;

      try {
        let summaryHtml = '';

        if (provider === 'gemini') {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
              generationConfig: { temperature: 0.4 }
            })
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message || 'Gemini API Error');
          summaryHtml = data.candidates[0].content.parts[0].text;
        } else if (provider === 'openai') {
          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: promptText }],
              temperature: 0.4
            })
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message || 'OpenAI API Error');
          summaryHtml = data.choices[0].message.content;
        }

        // Clean up markdown fences if AI included them anyway
        summaryHtml = summaryHtml.replace(/^```html\n?/i, '').replace(/```$/i, '').trim();

        updateProgress(100, 'Done! Opening summary...');

        // Save to storage and open new tab
        const cleanTitle = title.replace(/^\(\d+\)\s*/, ''); // Remove notifications like "(1) " from title

        chrome.storage.local.set({
          latestSummary: summaryHtml,
          latestTitle: cleanTitle,
          summaryDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        }, () => {
          clearInterval(simulatedProgressInterval);
          chrome.tabs.create({ url: 'summary.html' });
          // Close popup after opening tab automatically (Chrome does this inherently when losing focus, but just in case)
        });

      } catch (err) {
        showError(`Error: ${err.message}`);
        stopLoading();
      }
    });
  }
});
