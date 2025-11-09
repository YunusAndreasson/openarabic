import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type RootImprovement = Database['public']['Tables']['root_translation_improvements']['Row'];
type Root = Database['public']['Tables']['roots']['Row'];

interface RootImprovementWithContext extends RootImprovement {
  roots: Root | null;
}

/**
 * GET /api/root-improvements
 *
 * Fetches root translation improvement suggestions
 * Query params:
 *   - status: 'pending' | 'approved' | 'rejected' (default: 'pending')
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';

    // Fetch improvements with root context
    const { data: improvements, error: improvementsError } = await supabase
      .from('root_translation_improvements')
      .select(
        `
        *,
        roots (
          id,
          letters,
          meaning
        )
      `,
      )
      .eq('status', status)
      .order('created_at', { ascending: true });

    if (improvementsError) {
      console.error('Error fetching root improvements:', improvementsError);
      throw improvementsError;
    }

    return NextResponse.json({
      success: true,
      data: (improvements || []) as RootImprovementWithContext[],
      count: improvements?.length || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/root-improvements:', error);

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

/**
 * PATCH /api/root-improvements
 *
 * Handles individual approve/reject or bulk operations
 * Body for single action:
 *   - id: number (improvement ID)
 *   - action: 'approve' | 'reject'
 *
 * Body for bulk reject:
 *   - action: 'bulk-reject'
 *   - ids: number[] (array of improvement IDs to reject)
 *
 * Body for bulk apply all:
 *   - action: 'apply-all-pending'
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, ids } = body;

    // Validate inputs
    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: action' },
        { status: 400 },
      );
    }

    // Handle bulk reject
    if (action === 'bulk-reject') {
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Missing or invalid ids array for bulk reject' },
          { status: 400 },
        );
      }

      const { error: rejectError } = await supabase
        .from('root_translation_improvements')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .in('id', ids);

      if (rejectError) {
        console.error('Error bulk rejecting improvements:', rejectError);
        throw rejectError;
      }

      return NextResponse.json({
        success: true,
        message: `${ids.length} improvements rejected`,
        count: ids.length,
      });
    }

    // Handle apply all pending
    if (action === 'apply-all-pending') {
      // Get all pending improvements
      const { data: pendingImprovements, error: fetchError } = await supabase
        .from('root_translation_improvements')
        .select('*')
        .eq('status', 'pending');

      if (fetchError) {
        console.error('Error fetching pending improvements:', fetchError);
        throw fetchError;
      }

      if (!pendingImprovements || pendingImprovements.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No pending improvements to apply',
          count: 0,
        });
      }

      // Update each root with the suggested values
      const updatePromises = pendingImprovements.map(async improvement => {
        const updateData: any = {};

        if (improvement.suggested_english) {
          updateData.meaning = improvement.suggested_english;
        }
        if (improvement.suggested_tashkeel) {
          updateData.letters = improvement.suggested_tashkeel;
        }

        if (Object.keys(updateData).length > 0) {
          return supabase
            .from('roots')
            .update(updateData)
            .eq('id', improvement.root_id);
        }
        return null;
      });

      await Promise.all(updatePromises.filter(p => p !== null));

      // Mark all as approved
      const { error: approveError } = await supabase
        .from('root_translation_improvements')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('status', 'pending');

      if (approveError) {
        console.error('Error approving improvements:', approveError);
        throw approveError;
      }

      return NextResponse.json({
        success: true,
        message: `Applied ${pendingImprovements.length} root improvements`,
        count: pendingImprovements.length,
      });
    }

    // Handle single approve/reject
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 },
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: id' },
        { status: 400 },
      );
    }

    // Get the improvement record
    const { data: improvement, error: fetchError } = await supabase
      .from('root_translation_improvements')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !improvement) {
      console.error('Error fetching improvement:', fetchError);
      return NextResponse.json({ success: false, error: 'Improvement not found' }, { status: 404 });
    }

    // If approving, apply changes to roots table
    if (action === 'approve') {
      const updateData: any = {};

      if (improvement.suggested_english) {
        updateData.meaning = improvement.suggested_english;
      }
      if (improvement.suggested_tashkeel) {
        updateData.letters = improvement.suggested_tashkeel;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('roots')
          .update(updateData)
          .eq('id', improvement.root_id);

        if (updateError) {
          console.error('Error updating root:', updateError);
          throw updateError;
        }
      }
    }

    // Update improvement status
    const { data: updated, error: statusError } = await supabase
      .from('root_translation_improvements')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        updated_at: new Date().toISOString(),
      })
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
          ? 'Root improvement approved and applied'
          : 'Root improvement rejected',
    });
  } catch (error) {
    console.error('Error in PATCH /api/root-improvements:', error);

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
