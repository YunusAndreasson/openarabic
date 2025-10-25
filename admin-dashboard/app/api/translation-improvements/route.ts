import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type TranslationImprovement = Database['public']['Tables']['translation_improvements']['Row'];
type SentenceWord = Database['public']['Tables']['sentence_words']['Row'];

interface TranslationImprovementWithContext extends TranslationImprovement {
  sentence_words: SentenceWord & {
    article_sentences: {
      id: number;
      arabic: string;
      english: string;
      articles: {
        id: number;
        title: string;
      } | null;
    } | null;
  };
}

/**
 * GET /api/translation-improvements
 *
 * Fetches translation improvement suggestions with full context
 * Query params:
 *   - status: 'pending' | 'approved' | 'rejected' (default: 'pending')
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';

    // Fetch improvements with word context
    const { data: improvements, error: improvementsError } = await supabase
      .from('translation_improvements')
      .select(
        `
        *,
        sentence_words (
          id,
          word_form,
          english,
          grammar_note,
          position,
          sentence_id
        )
      `,
      )
      .eq('status', status)
      .order('created_at', { ascending: true });

    if (improvementsError) {
      console.error('Error fetching translation improvements:', improvementsError);
      throw improvementsError;
    }

    if (!improvements || improvements.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
      });
    }

    // Get unique sentence IDs to fetch sentence data
    const sentenceIds = [
      ...new Set(
        improvements
          .map(imp => imp.sentence_words?.sentence_id)
          .filter((id): id is number => id !== null && id !== undefined),
      ),
    ];

    // Fetch sentence data with article info
    const { data: sentences, error: sentencesError } = await supabase
      .from('article_sentences')
      .select(
        `
        id,
        arabic,
        english,
        position,
        article_id,
        articles (
          id,
          title
        )
      `,
      )
      .in('id', sentenceIds);

    if (sentencesError) {
      console.error('Error fetching sentences:', sentencesError);
      // Continue without sentence data rather than failing
    }

    // Create a map of sentence data by ID
    const sentenceMap = new Map((sentences || []).map(s => [s.id, s]));

    // Merge the data
    const enrichedData = improvements.map(imp => ({
      ...imp,
      sentence_words: imp.sentence_words
        ? {
            ...imp.sentence_words,
            article_sentences: imp.sentence_words.sentence_id
              ? sentenceMap.get(imp.sentence_words.sentence_id) || null
              : null,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: enrichedData as TranslationImprovementWithContext[],
      count: enrichedData.length,
    });
  } catch (error) {
    console.error('Error in GET /api/translation-improvements:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorDetails = error instanceof Error ? error.stack : String(error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/translation-improvements
 *
 * Updates a translation improvement and optionally applies changes to sentence_words
 * Body:
 *   - id: number (improvement ID)
 *   - action: 'approve' | 'reject'
 *   - suggested_english?: string (updated suggestion, optional)
 *   - suggested_grammar_note?: string | null (updated grammar note, optional)
 *   - reviewer_notes?: string (optional notes from reviewer)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, suggested_english, suggested_grammar_note, reviewer_notes } = body;

    // Validate inputs
    if (!id || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id, action' },
        { status: 400 },
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 },
      );
    }

    // Get the improvement record
    const { data: improvement, error: fetchError } = await supabase
      .from('translation_improvements')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !improvement) {
      console.error('Error fetching improvement:', fetchError);
      return NextResponse.json({ success: false, error: 'Improvement not found' }, { status: 404 });
    }

    // If approving, apply changes to sentence_words table
    if (action === 'approve') {
      const englishToUpdate = suggested_english || improvement.suggested_english;
      const grammarNoteToUpdate =
        suggested_grammar_note !== undefined
          ? suggested_grammar_note
          : improvement.suggested_grammar_note;

      const { error: updateError } = await supabase
        .from('sentence_words')
        .update({
          english: englishToUpdate,
          grammar_note: grammarNoteToUpdate,
        })
        .eq('id', improvement.sentence_word_id);

      if (updateError) {
        console.error('Error updating sentence_words:', updateError);
        throw updateError;
      }
    }

    // Update improvement status
    const updateData: Database['public']['Tables']['translation_improvements']['Update'] = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewer_notes,
      updated_at: new Date().toISOString(),
    };

    // If suggestion was edited, update those fields too
    if (suggested_english) {
      updateData.suggested_english = suggested_english;
    }
    if (suggested_grammar_note !== undefined) {
      updateData.suggested_grammar_note = suggested_grammar_note;
    }

    const { data: updated, error: statusError } = await supabase
      .from('translation_improvements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (statusError) {
      console.error('Error updating improvement status:', statusError);
      throw statusError;
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message:
        action === 'approve'
          ? 'Translation improvement approved and applied'
          : 'Translation improvement rejected',
    });
  } catch (error) {
    console.error('Error in PATCH /api/translation-improvements:', error);

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
