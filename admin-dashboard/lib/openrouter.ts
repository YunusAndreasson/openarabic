/**
 * OpenRouter API Client
 *
 * A simple utility for sending prompts to OpenRouter and receiving text responses.
 * Uses the OpenAI-compatible API format.
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/**
 * Send a prompt to OpenRouter and get a text response
 *
 * @param prompt - The user prompt to send
 * @param options - Optional configuration for the request
 * @returns The generated text response
 *
 * @example
 * ```ts
 * const response = await sendPrompt('Write a haiku about coding');
 * console.log(response);
 * ```
 */
export async function sendPrompt(prompt: string, options: OpenRouterOptions = {}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured in environment variables');
  }

  const {
    model = 'anthropic/claude-3.5-sonnet', // Default to Claude 3.5 Sonnet
    temperature = 0.7,
    maxTokens = 1000,
    systemPrompt,
  } = options;

  // Build messages array
  const messages: OpenRouterMessage[] = [];

  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt,
    });
  }

  messages.push({
    role: 'user',
    content: prompt,
  });

  const requestBody: OpenRouterRequest = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://openarabic.io', // Optional: for OpenRouter analytics
        'X-Title': 'OpenArabic Admin Dashboard', // Optional: for OpenRouter analytics
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    const data: OpenRouterResponse = await response.json();

    const textResponse = data.choices[0]?.message?.content;

    if (!textResponse) {
      throw new Error('No response content received from OpenRouter');
    }

    return textResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to call OpenRouter API: ${error.message}`);
    }
    throw new Error('Failed to call OpenRouter API: Unknown error');
  }
}

/**
 * Available models on OpenRouter
 * See https://openrouter.ai/models for full list
 */
export const MODELS = {
  // Anthropic Claude models
  CLAUDE_35_SONNET: 'anthropic/claude-3.5-sonnet',
  CLAUDE_3_OPUS: 'anthropic/claude-3-opus',
  CLAUDE_3_SONNET: 'anthropic/claude-3-sonnet',
  CLAUDE_3_HAIKU: 'anthropic/claude-3-haiku',

  // OpenAI models
  GPT4_TURBO: 'openai/gpt-4-turbo',
  GPT4: 'openai/gpt-4',
  GPT35_TURBO: 'openai/gpt-3.5-turbo',

  // Google models
  GEMINI_PRO: 'google/gemini-pro',
  GEMINI_PRO_15: 'google/gemini-pro-1.5',

  // Meta models
  LLAMA_3_70B: 'meta-llama/llama-3-70b-instruct',
  LLAMA_3_8B: 'meta-llama/llama-3-8b-instruct',
} as const;

/**
 * Example usage function (for testing)
 */
export async function exampleUsage() {
  try {
    // Basic usage
    const response1 = await sendPrompt('Write a haiku about Arabic language learning');
    console.log('Response 1:', response1);

    // With custom model and temperature
    const response2 = await sendPrompt('Explain quantum computing in simple terms', {
      model: MODELS.CLAUDE_3_HAIKU,
      temperature: 0.5,
      maxTokens: 500,
    });
    console.log('Response 2:', response2);

    // With system prompt
    const response3 = await sendPrompt('What are the key principles?', {
      systemPrompt: 'You are an expert Arabic language teacher. Be concise and helpful.',
      temperature: 0.8,
    });
    console.log('Response 3:', response3);

    return { response1, response2, response3 };
  } catch (error) {
    console.error('Example usage failed:', error);
    throw error;
  }
}
