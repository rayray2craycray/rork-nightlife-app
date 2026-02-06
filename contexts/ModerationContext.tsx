/**
 * Moderation Context
 * Handles content reporting, user blocking, and moderation actions
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

interface ReportSubmission {
  contentType: 'video' | 'user' | 'comment' | 'message';
  contentId: string;
  reason: string;
  details: string;
  reportedUserId?: string;
}

interface BlockedUser {
  id: string;
  blockedUserId: {
    _id: string;
    username: string;
    displayName: string;
    profilePicture?: string;
  };
  createdAt: string;
}

interface ModerationContextType {
  // Report functions
  submitReport: (report: ReportSubmission) => Promise<void>;
  isSubmittingReport: boolean;

  // Block functions
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  isBlocking: boolean;
  isUnblocking: boolean;

  // Block list
  blockedUsers: BlockedUser[];
  isLoadingBlockedUsers: boolean;
  refetchBlockedUsers: () => void;

  // Check if user is blocked
  checkIfBlocked: (userId: string) => Promise<boolean>;
}

const ModerationContext = createContext<ModerationContextType | undefined>(undefined);

export function ModerationProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Submit report mutation
  const submitReportMutation = useMutation({
    mutationFn: async (report: ReportSubmission) => {
      const response = await api.post('/moderation/reports', report);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate any relevant queries
      queryClient.invalidateQueries({ queryKey: ['my-reports'] });
    },
  });

  // Block user mutation
  const blockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.post('/moderation/block', { userId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
    },
  });

  // Unblock user mutation
  const unblockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.delete(`/moderation/block/${userId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
    },
  });

  // Get blocked users query
  const { data: blockedUsersData, isLoading: isLoadingBlockedUsers, refetch: refetchBlockedUsers } = useQuery({
    queryKey: ['blocked-users'],
    queryFn: async () => {
      const response = await api.get('/moderation/blocked');
      return response.data.data as BlockedUser[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Check if user is blocked
  const checkIfBlocked = async (userId: string): Promise<boolean> => {
    try {
      const response = await api.get(`/moderation/blocked/check/${userId}`);
      return response.data.data.isBlocked;
    } catch (error) {
      console.error('Error checking if user is blocked:', error);
      return false;
    }
  };

  const value: ModerationContextType = {
    submitReport: submitReportMutation.mutateAsync,
    isSubmittingReport: submitReportMutation.isPending,

    blockUser: blockUserMutation.mutateAsync,
    unblockUser: unblockUserMutation.mutateAsync,
    isBlocking: blockUserMutation.isPending,
    isUnblocking: unblockUserMutation.isPending,

    blockedUsers: blockedUsersData || [],
    isLoadingBlockedUsers,
    refetchBlockedUsers,

    checkIfBlocked,
  };

  return (
    <ModerationContext.Provider value={value}>
      {children}
    </ModerationContext.Provider>
  );
}

export function useModeration() {
  const context = useContext(ModerationContext);
  if (context === undefined) {
    throw new Error('useModeration must be used within a ModerationProvider');
  }
  return context;
}
