document.addEventListener('DOMContentLoaded', () => {
  const articleTitle = document.getElementById('article-title');
  const summaryDate = document.getElementById('summary-date');
  const articleContent = document.getElementById('article-content');
  const errorAlert = document.getElementById('error-alert');
  
  const copyBtn = document.getElementById('copy-summary-btn');
  const downloadBtn = document.getElementById('download-summary-btn');
  const backBtn = document.getElementById('back-to-yt-btn');

  // Load data from storage
  chrome.storage.local.get(['latestSummary', 'latestTitle', 'summaryDate', 'userPlan'], (data) => {
    if (data.latestSummary) {
      // Remove skeleton classes to show content
      articleTitle.classList.remove('skeleton-text', 'skeleton-heading');
      
      articleTitle.textContent = data.latestTitle || 'Video Summary';
      summaryDate.textContent = data.summaryDate || 'Today';
      
      // Inject generated HTML
      articleContent.innerHTML = data.latestSummary;
      
      // Freemium Locks
      if (data.userPlan !== 'pro') {
        const kmList = articleContent.querySelector('.key-moments-list');
        if (kmList) {
          kmList.innerHTML = `
            <div style="text-align:center; padding: 20px; background: #fafaf9; border-radius: 8px;">
              <strong style="color: #171717;">Pro Feature Locked</strong><br>
              <span style="font-size: 13px; color: #525252;">Upgrade via the extension popup to unlock interactive video timestamps.</span>
            </div>
          `;
          kmList.style.pointerEvents = 'none';
          kmList.style.opacity = '0.8';
        }
        
        // Disable PDF download for free users
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Pro PDF Export';
        downloadBtn.title = "Upgrade to Pro to export PDFs";
      }
      
      // Add staggered animations to top-level block elements
      const elements = articleContent.querySelectorAll('h2, h3, p, ul');
      elements.forEach((el, index) => {
        el.classList.add('staggered-fade-in');
        // Prevent too wild delays for very long summaries
        const delay = Math.min(index * 0.1, 1.5);
        el.style.animationDelay = `${delay}s`;
      });
    } else {
      showError("No summary found. Please generate a summary from the extension popup first.");
    }
  });

  // Actions
  copyBtn.addEventListener('click', () => {
    // We want to copy readable text, not raw HTML tags
    const plainText = parseHtmlToText(articleContent.innerHTML);
    
    navigator.clipboard.writeText(plainText).then(() => {
      const originalHtml = copyBtn.innerHTML;
      copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!';
      setTimeout(() => {
        copyBtn.innerHTML = originalHtml;
      }, 2000);
    });
  });

  downloadBtn.addEventListener('click', () => {
    const article = document.getElementById('summary-article');
    
    // Temporarily hide skeleton styles and borders if any to make PDF cleaner
    article.style.boxShadow = 'none';
    article.style.border = 'none';
    
    const opt = {
      margin:       [0.5, 0.5, 0.5, 0.5], // Top, Left, Bottom, Right
      filename:     `InsightAI_Summary_${Date.now()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    // Temporarily strip CSS animation classes before generating PDF to prevent invisible text
    const animatedElements = article.querySelectorAll('.staggered-fade-in');
    animatedElements.forEach(el => el.classList.remove('staggered-fade-in'));

    const originalHtml = downloadBtn.innerHTML;
    downloadBtn.innerHTML = 'Downloading...';
    downloadBtn.disabled = true;

    // Uses the html2pdf library included via CDN in the HTML file
    if (typeof html2pdf !== 'undefined') {
      html2pdf().set(opt).from(article).save().then(() => {
        downloadBtn.innerHTML = originalHtml;
        downloadBtn.disabled = false;
        // Restore styles
        article.style.boxShadow = '';
        article.style.border = '';
        animatedElements.forEach(el => el.classList.add('staggered-fade-in'));
      });
    } else {
      showError("PDF library failed to load. Please check your internet connection.");
      downloadBtn.innerHTML = originalHtml;
      downloadBtn.disabled = false;
      article.style.boxShadow = '';
      article.style.border = '';
      animatedElements.forEach(el => el.classList.add('staggered-fade-in'));
    }
  });

  backBtn.addEventListener('click', async () => {
    // Try to find the closest active youtube tab
    const tabs = await chrome.tabs.query({ url: "*://*.youtube.com/watch*" });
    if (tabs.length > 0) {
      // Focus on the first matched YT tab
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      // Fallback
      window.location.href = "https://www.youtube.com";
    }
  });

  function showError(msg) {
    errorAlert.innerHTML = `
      <svg class="error-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>${msg}</span>
    `;
    errorAlert.classList.remove('hidden');
    articleContent.innerHTML = '';
    articleTitle.textContent = '';
    articleTitle.classList.remove('skeleton-text', 'skeleton-heading');
  }

  function parseHtmlToText(html) {
    // A quick way to extract somewhat formatted text from headers and paragraphs
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Add newlines after block elements
    const blockElements = tempDiv.querySelectorAll('h1, h2, h3, p, ul, li, .moment-row');
    blockElements.forEach(el => {
      if (el.tagName === 'LI') {
        el.innerHTML = '• ' + el.innerHTML + '\\n';
      } else if (el.classList.contains('moment-row')) {
        const time = el.querySelector('.timestamp')?.textContent || '';
        const desc = el.querySelector('.moment-desc')?.textContent || '';
        el.innerHTML = `${time} - ${desc}\\n`;
      } else {
        el.innerHTML = el.innerHTML + '\\n\\n';
      }
    });
    
    let text = tempDiv.textContent || tempDiv.innerText || "";
    return text.replace(/\\n/g, '\n').replace(/\n\s*\n\s*\n/g, '\n\n').trim();
  }

  // Handle clickable timestamps dynamically
  articleContent.addEventListener('click', async (e) => {
    if (e.target.classList.contains('timestamp')) {
      const timeStr = e.target.textContent;
      const parts = timeStr.split(':');
      let seconds = 0;
      
      if (parts.length === 2) {
        seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
      } else if (parts.length === 3) {
        seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
      } else {
        return; // Unknown format
      }

      // Find the active YouTube video tab and send seek command
      const tabs = await chrome.tabs.query({ url: "*://*.youtube.com/watch*" });
      if (tabs.length > 0) {
        const targetTab = tabs[0];
        
        // Change the URL to include the timestamp (which forces YouTube's router to seek)
        const url = new URL(targetTab.url);
        url.searchParams.set('t', seconds + 's');
        
        // Update the tab URL and focus it
        chrome.tabs.update(targetTab.id, { url: url.toString(), active: true });
        chrome.windows.update(targetTab.windowId, { focused: true });
      }
    }
  });
});
