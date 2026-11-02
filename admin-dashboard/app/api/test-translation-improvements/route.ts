import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/test-translation-improvements
 *
 * Tests if the translation_improvements table exists and is accessible
 */
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Test 1: Simple count query
    const { count, error: countError } = await supabaseAdmin
      .from('translation_improvements')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json({
        success: false,
        test: 'count query',
        error: countError.message,
        details: countError.details,
        hint: countError.hint,
        code: countError.code,
      });
    }

    // Test 2: Simple select
    const { data, error: selectError } = await supabaseAdmin
      .from('translation_improvements')
      .select('*')
      .limit(1);

    if (selectError) {
      return NextResponse.json({
        success: false,
        test: 'select query',
        error: selectError.message,
        details: selectError.details,
        hint: selectError.hint,
        code: selectError.code,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Table exists and is accessible',
      rowCount: count,
      sampleData: data,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });
  }
}
