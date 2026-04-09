import { config } from '../config.js';

/**
 * Fetch a response from NVIDIA NIM with retry and timeout logic.
 */
export async function getLLMResponse(messages) {
  const url = config.NVIDIA.BASE_URL;
  const apiKey = config.NVIDIA.API_KEY;
  const model = config.NVIDIA.MODEL;

  const payload = {
    model: model,
    messages: [
      { role: 'system', content: 'You are a helpful AI assistant. Format text beautifully. Use markdown formatting gracefully.' },
      ...messages
    ],
    max_tokens: 1024, // Keeps responses punchy and "Fast" mode appropriate
    temperature: 0.7,
  };

  const MAX_RETRIES = 2;
  const TIMEOUT_MS = 15000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return { ok: true, text: data.choices[0].message.content };

    } catch (error) {
      console.error(`[LLM Attempt ${attempt}] Error:`, error.message);
      
      if (attempt === MAX_RETRIES) {
        let errorType = 'API ERROR';
        if (error.name === 'AbortError') errorType = 'TIMEOUT ERROR';
        return { 
          ok: false, 
          text: `❌ ERROR TYPE: ${errorType}\n❌ ERROR NAME: ${error.message}\n\nPlease try again later.` 
        };
      }
      
      // Wait before retry
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}
