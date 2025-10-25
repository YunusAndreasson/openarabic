import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendPrompt } from '@/lib/openrouter';

interface OptimizeSummaryRequest {
  articleId: number;
  currentSummary: string;
  wordCount: number;
  title: string;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * POST /api/ai/optimize-summary
 *
 * Optimizes an article summary using AI based on current word count
 *
 * Body:
 * {
 *   "articleId": 123,
 *   "currentSummary": "Current summary text...",
 *   "wordCount": 15,
 *   "title": "Article Title"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: OptimizeSummaryRequest = await request.json();
    const { articleId, currentSummary, wordCount, title } = body;

    // Validate inputs
    if (!articleId || !currentSummary || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: articleId, currentSummary, title' },
        { status: 400 },
      );
    }

    // Fetch full article text from article_sentences
    const { data: sentences, error: sentencesError } = await supabase
      .from('article_sentences')
      .select('arabic, english, position')
      .eq('article_id', articleId)
      .order('position');

    if (sentencesError) {
      console.error('Error fetching sentences:', sentencesError);
      return NextResponse.json({ error: 'Failed to fetch article content' }, { status: 500 });
    }

    if (!sentences || sentences.length === 0) {
      return NextResponse.json({ error: 'No article content found' }, { status: 404 });
    }

    // Combine sentences into full article text
    const fullArticleText = sentences
      .map(s => `Arabic: ${s.arabic}\nEnglish: ${s.english}`)
      .join('\n\n');

    // Determine the instruction based on current word count
    let lengthInstruction: string;
    let targetRange: string;

    if (wordCount < 20) {
      lengthInstruction = 'Expand this summary to be at least 20 words';
      targetRange = '20-30 words';
    } else if (wordCount > 30) {
      lengthInstruction = 'Condense this summary to be under 30 words';
      targetRange = '20-30 words';
    } else {
      lengthInstruction = 'Refine this summary to be exactly in the optimal range';
      targetRange = '20-30 words';
    }

    // Build the AI prompt
    const prompt = `You are a professional editor creating concise, informative article summaries.

Article Title: "${title}"

Full Article Content (${sentences.length} sentences):
${fullArticleText}

Current Summary (${wordCount} words):
"${currentSummary}"

Task: ${lengthInstruction} while maintaining accuracy and informativeness.

Requirements:
1. Base your summary on the current summary and the full article content above
2. Make it informative, engaging, and capture the key points
3. CRITICAL: Avoid using Arabic words - write in English only
4. Target word count: ${targetRange}
5. Return ONLY the new summary text, nothing else - no explanations or meta-commentary

New summary:`;

    // Call OpenRouter with free DeepSeek Chat v3.1 model
    const optimizedSummary = await sendPrompt(prompt, {
      model: 'deepseek/deepseek-chat-v3.1:free',
      temperature: 0.7,
      maxTokens: 200,
    });

    // Clean up the response (remove any quotes or extra whitespace)
    const cleanedSummary = optimizedSummary
      .trim()
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();

    const newWordCount = countWords(cleanedSummary);

    return NextResponse.json({
      success: true,
      optimizedSummary: cleanedSummary,
      wordCount: newWordCount,
      originalWordCount: wordCount,
      wasExpanded: newWordCount > wordCount,
      wasCondensed: newWordCount < wordCount,
    });
  } catch (error) {
    console.error('Error in /api/ai/optimize-summary:', error);

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
