import { useQuery, useMutation, useQueryClient } from 'react-query';
import { paymentAPI } from '../services/paymentAPI';
import toast from 'react-hot-toast';

export const usePayments = {
  // Get payment history
  useHistory: (params = {}) => {
    return useQuery(
      ['payment-history', params],
      () => paymentAPI.getPaymentHistory(params),
      {
        staleTime: 5 * 60 * 1000,
        keepPreviousData: true,
      }
    );
  },

  // Get payment stats
  useStats: () => {
    return useQuery(
      'payment-stats',
      paymentAPI.getPaymentStats,
      {
        staleTime: 10 * 60 * 1000,
      }
    );
  },

  // Get specific payment
  usePayment: (paymentId) => {
    return useQuery(
      ['payment', paymentId],
      () => paymentAPI.getPayment(paymentId),
      {
        enabled: !!paymentId,
        staleTime: 10 * 60 * 1000,
      }
    );
  },

  // Create certificate order
  useCreateCertificateOrder: () => {
    return useMutation(
      paymentAPI.createCertificateOrder,
      {
        onError: (error) => {
          toast.error(error.response?.data?.message || 'Failed to create order');
        },
      }
    );
  },

  // Create paid task order
  useCreatePaidTaskOrder: () => {
    return useMutation(
      paymentAPI.createPaidTaskOrder,
      {
        onError: (error) => {
          toast.error(error.response?.data?.message || 'Failed to create order');
        },
      }
    );
  },

  // Verify payment
  useVerifyPayment: () => {
    const queryClient = useQueryClient();
    
    return useMutation(
      paymentAPI.verifyPayment,
      {
        onSuccess: (data) => {
          toast.success('Payment verified successfully! 🎉');
          queryClient.invalidateQueries('payment-history');
          queryClient.invalidateQueries('certificates');
          queryClient.invalidateQueries('certificate-eligibility');
          queryClient.invalidateQueries('dashboard');
        },
        onError: (error) => {
          toast.error(error.response?.data?.message || 'Payment verification failed');
        },
      }
    );
  },
};