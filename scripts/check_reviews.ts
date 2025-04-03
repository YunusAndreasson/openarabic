import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kkmnzbeugdoajtzfjkxg.supabase.co';
const supabaseKey =
  'REDACTED_LEAKED_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReviews() {
  // Get the last 7 days of reviews
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  console.log('Checking reviews from:', sevenDaysAgo.toISOString());
  console.log('Until:', now.toISOString());

  // Check reviews table
  const { data: reviews, error: reviewsError } = await supabase
    .from('reviews')
    .select('*')
    .gte('reviewed_at', sevenDaysAgo.toISOString())
    .order('reviewed_at', { ascending: false });

  if (reviewsError) {
    console.error('Error fetching reviews:', reviewsError);
    return;
  }

  console.log('\nRecent reviews:', reviews?.length || 0);
  if (reviews && reviews.length > 0) {
    // Group reviews by date
    const reviewsByDate = reviews.reduce((acc: any, review) => {
      const date = new Date(review.reviewed_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(review);
      return acc;
    }, {});

    // Print reviews by date
    Object.entries(reviewsByDate).forEach(([date, dateReviews]: [string, any]) => {
      console.log(`\n${date}: ${dateReviews.length} reviews`);
    });
  }

  // Check fsrs_logs table
  const { data: logs, error: logsError } = await supabase
    .from('fsrs_logs')
    .select('*')
    .gte('review_date', sevenDaysAgo.toISOString())
    .order('review_date', { ascending: false });

  if (logsError) {
    console.error('Error fetching FSRS logs:', logsError);
    return;
  }

  console.log('\nRecent FSRS logs:', logs?.length || 0);
  if (logs && logs.length > 0) {
    // Group logs by date
    const logsByDate = logs.reduce((acc: any, log) => {
      const date = new Date(log.review_date).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(log);
      return acc;
    }, {});

    // Print logs by date
    Object.entries(logsByDate).forEach(([date, dateLogs]: [string, any]) => {
      console.log(`\n${date}: ${dateLogs.length} logs`);
    });
  }
}

checkReviews().catch(console.error);
