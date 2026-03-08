// Register a listener for requests from the popup
try {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extract_text') {
      const urlParams = new URLSearchParams(window.location.search);
      const videoId = urlParams.get('v');
      
      if (videoId) {
        fetchTranscript(videoId).then(transcript => {
          if (transcript && transcript.text.length > 50) {
            sendResponse({ text: transcript.text, timestampedText: transcript.timestampedText });
          } else {
            // Fallback
            sendResponse({ text: getFallbackText(), timestampedText: null });
          }
        });
      } else {
        // Fallback
        sendResponse({ text: getFallbackText() });
      }
      
      // Return true to indicate we wish to send a response asynchronously
      return true;
    } else if (request.action === 'seek_to') {
      const video = document.querySelector('video');
      if (video && request.time !== undefined) {
        video.currentTime = request.time;
        video.play();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false });
      }
      return true;
    }
  });
} catch (e) {
  // Catch errors if scripts are reloaded multiple times
}

async function fetchTranscript(videoId) {
  try {
    // Fetch the raw HTML of the video page
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();
    
    // Look for caption tracks JSON block embedded in the HTML source
    const captionsRegex = /"captionTracks":(\[.*?\])/;
    const match = html.match(captionsRegex);
    
    if (match && match[1]) {
      const captionTracks = JSON.parse(match[1]);
      
      // Prioritize English tracks
      let track = captionTracks.find(t => 
        t.languageCode === 'en' || 
        (t.name && t.name.simpleText && t.name.simpleText.includes('English')));
        
      if (!track) {
        track = captionTracks[0]; // fallback to first available
      }
      
      if (track && track.baseUrl) {
        const transcriptResponse = await fetch(track.baseUrl);
        const transcriptXml = await transcriptResponse.text();
        
        // Parse the returned XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(transcriptXml, "text/xml");
        const textNodes = xmlDoc.getElementsByTagName('text');
        
        // Combine text and decode entities
        let fullText = Array.from(textNodes).map(node => node.textContent).join(' ');
        fullText = fullText.replace(/&#39;/g, "'")
                           .replace(/&quot;/g, '"')
                           .replace(/&amp;/g, '&');
                           
        // Create timestamped payload for Key Moments AI context
        const timestampedText = Array.from(textNodes).map(node => {
          const start = parseFloat(node.getAttribute('start')) || 0;
          let textContent = node.textContent.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
          return { start, text: textContent };
        });

        return { text: fullText, timestampedText };
      }
    }
    return null;
  } catch (e) {
    console.error("Error fetching transcript behind the scenes:", e);
    return null;
  }
}

function getFallbackText() {
  let text = '';
  // Grab standard page elements in case transcript fetching fails
  const titleEl = document.querySelector('h1.ytd-watch-metadata');
  const descEl = document.querySelector('#description-inline-expander');
  
  if (titleEl) text += `Title: ${titleEl.innerText}\n\n`;
  if (descEl) text += `Description: ${descEl.innerText}\n`;
  
  return text.trim();
}
