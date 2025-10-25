import { NextRequest, NextResponse } from 'next/server';
import { sendPrompt, MODELS } from '@/lib/openrouter';

export const runtime = 'edge';

interface GenerateRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/**
 * POST /api/ai/generate
 *
 * Send a prompt to OpenRouter and get a text response
 *
 * Body:
 * {
 *   "prompt": "Your prompt here",
 *   "model": "anthropic/claude-3.5-sonnet", // optional
 *   "temperature": 0.7, // optional
 *   "maxTokens": 1000, // optional
 *   "systemPrompt": "You are a helpful assistant" // optional
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();

    const { prompt, model, temperature, maxTokens, systemPrompt } = body;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required and must be a non-empty string' },
        { status: 400 },
      );
    }

    // Call OpenRouter API
    const response = await sendPrompt(prompt, {
      model,
      temperature,
      maxTokens,
      systemPrompt,
    });

    return NextResponse.json({
      success: true,
      response,
      model: model || MODELS.CLAUDE_35_SONNET,
    });
  } catch (error) {
    console.error('Error in /api/ai/generate:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
