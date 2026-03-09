# Insight AI

# Developer : Abdullah Dilshad

This is a production-ready, highly polished Chrome Extension that generates long-form, structured summaries of any YouTube video using AI. By generating a beautiful reading-layout article based on the video transcript, users can learn and consume content significantly faster.

## Features
- **Long-Form Structured Summaries**: Video Overview, Key Topics, Important Insights, and Conclusion.
- **Premium UI**: Crafted using a modern SaaS aesthetic, custom animations, gradients, glassmorphism, and a dedicated reading pane (`summary.html`) akin to a Notion or Medium page.
- **Export Options**: 1-click "Copy Text" and "Download PDF".
- **Bring Your Own Key**: Supports both OpenAI (GPT) and Google Gemini AI API keys. 

## 1. Project Folder Structure
```text
youtube-ai-summary-extension/
├── manifest.json
├── popup.html
├── popup.js
├── summary.html
├── summary.js
├── content.js
├── style.css
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## 2. Instructions to test the extension locally
1. The extension requires an API key for the AI to work. When you open the extension for the first time, you will be prompted to enter a **Gemini** or **OpenAI** API key securely.
2. The popup and background scripts are fully functional. If you want to debug or view console logs:
   - For popup issues: Right-click the extension icon -> **Inspect popup**
   - For summary page issues: Inspect the newly opened summary tab directly (F12).
   - For content script issues: Open Developer Tools (F12) while on the YouTube video page.

## 3. Instructions to load the extension
1. Open Google Chrome.
2. Type `chrome://extensions/` into your URL bar and hit enter.
3. Toggle **Developer mode** ON (top right corner switch).
4. Click the **Load unpacked** button in the top left.
5. Select this folder (`d:\Extensions\youtube-ai-summary-extension`).
6. Pin the extension to your toolbar, open a YouTube video, and click the icon to generate a summary! You will see the extension open a beautifully formatted `summary.html` reading tab once computation completes.

## 4. Instructions to package and publish
1. Open this project folder (`youtube-ai-summary-extension`).
2. Select all files and folders *inside* this directory (manifest, html, js, css, icons folder). Do *not* select the parent folder itself.
3. **Zip the files** (Right-click -> Send to -> Compressed (zipped) folder).
4. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
5. Click **New Item** and upload your Zip file.
6. Fill out the Store Listing details:
   - **Description**: *"Insight AI generates detailed, long-form structured summaries of any YouTube video into readable articles. Save time, download takeaways as PDF, and learn faster."*
   - **Permissions**: Ensure you declare `activeTab`, `scripting`, `storage`, and `tabs`. Justify that `tabs` is required to open the AI generated summary reading view.
7. Submit the extension for review!
