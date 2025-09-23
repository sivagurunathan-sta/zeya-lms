import { useQuery, useMutation, useQueryClient } from 'react-query';
import { userAPI } from '../services/userAPI';
import toast from 'react-hot-toast';

export const useNotifications = () => {
  const queryClient = useQueryClient();

  // Get notifications
  const {
    data: notificationsData,
    isLoading,
    error,
  } = useQuery(
    'notifications',
    () => userAPI.getNotifications({ limit: 20 }),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    }
  );

  // Mark as read mutation
  const markAsReadMutation = useMutation(
    userAPI.markNotificationAsRead,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('notifications');
      },
      onError: (error) => {
        toast.error('Failed to mark notification as read');
      },
    }
  );

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation(
    userAPI.markAllNotificationsAsRead,
    {
      onSuccess: () => {
        toast.success('All notifications marked as read');
        queryClient.invalidateQueries('notifications');
      },
      onError: (error) => {
        toast.error('Failed to mark all notifications as read');
      },
    }
  );

  return {
    notifications: notificationsData?.notifications || [],
    unreadCount: notificationsData?.unreadCount || 0,
    isLoading,
    error,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isLoading,
    isMarkingAllAsRead: markAllAsReadMutation.isLoading,
  };
};
