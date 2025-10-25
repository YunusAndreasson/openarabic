# OpenRouter API Integration

A generic client utility for sending prompts to OpenRouter and receiving text responses.

## Setup

### 1. Environment Variable

The API key is already configured in `.env.local`:

```bash
OPENROUTER_API_KEY=REDACTED_LEAKED_KEY
```

⚠️ **Important**: This is a server-side key. Never expose it to the client by prefixing with `NEXT_PUBLIC_`.

### 2. Files Created

- **`lib/openrouter.ts`** - Main client utility with `sendPrompt()` function
- **`app/api/ai/generate/route.ts`** - API route for frontend to call
- **`app/ai-test/page.tsx`** - Test page for trying different prompts and models

## Usage

### Option 1: Direct Usage (Server-Side)

```typescript
import { sendPrompt, MODELS } from '@/lib/openrouter';

// Basic usage
const response = await sendPrompt('Write a haiku about Arabic');
console.log(response);

// With custom options
const response = await sendPrompt('Explain quantum computing', {
  model: MODELS.CLAUDE_3_HAIKU,
  temperature: 0.5,
  maxTokens: 500,
  systemPrompt: 'You are a helpful teacher. Be concise.',
});
```

### Option 2: Via API Route (Client-Side)

```typescript
const res = await fetch('/api/ai/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Your prompt here',
    model: 'anthropic/claude-3.5-sonnet', // optional
    temperature: 0.7, // optional
    maxTokens: 1000, // optional
    systemPrompt: 'You are a helpful assistant', // optional
  }),
});

const data = await res.json();
console.log(data.response);
```

## Available Models

The utility includes constants for popular models:

```typescript
import { MODELS } from '@/lib/openrouter';

// Anthropic Claude
MODELS.CLAUDE_35_SONNET; // 'anthropic/claude-3.5-sonnet' (default)
MODELS.CLAUDE_3_OPUS; // 'anthropic/claude-3-opus'
MODELS.CLAUDE_3_SONNET; // 'anthropic/claude-3-sonnet'
MODELS.CLAUDE_3_HAIKU; // 'anthropic/claude-3-haiku'

// OpenAI
MODELS.GPT4_TURBO; // 'openai/gpt-4-turbo'
MODELS.GPT4; // 'openai/gpt-4'
MODELS.GPT35_TURBO; // 'openai/gpt-3.5-turbo'

// Google
MODELS.GEMINI_PRO; // 'google/gemini-pro'
MODELS.GEMINI_PRO_15; // 'google/gemini-pro-1.5'

// Meta
MODELS.LLAMA_3_70B; // 'meta-llama/llama-3-70b-instruct'
MODELS.LLAMA_3_8B; // 'meta-llama/llama-3-8b-instruct'
```

See [OpenRouter Models](https://openrouter.ai/models) for the full list.

## Testing

Visit the test page at `/ai-test` to:

- Try different prompts and models
- Test system prompts
- See example usage
- View code snippets

## API Reference

### `sendPrompt(prompt, options)`

**Parameters:**

- `prompt` (string, required) - The user prompt to send
- `options` (object, optional):
  - `model` (string) - Model to use (default: 'anthropic/claude-3.5-sonnet')
  - `temperature` (number) - Randomness, 0-2 (default: 0.7)
  - `maxTokens` (number) - Max response length (default: 1000)
  - `systemPrompt` (string) - System context/instructions (default: none)

**Returns:** `Promise<string>` - The generated text response

**Throws:** Error if API call fails or API key is not configured

## Cost Tracking

OpenRouter provides analytics and cost tracking at [openrouter.ai/activity](https://openrouter.ai/activity).

Each API call includes:

- `HTTP-Referer: https://openarabic.io` - For analytics
- `X-Title: OpenArabic Admin Dashboard` - For identification

## Security Notes

✅ API key is stored in `.env.local` (not committed to git)
✅ API key is server-side only (no NEXT*PUBLIC* prefix)
✅ API route validates inputs before making requests
✅ Error messages don't expose sensitive information

## Next Steps

You can now use the OpenRouter client for:

- Generating article summaries
- Creating quiz questions
- Translating content
- Analyzing text
- Any text generation tasks
