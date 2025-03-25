import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';

export function useVocabulary() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all study words for the current user
  const { data: studyWords, isLoading: studyWordsLoading } = useQuery({
    queryKey: ['studyWords', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      try {
        return await studyWordsFSRSService.getFSRSWords(user.id);
      } catch (error) {
        console.error('Error fetching study words:', error);
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch due words count for the current user
  const { data: dueWords, isLoading: dueWordsLoading } = useQuery({
    queryKey: ['dueWords', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      try {
        return await studyWordsFSRSService.getFSRSWords(user.id, { onlyDue: true });
      } catch (error) {
        console.error('Error fetching due words:', error);
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
  });

  // Mutation to toggle study word status
  const { mutate: toggleStudyWord, isPending: isToggling } = useMutation({
    mutationFn: async (sentenceWordId: number) => {
      if (!user?.id) throw new Error('User not authenticated');
      return studyWordsFSRSService.toggleFSRSStudyWord(user.id, sentenceWordId);
    },
    onSuccess: () => {
      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['studyWords', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['dueWords', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['vocabularyStats'] });
    },
  });

  // Calculate vocabulary statistics
  const { data: vocabularyStats, isLoading: statsLoading } = useQuery({
    queryKey: ['vocabularyStats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { total: 0, due: 0 };

      try {
        // Get stats data
        const statsData = await studyWordsFSRSService.getFSRSWords(user.id, { forStats: true });
        const dueWords = await studyWordsFSRSService.getFSRSWords(user.id, {
          onlyDue: true,
          forStats: true,
        });

        // Calculate due today and total counts
        return {
          total: statsData.length || 0,
          due: dueWords.length || 0,
        };
      } catch (error) {
        console.error('Error fetching vocabulary stats:', error);
        return { total: 0, due: 0 };
      }
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
  });

  // Check if a word is being studied
  const isStudying = (sentenceWordId: number) => {
    if (!studyWords) return false;
    return studyWords.some(word => word.sentence_word_id === sentenceWordId);
  };

  return {
    studyWords: studyWords || [],
    dueWords: dueWords || [],
    isStudying,
    toggleStudyWord,
    isLoading: studyWordsLoading || dueWordsLoading || statsLoading,
    isToggling,
    stats: vocabularyStats || { total: 0, due: 0 },
  };
}
