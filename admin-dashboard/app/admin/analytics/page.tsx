'use client';

import { useHardWordsAnalytics } from '@/hooks/useHardWordsAnalytics';
import { useContentCompletenessAnalytics } from '@/hooks/useContentCompletenessAnalytics';
import { useUserStudyAnalytics } from '@/hooks/useUserStudyAnalytics';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Database, TrendingUp, AlertTriangle, CheckCircle2, Users } from 'lucide-react';

export default function AnalyticsPage() {
  const { isLoading: hardWordsLoading, hardWords, error: hardWordsError, refresh: refreshHardWords } = useHardWordsAnalytics();
  const { isLoading: completenessLoading, stats: completenessStats, error: completenessError, refresh: refreshCompleteness } = useContentCompletenessAnalytics();
  const { isLoading: userStatsLoading, stats: userStats, error: userStatsError, refresh: refreshUserStats } = useUserStudyAnalytics();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          View insights on word difficulty, content completeness, and user study patterns
        </p>
      </div>

      {/* Hard Words Analytics */}
      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-semibold">Hard Words Leaderboard</h2>
          </div>
          <Button
            onClick={refreshHardWords}
            disabled={hardWordsLoading}
            size="sm"
            variant="outline"
            className="cursor-pointer"
          >
            {hardWordsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {hardWordsError && (
          <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg mb-4">
            <p className="text-sm text-destructive">{hardWordsError}</p>
          </div>
        )}

        {hardWordsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : hardWords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No Study Data Available</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              The study_words and reviews tables require authentication to access user data.
              These analytics need a service role key or authenticated session to display.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Top 50 most difficult words based on FSRS difficulty, lapses, and review grades
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-sm font-medium">Rank</th>
                    <th className="text-right p-2 text-sm font-medium">Root Letters</th>
                    <th className="text-left p-2 text-sm font-medium">Meaning</th>
                    <th className="text-center p-2 text-sm font-medium">Difficulty</th>
                    <th className="text-center p-2 text-sm font-medium">Lapses</th>
                    <th className="text-center p-2 text-sm font-medium">Avg Grade</th>
                    <th className="text-center p-2 text-sm font-medium">Reviews</th>
                    <th className="text-center p-2 text-sm font-medium">Users</th>
                  </tr>
                </thead>
                <tbody>
                  {hardWords.slice(0, 20).map((word, index) => (
                    <tr key={word.root_letters} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-2 text-sm">{index + 1}</td>
                      <td className="p-2 text-right text-lg font-medium">{word.root_letters}</td>
                      <td className="p-2 text-sm">{word.root_meaning}</td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          word.avg_difficulty > 8 ? 'bg-red-100 text-red-800' :
                          word.avg_difficulty > 6 ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {word.avg_difficulty.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-2 text-center text-sm">{word.avg_lapses.toFixed(1)}</td>
                      <td className="p-2 text-center text-sm">{word.avg_grade.toFixed(1)}</td>
                      <td className="p-2 text-center text-sm">{word.total_reviews}</td>
                      <td className="p-2 text-center text-sm">{word.user_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Content Completeness Analytics */}
      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h2 className="text-xl font-semibold">Content Completeness</h2>
          </div>
          <Button
            onClick={refreshCompleteness}
            disabled={completenessLoading}
            size="sm"
            variant="outline"
            className="cursor-pointer"
          >
            {completenessLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {completenessError && (
          <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg mb-4">
            <p className="text-sm text-destructive">{completenessError}</p>
          </div>
        )}

        {completenessLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Completeness</span>
                <span className="text-2xl font-bold">{completenessStats.completenessPercentage}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    completenessStats.completenessPercentage >= 90 ? 'bg-green-500' :
                    completenessStats.completenessPercentage >= 70 ? 'bg-yellow-500' :
                    'bg-orange-500'
                  }`}
                  style={{ width: `${completenessStats.completenessPercentage}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-background">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Sentences</span>
                  <span className="text-xl font-bold">{completenessStats.totalSentences.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-background">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Words</span>
                  <span className="text-xl font-bold">{completenessStats.totalWords.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-orange-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Missing English Audio</span>
                  <span className="text-xl font-bold text-orange-600">{completenessStats.missingEnglishAudio}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {completenessStats.totalSentences > 0
                    ? `${((completenessStats.missingEnglishAudio / completenessStats.totalSentences) * 100).toFixed(1)}% of sentences`
                    : 'N/A'}
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-orange-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Missing Arabic Audio</span>
                  <span className="text-xl font-bold text-orange-600">{completenessStats.missingArabicAudio}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {completenessStats.totalSentences > 0
                    ? `${((completenessStats.missingArabicAudio / completenessStats.totalSentences) * 100).toFixed(1)}% of sentences`
                    : 'N/A'}
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-red-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Missing Both Audios</span>
                  <span className="text-xl font-bold text-red-600">{completenessStats.missingBothAudio}</span>
                </div>
                <div className="text-xs text-muted-foreground">Critical: No audio available</div>
              </div>

              <div className="p-4 border rounded-lg bg-yellow-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Missing Grammar Notes</span>
                  <span className="text-xl font-bold text-yellow-600">{completenessStats.missingGrammarNotes}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {completenessStats.totalWords > 0
                    ? `${((completenessStats.missingGrammarNotes / completenessStats.totalWords) * 100).toFixed(1)}% of words`
                    : 'N/A'}
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-yellow-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Missing Difficulty Level</span>
                  <span className="text-xl font-bold text-yellow-600">{completenessStats.missingDifficultyLevel}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {completenessStats.totalWords > 0
                    ? `${((completenessStats.missingDifficultyLevel / completenessStats.totalWords) * 100).toFixed(1)}% of words`
                    : 'N/A'}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* User Study Analytics */}
      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-semibold">User Study Analytics</h2>
          </div>
          <Button
            onClick={refreshUserStats}
            disabled={userStatsLoading}
            size="sm"
            variant="outline"
            className="cursor-pointer"
          >
            {userStatsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {userStatsError && (
          <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg mb-4">
            <p className="text-sm text-destructive">{userStatsError}</p>
          </div>
        )}

        {userStatsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 border rounded-lg bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Users</span>
                </div>
                <p className="text-2xl font-bold">{userStats.totalUsers.toLocaleString()}</p>
              </div>

              <div className="p-4 border rounded-lg bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Words Studied</span>
                </div>
                <p className="text-2xl font-bold">{userStats.totalWords.toLocaleString()}</p>
              </div>

              <div className="p-4 border rounded-lg bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Mastered Words</span>
                </div>
                <p className="text-2xl font-bold">{userStats.masteredWords.toLocaleString()}</p>
              </div>

              <div className="p-4 border rounded-lg bg-orange-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Due Words</span>
                  <span className="text-xl font-bold text-orange-600">{userStats.dueWords.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Learning Words</span>
                  <span className="text-xl font-bold text-blue-600">{userStats.learningWords.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Avg Words/User</span>
                  <span className="text-xl font-bold text-blue-600">{userStats.avgWordsPerUser}</span>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-purple-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Avg Difficulty</span>
                  <span className="text-xl font-bold text-purple-600">{userStats.avgDifficulty.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-green-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Avg Stability</span>
                  <span className="text-xl font-bold text-green-600">{userStats.avgStability.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {userStats.topUsers.length > 0 && (
              <>
                <h3 className="font-semibold mb-3">Top 10 Users by Total Words</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 text-sm font-medium">Rank</th>
                        <th className="text-left p-2 text-sm font-medium">User ID</th>
                        <th className="text-center p-2 text-sm font-medium">Total Words</th>
                        <th className="text-center p-2 text-sm font-medium">Due</th>
                        <th className="text-center p-2 text-sm font-medium">Mastered</th>
                        <th className="text-center p-2 text-sm font-medium">Difficulty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userStats.topUsers.map((user, index) => (
                        <tr key={user.user_id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="p-2 text-sm">{index + 1}</td>
                          <td className="p-2 text-sm font-mono">{user.user_id.slice(0, 8)}...</td>
                          <td className="p-2 text-center text-sm font-medium">{user.total_words}</td>
                          <td className="p-2 text-center text-sm">{user.due_words}</td>
                          <td className="p-2 text-center text-sm">{user.mastered_words}</td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              user.avg_difficulty > 8 ? 'bg-red-100 text-red-800' :
                              user.avg_difficulty > 6 ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {user.avg_difficulty.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
