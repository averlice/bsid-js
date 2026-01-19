export async function generateGeminiResponse(prompt, apiKey, imageBuffer = null, mimeType = null, model = 'gemini-3-flash-preview') {
  if (!apiKey) {
    return "Error: GEMINI_API_KEY is not configured.";
  }

  // Use the model provided or default to flash
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const parts = [{ text: prompt }];

  if (imageBuffer && mimeType) {
    // High-performance Base64 conversion for Cloudflare
    const base64Image = btoa(Array.from(imageBuffer, byte => String.fromCharCode(byte)).join(''));

    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: base64Image
      }
    });
  }

  const payload = {
    contents: [{
      parts: parts
    }]
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error?.message || response.statusText;
      throw new Error(`Gemini API ${response.status} (${message})`);
    }

    const data = await response.json();
    
    // Safety check for response structure
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts.length > 0) {
      return data.candidates[0].content.parts[0].text;
    } else {
        if (data.promptFeedback && data.promptFeedback.blockReason) {
             throw new Error(`Safety Block: ${data.promptFeedback.blockReason}`);
        }
        throw new Error("Gemini returned an empty response (possible safety filter or content blocked).");
    }

  } catch (error) {
    console.error("Fetch Error:", error);
    return `Failed to contact Gemini API: ${error.message}`;
  }
}