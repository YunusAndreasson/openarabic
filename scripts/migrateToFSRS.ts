import { createClient } from '@supabase/supabase-js';
import { createEmptyCard, fsrs, generatorParameters } from 'ts-fsrs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize FSRS algorithm with default parameters
const params = generatorParameters({ enable_fuzz: true });
const fsrsInstance = fsrs(params);

/**
 * Migrate existing study words to use FSRS fields
 */
async function migrateToFSRS() {
  console.log('Starting migration to FSRS...');

  try {
    // Get all study words without the FSRS fields set
    const { data: studyWords, error } = await supabase
      .from('study_words')
      .select('*')
      .is('fsrs_due', null);

    if (error) {
      throw error;
    }

    if (!studyWords || studyWords.length === 0) {
      console.log('No study words to migrate.');
      return;
    }

    console.log(`Found ${studyWords.length} study words to migrate.`);

    // Process in batches to avoid overwhelming the database
    const BATCH_SIZE = 50;
    const totalBatches = Math.ceil(studyWords.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * BATCH_SIZE;
      const batchEnd = Math.min((batchIndex + 1) * BATCH_SIZE, studyWords.length);
      const batch = studyWords.slice(batchStart, batchEnd);

      console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} words)...`);

      // Process each word in the batch
      const updates = batch.map(word => {
        // Create a new empty FSRS card
        const now = new Date();
        const emptyCard = createEmptyCard(now);

        // Set state based on existing data
        // If word has been reviewed before, set to Review state
        // Otherwise keep as New state
        const state = word.review_count > 0 ? 2 : 0; // 0 = New, 2 = Review

        // Calculate initial difficulty from existing ease factor if available
        // FSRS difficulty ranges from 0 to 1, where 0.3 is the default
        // SM-2 ease factor typically ranges from 1.3 to 2.5, with 2.5 being the default
        let difficulty = 0.3; // Default difficulty
        if (word.ease_factor) {
          // Map ease_factor (1.3-2.5) to difficulty (0-1)
          // Lower ease factor = higher difficulty
          difficulty = Math.max(0, Math.min(1, 1 - (word.ease_factor - 1.3) / 1.2));
        }

        // Set stability based on interval_days or use default
        const stability = word.interval_days > 0 ? word.interval_days : emptyCard.stability;

        // Use scheduled review date or current date
        const due = word.next_review_at || now.toISOString();

        // Calculate days since last review if available
        const lastReview = word.last_review || null;
        let elapsed_days = 0;
        if (lastReview) {
          const lastReviewDate = new Date(lastReview);
          elapsed_days = (now.getTime() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24);
        }

        return {
          id: word.id,
          user_id: word.user_id,
          sentence_word_id: word.sentence_word_id,
          fsrs_due: due,
          fsrs_stability: stability,
          fsrs_difficulty: difficulty,
          fsrs_elapsed_days: elapsed_days,
          fsrs_scheduled_days: word.interval_days || 0,
          fsrs_reps: word.review_count || 0,
          fsrs_lapses: word.lapses || 0,
          fsrs_state: state,
          fsrs_last_review: lastReview,
        };
      });

      // Batch update the words
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('study_words')
          .update({
            fsrs_due: update.fsrs_due,
            fsrs_stability: update.fsrs_stability,
            fsrs_difficulty: update.fsrs_difficulty,
            fsrs_elapsed_days: update.fsrs_elapsed_days,
            fsrs_scheduled_days: update.fsrs_scheduled_days,
            fsrs_reps: update.fsrs_reps,
            fsrs_lapses: update.fsrs_lapses,
            fsrs_state: update.fsrs_state,
            fsrs_last_review: update.fsrs_last_review,
          })
          .eq('user_id', update.user_id)
          .eq('sentence_word_id', update.sentence_word_id);

        if (updateError) {
          console.error(
            `Error updating word ${update.sentence_word_id} for user ${update.user_id}:`,
            updateError
          );
        }
      }

      console.log(`Batch ${batchIndex + 1} completed.`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
migrateToFSRS()
  .then(() => {
    console.log('Migration script execution complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration script failed:', err);
    process.exit(1);
  });
