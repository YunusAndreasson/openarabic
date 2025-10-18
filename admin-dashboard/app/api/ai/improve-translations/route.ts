import { NextRequest, NextResponse } from 'next/server';
import { sendPrompt } from '@/lib/openrouter';

interface WordTranslation {
  arabic: string;
  english: string;
  position: number;
}

interface ImproveTranslationsRequest {
  arabicSentence: string;
  englishSentence: string;
  words: WordTranslation[];
}

interface TranslationSuggestion {
  position: number;
  arabic: string;
  currentEnglish: string;
  suggestedEnglish: string;
  reasoning?: string;
}

/**
 * POST /api/ai/improve-translations
 *
 * Improves word-level translations for Arabic sentences, focusing on proper word segmentation
 * for language learning purposes (e.g., splitting "wa" = "and", "bi" = "with/in", etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body: ImproveTranslationsRequest = await request.json();
    const { arabicSentence, englishSentence, words } = body;

    // Validate inputs
    if (!arabicSentence || !englishSentence || !words || words.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: arabicSentence, englishSentence, words' },
        { status: 400 }
      );
    }

    // Build word list for prompt
    const wordList = words
      .map((w) => `${w.position}. Arabic: "${w.arabic}" → Current English: "${w.english}"`)
      .join('\n');

    // Build the AI prompt
    const prompt = `You are an expert Arabic-to-English translator specializing in language learning materials. Your task is to improve word-level translations by ensuring accurate word segmentation.

CONTEXT:
Arabic Sentence: "${arabicSentence}"
English Sentence: "${englishSentence}"

CURRENT WORD-BY-WORD TRANSLATIONS:
${wordList}

TASK:
Review each Arabic word and suggest improved English translations that:

1. **Split compound words when appropriate**:
   - Common prefixes: "wa" (and), "fa" (and/then/so), "bi" (with/in/by), "li" (for/to), "al" (the)
   - Example: "وَالْكِتَاب" → "and the book" (NOT "and the book" as one word)

2. **Handle suffixes**:
   - Possessive pronouns: "-hu" (his), "-ha" (her), "-hum" (their)
   - Object pronouns: "-ni" (me), "-ka" (you)

3. **Use brackets for inserted words**:
   - Words needed in English but not directly in Arabic should use [brackets]
   - Example: "قَالَ" → "he said" where "he" should be "[he] said" if the pronoun is implicit

4. **Maintain sentence coherence**:
   - Ensure translations make sense in the full sentence context
   - Keep the word count appropriate for language learning (2-3 words maximum per Arabic word)

5. **Preserve learning value**:
   - Each English translation should clearly map to its Arabic word
   - Avoid overly literal translations that confuse learners

CRITICAL RESPONSE REQUIREMENTS:
1. You MUST respond with ONLY valid JSON - no other text, explanations, or markdown
2. Return a JSON array (even if empty: [])
3. Only include words that need improvement
4. If all translations are good, return: []

EXACT JSON FORMAT:
[
  {
    "position": 1,
    "arabic": "original arabic word",
    "currentEnglish": "current translation",
    "suggestedEnglish": "improved translation",
    "reasoning": "brief explanation"
  }
]

EXAMPLE RESPONSE:
[{"position":2,"arabic":"وَالْكِتَاب","currentEnglish":"and the book","suggestedEnglish":"and the book","reasoning":"Split compound: 'wa' (and) + 'al' (the) + 'kitab' (book)"}]

Return ONLY the JSON array. NO markdown, NO code blocks, NO explanations.`;

    // Call DeepSeek
    const aiResponse = await sendPrompt(prompt, {
      model: 'deepseek/deepseek-chat-v3.1:free',
      temperature: 0.3, // Lower temperature for more consistent formatting
      maxTokens: 2000,
    });

    // Parse the JSON response
    let suggestions: TranslationSuggestion[];
    try {
      // Clean up response - remove markdown code blocks and extra text
      let cleanedResponse = aiResponse.trim();

      // Remove markdown code blocks
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      // Try to extract JSON array if there's extra text
      const jsonArrayMatch = cleanedResponse.match(/\[[\s\S]*\]/);
      if (jsonArrayMatch) {
        cleanedResponse = jsonArrayMatch[0];
      }

      // Remove any text before the opening bracket
      const firstBracket = cleanedResponse.indexOf('[');
      if (firstBracket > 0) {
        cleanedResponse = cleanedResponse.substring(firstBracket);
      }

      // Remove any text after the closing bracket
      const lastBracket = cleanedResponse.lastIndexOf(']');
      if (lastBracket !== -1 && lastBracket < cleanedResponse.length - 1) {
        cleanedResponse = cleanedResponse.substring(0, lastBracket + 1);
      }

      suggestions = JSON.parse(cleanedResponse);

      // Validate structure
      if (!Array.isArray(suggestions)) {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      console.error('Parse error:', parseError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to parse AI response. The AI did not return valid JSON.',
          rawResponse: aiResponse.substring(0, 500), // Limit size
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      suggestions,
      totalWords: words.length,
      improvedWords: suggestions.length,
    });
  } catch (error) {
    console.error('Error in /api/ai/improve-translations:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
