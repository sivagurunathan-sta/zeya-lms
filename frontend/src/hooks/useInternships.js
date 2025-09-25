import { useQuery, useMutation, useQueryClient } from 'react-query';
import { internshipAPI } from '../services/internshipAPI';
import toast from 'react-hot-toast';

export const useInternships = {
  // Get current internship
  useCurrent: () => {
    return useQuery(
      'current-internship',
      internshipAPI.getCurrentInternship,
      {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
      }
    );
  },

  // Get dashboard data
  useDashboard: () => {
    return useQuery(
      'dashboard',
      internshipAPI.getDashboard,
      {
        staleTime: 2 * 60 * 1000, // 2 minutes
        refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
      }
    );
  },

  // Get progress
  useProgress: () => {
    return useQuery(
      'internship-progress',
      internshipAPI.getProgress,
      {
        staleTime: 5 * 60 * 1000,
      }
    );
  },

  // Get history
  useHistory: () => {
    return useQuery(
      'internship-history',
      internshipAPI.getHistory,
      {
        staleTime: 10 * 60 * 1000,
      }
    );
  },

  // Start internship
  useStart: () => {
    const queryClient = useQueryClient();
    
    return useMutation(
      internshipAPI.startInternship,
      {
        onSuccess: (data) => {
          toast.success('Internship started successfully! 🎉');
          queryClient.invalidateQueries('current-internship');
          queryClient.invalidateQueries('dashboard');
        },
        onError: (error) => {
          toast.error(error.response?.data?.message || 'Failed to start internship');
        },
      }
    );
  },

  // Complete internship
  useComplete: () => {
    const queryClient = useQueryClient();
    
    return useMutation(
      internshipAPI.completeInternship,
      {
        onSuccess: (data) => {
          toast.success('Internship completed! 🎊');
          queryClient.invalidateQueries('current-internship');
          queryClient.invalidateQueries('dashboard');
          queryClient.invalidateQueries('internship-progress');
        },
        onError: (error) => {
          toast.error(error.response?.data?.message || 'Failed to complete internship');
        },
      }
    );
  },
};