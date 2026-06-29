import { GoogleGenAI } from "@google/genai";

// Resolve API key prioritising CUSTOM_GEMINI_API_KEY from Settings/Secrets
export function getGeminiApiKey(): string | undefined {
  return process.env.CUSTOM_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
}

// Lazy-initialized GoogleGenAI client
let _ai: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }
  if (!_ai) {
    _ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return _ai;
}

export function getModelForAgent(agent: 'DOER' | 'PLANNER' | 'PROFILER' | 'STRATEGIST'): string {
  switch (agent) {
    case 'DOER': return process.env.MODEL_DOER || "gemini-1.5-flash";
    case 'PLANNER': return process.env.MODEL_PLANNER || "gemini-1.5-flash";
    case 'PROFILER': return process.env.MODEL_PROFILER || "gemini-1.5-flash";
    case 'STRATEGIST': return process.env.MODEL_STRATEGIST || "gemini-1.5-flash";
    default: return "gemini-1.5-flash";
  }
}

export interface GenerateContentParams {
  model: string;
  contents: any;
  config?: any;
}

/**
 * Executes a Gemini API generateContent call with exponential backoff on 429 RPM errors.
 * Immediately fails with a friendly message on 429 RPD (Daily) errors.
 */
export async function generateContentWithRetry(
  ai: GoogleGenAI | null,
  params: GenerateContentParams
): Promise<any> {
  if (!ai) {
    throw new Error("Gemini API Client is not configured. Please add CUSTOM_GEMINI_API_KEY to Settings.");
  }

  const maxRetries = 3;
  const baseDelays = [1000, 2000, 4000]; // 1s, 2s, 4s

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      const errMsg = String(err?.message || err || "").toLowerCase();
      const status = err?.status || err?.statusCode || (errMsg.includes("429") ? 429 : 500);

      const is429 = status === 429 || errMsg.includes("429") || errMsg.includes("resource_exhausted") || errMsg.includes("quota");

      if (is429) {
        // Distinguish Daily Limit (RPD) vs Rate Limit (RPM)
        const isDaily = errMsg.includes("day") || errMsg.includes("daily") || errMsg.includes("rpd");

        if (isDaily) {
          console.error("Gemini Daily Quota (RPD) limit reached:", err);
          throw new Error("AI limit reached for today. Please try again tomorrow or configure a Custom Gemini API Key in Settings.");
        }

        // It is an RPM (Requests Per Minute) rate-limit error. Retry with backoff if attempts remain.
        if (attempt < maxRetries) {
          const baseDelay = baseDelays[attempt] || 4000;
          // Add jitter (randomness between -200ms and +200ms)
          const jitter = (Math.random() - 0.5) * 400;
          const delay = Math.max(100, baseDelay + jitter);
          console.warn(`Gemini RPM limit reached. Retrying attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        } else {
          console.error("Gemini API RPM limit retries exhausted:", err);
          throw new Error("AI rate limit exceeded. Please try again in a minute.");
        }
      }

      // If it is any other error, propagate immediately
      throw err;
    }
  }
}
