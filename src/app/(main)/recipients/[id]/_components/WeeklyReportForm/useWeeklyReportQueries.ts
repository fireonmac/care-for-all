import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  deleteRecord, 
  updateWeeklyRecord, 
  getInitialWeeklyReportStatus,
  getWeeklyRecord,
  generateWeeklyReportBackground
} from '../../actions';
import { useRouter } from 'next/navigation';

export const useWeeklyReportInitialQuery = (recipientId: string, targetDate: string) => {
  return useQuery({
    queryKey: ['weeklyReport', 'initial', recipientId, targetDate],
    queryFn: async () => {
      const data = await getInitialWeeklyReportStatus(recipientId, targetDate);
      return data;
    },
    enabled: !!targetDate,
  });
};

export const useWeeklyRecordPollingQuery = (recordId: string | null | undefined) => {
  return useQuery({
    queryKey: ['weeklyReport', 'record', recordId],
    queryFn: async () => {
      if (!recordId) throw new Error('No record ID');
      const data = await getWeeklyRecord(recordId);
      return data;
    },
    refetchInterval: (query) => query.state.data?.status === 'PROCESSING' ? 3000 : false,
    enabled: !!recordId,
  });
};

export const useGenerateWeeklyReportMutation = () => {
  return useMutation({
    mutationFn: async ({ recipientId, targetDate }: { recipientId: string, targetDate: string }) => {
      const data = await generateWeeklyReportBackground(recipientId, targetDate);
      if (!data.recordId) throw new Error('No recordId returned');
      return data as { recordId: string };
    }
  });
};

export const useUpdateWeeklyRecordMutation = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ recordId, content }: { recordId: string, content: string }) => {
      return updateWeeklyRecord(recordId, content);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['weeklyReport', 'record', variables.recordId] });
      router.refresh();
    }
  });
};

export const useDeleteWeeklyRecordMutation = (recipientId: string, targetDate: string) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (recordId: string) => {
      return deleteRecord(recordId);
    },
    onSuccess: () => {
      // Invalidate both initial search and the specific record query
      queryClient.invalidateQueries({ queryKey: ['weeklyReport'] });
      router.refresh();
    }
  });
};
