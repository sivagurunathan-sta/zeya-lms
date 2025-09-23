import { useQuery, useMutation, useQueryClient } from 'react-query';
import { taskAPI } from '../services/taskAPI';
import toast from 'react-hot-toast';

export const useTasks = {
  // Get all tasks
  useList: (params = {}) => {
    return useQuery(
      ['tasks', params],
      () => taskAPI.getTasks(params),
      {
        staleTime: 10 * 60 * 1000, // 10 minutes
        keepPreviousData: true,
      }
    );
  },

  // Get specific task
  useTask: (taskId) => {
    return useQuery(
      ['task', taskId],
      () => taskAPI.getTask(taskId),
      {
        enabled: !!taskId,
        staleTime: 5 * 60 * 1000,
      }
    );
  },

  // Get submissions
  useSubmissions: (params = {}) => {
    return useQuery(
      ['submissions', params],
      () => taskAPI.getSubmissions(params),
      {
        staleTime: 5 * 60 * 1000,
        keepPreviousData: true,
      }
    );
  },

  // Get paid tasks
  usePaidTasks: () => {
    return useQuery(
      'paid-tasks',
      taskAPI.getPaidTasks,
      {
        staleTime: 10 * 60 * 1000,
      }
    );
  },

  // Submit task
  useSubmit: () => {
    const queryClient = useQueryClient();
    
    return useMutation(
      ({ taskId, data }) => taskAPI.submitTask(taskId, data),
      {
        onSuccess: (data, variables) => {
          toast.success('Task submitted successfully! 🎯');
          queryClient.invalidateQueries(['task', variables.taskId]);
          queryClient.invalidateQueries('tasks');
          queryClient.invalidateQueries('submissions');
          queryClient.invalidateQueries('dashboard');
        },
        onError: (error) => {
          toast.error(error.response?.data?.message || 'Failed to submit task');
        },
      }
    );
  },

  // Skip task
  useSkip: () => {
    const queryClient = useQueryClient();
    
    return useMutation(
      taskAPI.skipTask,
      {
        onSuccess: (data, taskId) => {
          toast.success('Task skipped');
          queryClient.invalidateQueries(['task', taskId]);
          queryClient.invalidateQueries('tasks');
          queryClient.invalidateQueries('dashboard');
        },
        onError: (error) => {
          toast.error(error.response?.data?.message || 'Failed to skip task');
        },
      }
    );
  },
};