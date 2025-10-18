'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';

const MODELS = {
  'Claude 3.5 Sonnet': 'anthropic/claude-3.5-sonnet',
  'Claude 3 Opus': 'anthropic/claude-3-opus',
  'Claude 3 Haiku': 'anthropic/claude-3-haiku',
  'GPT-4 Turbo': 'openai/gpt-4-turbo',
  'GPT-3.5 Turbo': 'openai/gpt-3.5-turbo',
  'Gemini Pro 1.5': 'google/gemini-pro-1.5',
  'Llama 3 70B': 'meta-llama/llama-3-70b-instruct',
};

export default function AITestPage() {
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [model, setModel] = useState('anthropic/claude-3.5-sonnet');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model,
          systemPrompt: systemPrompt || undefined,
          temperature: 0.7,
          maxTokens: 1000,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate response');
      }

      setResponse(data.response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Test Page</h1>
        <p className="text-muted-foreground mt-1">
          Test OpenRouter API integration with various models
        </p>
      </div>

      <div className="border rounded-lg p-6 bg-card space-y-4">
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger id="model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MODELS).map(([name, value]) => (
                <SelectItem key={value} value={value}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="system">System Prompt (Optional)</Label>
          <Textarea
            id="system"
            placeholder="You are a helpful assistant..."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prompt">User Prompt</Label>
          <Textarea
            id="prompt"
            placeholder="Enter your prompt here..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || !prompt.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Response
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="border border-destructive/50 bg-destructive/10 rounded-lg p-4">
          <p className="text-sm text-destructive font-medium">Error:</p>
          <p className="text-sm text-destructive mt-1">{error}</p>
        </div>
      )}

      {response && (
        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-lg font-semibold mb-3">Response</h2>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg text-sm">
              {response}
            </pre>
          </div>
        </div>
      )}

      {/* Usage Examples */}
      <div className="border rounded-lg p-6 bg-muted/30">
        <h2 className="text-lg font-semibold mb-3">Quick Examples</h2>
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPrompt('Write a haiku about Arabic language learning')}
          >
            Haiku Example
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPrompt('What are 3 tips for learning Arabic vocabulary?');
              setSystemPrompt('You are an expert Arabic language teacher. Be concise and practical.');
            }}
          >
            Arabic Learning Tips
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPrompt('Explain spaced repetition in 2 sentences')}
          >
            Spaced Repetition
          </Button>
        </div>
      </div>

      {/* Code Example */}
      <div className="border rounded-lg p-6 bg-muted/30">
        <h2 className="text-lg font-semibold mb-3">Usage in Code</h2>
        <pre className="bg-black text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
{`// Import the client
import { sendPrompt, MODELS } from '@/lib/openrouter';

// Basic usage
const response = await sendPrompt('Your prompt here');

// With options
const response = await sendPrompt(
  'Your prompt here',
  {
    model: MODELS.CLAUDE_35_SONNET,
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: 'You are a helpful assistant'
  }
);

// Via API route
const res = await fetch('/api/ai/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Your prompt here',
    model: 'anthropic/claude-3.5-sonnet'
  })
});
const data = await res.json();
console.log(data.response);`}
        </pre>
      </div>
    </div>
  );
}
