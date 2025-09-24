import { useQuery, useMutation, useQueryClient } from 'react-query';
import { certificateAPI } from '../services/certificateAPI';
import toast from 'react-hot-toast';

export const useCertificates = {
  // Check eligibility
  useEligibility: () => {
    return useQuery(
      'certificate-eligibility',
      certificateAPI.checkEligibility,
      {
        staleTime: 5 * 60 * 1000,
      }
    );
  },

  // Get certificates
  useList: () => {
    return useQuery(
      'certificates',
      certificateAPI.getCertificates,
      {
        staleTime: 10 * 60 * 1000,
      }
    );
  },

  // Get specific certificate
  useCertificate: (certificateId) => {
    return useQuery(
      ['certificate', certificateId],
      () => certificateAPI.getCertificate(certificateId),
      {
        enabled: !!certificateId,
        staleTime: 10 * 60 * 1000,
      }
    );
  },

  // Get analytics
  useAnalytics: () => {
    return useQuery(
      'certificate-analytics',
      certificateAPI.getAnalytics,
      {
        staleTime: 10 * 60 * 1000,
      }
    );
  },

  // Get leaderboard
  useLeaderboard: (limit = 10) => {
    return useQuery(
      ['certificate-leaderboard', limit],
      () => certificateAPI.getLeaderboard(limit),
      {
        staleTime: 10 * 60 * 1000,
      }
    );
  },

  // Preview certificate
  usePreview: () => {
    return useMutation(
      certificateAPI.previewCertificate,
      {
        onError: (error) => {
          toast.error(error.response?.data?.message || 'Failed to generate preview');
        },
      }
    );
  },

  // Download certificate
  useDownload: () => {
    return useMutation(
      certificateAPI.downloadCertificate,
      {
        onSuccess: (data) => {
          if (data?.downloadUrl) {
            window.open(data.downloadUrl, '_blank');
          }
        },
        onError: (error) => {
          toast.error(error.response?.data?.message || 'Failed to download certificate');
        },
      }
    );
  },

  // Share certificate
  useShare: () => {
    return useMutation(
      ({ certificateId, platform }) => certificateAPI.shareCertificate(certificateId, platform),
      {
        onSuccess: (data) => {
          if (data?.url) {
            window.open(data.url, '_blank');
          }
          toast.success('Share link generated!');
        },
        onError: (error) => {
          toast.error(error.response?.data?.message || 'Failed to generate share link');
        },
      }
    );
  },
};
