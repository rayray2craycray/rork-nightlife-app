import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  POSIntegration,
  POSProvider,
  POSCredentials,
  POSLocation,
  SpendRule,
  POSTransaction,
  SyncResult,
  RevenueStats,
} from '@/types';
import {
  mockPOSIntegration,
  mockPOSLocations,
  mockSpendRules,
} from '@/mocks/pos';
import { POS_CONFIG } from '@/constants/app';
import { api } from '@/services/api';

const STORAGE_KEYS = {
  POS_INTEGRATION: 'vibelink_pos_integration',
  POS_SPEND_RULES: 'vibelink_pos_spend_rules',
  POS_TRANSACTIONS: 'vibelink_pos_transactions',
};

export const [POSProvider, usePOS] = createContextHook(() => {
  const [integration, setIntegration] = useState<POSIntegration | null>(null);
  const [spendRules, setSpendRules] = useState<SpendRule[]>([]);
  const [transactions, setTransactions] = useState<POSTransaction[]>([]);
  const [availableLocations, setAvailableLocations] = useState<POSLocation[]>([]);

  // Load integration from AsyncStorage
  const integrationQuery = useQuery({
    queryKey: ['pos-integration'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.POS_INTEGRATION);
      if (stored) {
        return JSON.parse(stored) as POSIntegration;
      }
      // Development mode: return mock data
      if (process.env.NODE_ENV === 'development') {
        return mockPOSIntegration;
      }
      return null;
    },
  });

  // Load spend rules from AsyncStorage
  const spendRulesQuery = useQuery({
    queryKey: ['pos-spend-rules'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.POS_SPEND_RULES);
      if (stored) {
        return JSON.parse(stored) as SpendRule[];
      }
      // Development mode: return mock data
      if (process.env.NODE_ENV === 'development') {
        return mockSpendRules;
      }
      return [];
    },
  });

  // Load transactions from AsyncStorage
  const transactionsQuery = useQuery({
    queryKey: ['pos-transactions'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.POS_TRANSACTIONS);
      if (stored) {
        return JSON.parse(stored) as POSTransaction[];
      }
      return [];
    },
  });

  // Update state when queries complete
  useEffect(() => {
    if (integrationQuery.data !== undefined) {
      setIntegration(integrationQuery.data);
    }
  }, [integrationQuery.data]);

  useEffect(() => {
    if (spendRulesQuery.data) {
      setSpendRules(spendRulesQuery.data);
    }
  }, [spendRulesQuery.data]);

  useEffect(() => {
    if (transactionsQuery.data) {
      setTransactions(transactionsQuery.data);
    }
  }, [transactionsQuery.data]);

  /**
   * Connect POS system with API key
   * Replaces OAuth flow with simpler API key-based authentication
   */
  const connectPOS = useMutation({
    mutationFn: async ({
      venueId,
      provider,
      credentials,
    }: {
      venueId: string;
      provider: POSProvider;
      credentials: POSCredentials;
    }) => {
      // Update UI to show connecting state
      const connectingIntegration: POSIntegration = {
        id: 'temp-' + Date.now(),
        venueId,
        provider,
        status: 'VALIDATING',
        metadata: {},
        syncConfig: {
          enabled: false,
          interval: 300000, // 5 minutes
        },
      };
      setIntegration(connectingIntegration);

      // Development mode: simulate connection
      if (process.env.NODE_ENV === 'development') {
        await new Promise(resolve => setTimeout(resolve, POS_CONFIG.MOCK_CONNECTION_DELAY_MS));

        const connectedIntegration: POSIntegration = {
          ...connectingIntegration,
          id: 'pos-' + Date.now(),
          status: 'CONNECTED',
          metadata: {
            locationName: provider === 'TOAST' ? 'Toast Restaurant' : 'Square Location',
            merchantName: 'Demo Venue',
            currency: 'USD',
            timezone: 'America/New_York',
          },
          syncConfig: {
            enabled: true,
            interval: 300000,
            lastSyncAt: new Date().toISOString(),
            lastSyncStatus: 'SUCCESS',
          },
          connectedAt: new Date().toISOString(),
          stats: {
            transactionCount: 0,
            totalRevenue: 0,
            averageTransaction: 0,
          },
        };

        await AsyncStorage.setItem(
          STORAGE_KEYS.POS_INTEGRATION,
          JSON.stringify(connectedIntegration)
        );

        setAvailableLocations(mockPOSLocations.filter(loc => loc.provider === provider));
        return connectedIntegration;
      }

      // Production: Call backend API to validate and store credentials
      const response = await api.post('/pos/connect', {
        venueId,
        provider,
        credentials,
      });

      const connectedIntegration = response.data as POSIntegration;

      // Store integration locally
      await AsyncStorage.setItem(
        STORAGE_KEYS.POS_INTEGRATION,
        JSON.stringify(connectedIntegration)
      );

      return connectedIntegration;
    },
    onSuccess: (data) => {
      setIntegration(data);
    },
    onError: (error: any) => {
      console.error('[POS] Connection failed:', error);
      setIntegration(prev => prev ? { ...prev, status: 'ERROR' } : null);
    },
  });

  /**
   * Validate POS credentials before connecting
   * Allows users to test credentials before saving
   */
  const validateCredentials = useMutation({
    mutationFn: async ({
      provider,
      credentials,
    }: {
      provider: POSProvider;
      credentials: POSCredentials;
    }) => {
      // Development mode: always validate successfully
      if (process.env.NODE_ENV === 'development') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { valid: true, locationName: 'Demo Location' };
      }

      // Production: Call backend validation endpoint
      const response = await api.post('/pos/validate', {
        provider,
        credentials,
      });

      return response.data;
    },
  });

  /**
   * Disconnect POS system
   * Removes credentials from backend and local storage
   */
  const disconnectPOS = useMutation({
    mutationFn: async (venueId: string) => {
      if (!integration) {
        throw new Error('No POS integration to disconnect');
      }

      // Development mode: just clear local storage
      if (process.env.NODE_ENV === 'development') {
        await AsyncStorage.removeItem(STORAGE_KEYS.POS_INTEGRATION);
        await AsyncStorage.removeItem(STORAGE_KEYS.POS_TRANSACTIONS);
        setAvailableLocations([]);
        return null;
      }

      // Production: Call backend to delete integration
      await api.post(`/pos/disconnect/${venueId}`);

      // Clear local storage
      await AsyncStorage.removeItem(STORAGE_KEYS.POS_INTEGRATION);
      await AsyncStorage.removeItem(STORAGE_KEYS.POS_TRANSACTIONS);

      return null;
    },
    onSuccess: () => {
      setIntegration(null);
      setTransactions([]);
      setAvailableLocations([]);
    },
  });

  /**
   * Sync transactions from POS system
   * Fetches new transactions and processes spend rules
   */
  const syncTransactions = useMutation({
    mutationFn: async ({
      venueId,
      fromDate,
      toDate,
    }: {
      venueId: string;
      fromDate?: string;
      toDate?: string;
    }) => {
      if (!integration) {
        throw new Error('No POS integration connected');
      }

      // Development mode: return mock sync result
      if (process.env.NODE_ENV === 'development') {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const syncResult: SyncResult = {
          transactionsSynced: 5,
          newTransactions: 3,
          duplicatesSkipped: 2,
          rulesProcessed: 2,
          tiersUnlocked: {
            REGULAR: 1,
            PLATINUM: 1,
          },
        };

        // Update integration sync status
        const updatedIntegration = {
          ...integration,
          syncConfig: {
            ...integration.syncConfig,
            lastSyncAt: new Date().toISOString(),
            lastSyncStatus: 'SUCCESS' as const,
          },
        };

        await AsyncStorage.setItem(
          STORAGE_KEYS.POS_INTEGRATION,
          JSON.stringify(updatedIntegration)
        );

        setIntegration(updatedIntegration);
        return syncResult;
      }

      // Production: Call backend sync endpoint
      const response = await api.post(`/pos/sync/${venueId}`, {
        fromDate,
        toDate,
      });

      const syncResult = response.data as SyncResult;

      // Refresh transactions
      transactionsQuery.refetch();

      return syncResult;
    },
  });

  /**
   * Get POS status and statistics
   */
  const getStatus = useMutation({
    mutationFn: async (venueId: string) => {
      // Development mode: return current integration
      if (process.env.NODE_ENV === 'development') {
        return integration;
      }

      // Production: Fetch latest status from backend
      const response = await api.get(`/pos/status/${venueId}`);
      const updatedIntegration = response.data as POSIntegration;

      // Update local storage
      await AsyncStorage.setItem(
        STORAGE_KEYS.POS_INTEGRATION,
        JSON.stringify(updatedIntegration)
      );

      return updatedIntegration;
    },
    onSuccess: (data) => {
      if (data) {
        setIntegration(data);
      }
    },
  });

  /**
   * Create a new spend rule
   */
  const createSpendRule = useMutation({
    mutationFn: async (rule: Omit<SpendRule, 'id'>) => {
      // Development mode: store locally
      if (process.env.NODE_ENV === 'development') {
        const newRule: SpendRule = {
          ...rule,
          id: 'rule-' + Date.now(),
          isActive: true,
        };

        const updatedRules = [...spendRules, newRule];
        await AsyncStorage.setItem(
          STORAGE_KEYS.POS_SPEND_RULES,
          JSON.stringify(updatedRules)
        );

        return updatedRules;
      }

      // Production: Call backend API
      const response = await api.post(`/pos/rules/${rule.venueId}`, rule);
      return response.data as SpendRule[];
    },
    onSuccess: (data) => {
      setSpendRules(data);
    },
  });

  /**
   * Update existing spend rule
   */
  const updateSpendRule = useMutation({
    mutationFn: async (rule: SpendRule) => {
      // Development mode: update locally
      if (process.env.NODE_ENV === 'development') {
        const updatedRules = spendRules.map(r => (r.id === rule.id ? rule : r));

        await AsyncStorage.setItem(
          STORAGE_KEYS.POS_SPEND_RULES,
          JSON.stringify(updatedRules)
        );

        return updatedRules;
      }

      // Production: Call backend API
      const response = await api.patch(`/pos/rules/${rule.venueId}/${rule.id}`, rule);
      return response.data as SpendRule[];
    },
    onSuccess: (data) => {
      setSpendRules(data);
    },
  });

  /**
   * Delete spend rule
   */
  const deleteSpendRule = useMutation({
    mutationFn: async ({ venueId, ruleId }: { venueId: string; ruleId: string }) => {
      // Development mode: delete locally
      if (process.env.NODE_ENV === 'development') {
        const updatedRules = spendRules.filter(r => r.id !== ruleId);

        await AsyncStorage.setItem(
          STORAGE_KEYS.POS_SPEND_RULES,
          JSON.stringify(updatedRules)
        );

        return updatedRules;
      }

      // Production: Call backend API
      const response = await api.delete(`/pos/rules/${venueId}/${ruleId}`);
      return response.data as SpendRule[];
    },
    onSuccess: (data) => {
      setSpendRules(data);
    },
  });

  /**
   * Toggle spend rule on/off
   */
  const toggleSpendRule = useMutation({
    mutationFn: async ({ venueId, ruleId }: { venueId: string; ruleId: string }) => {
      // Development mode: toggle locally
      if (process.env.NODE_ENV === 'development') {
        const updatedRules = spendRules.map(r =>
          r.id === ruleId ? { ...r, isActive: !r.isActive } : r
        );

        await AsyncStorage.setItem(
          STORAGE_KEYS.POS_SPEND_RULES,
          JSON.stringify(updatedRules)
        );

        return updatedRules;
      }

      // Production: Call backend API
      const response = await api.post(`/pos/rules/${venueId}/${ruleId}/toggle`);
      return response.data as SpendRule[];
    },
    onSuccess: (data) => {
      setSpendRules(data);
    },
  });

  /**
   * Get revenue statistics for a venue
   */
  const getRevenue = useMutation({
    mutationFn: async ({
      venueId,
      period,
    }: {
      venueId: string;
      period: 'day' | 'week' | 'month' | 'year' | 'all';
    }) => {
      // Development mode: calculate from local transactions
      if (process.env.NODE_ENV === 'development') {
        const venueTransactions = transactions.filter(t => t.venueId === venueId);
        const totalRevenue = venueTransactions.reduce((sum, t) => sum + t.amount.total, 0);
        const averageTransaction =
          venueTransactions.length > 0 ? totalRevenue / venueTransactions.length : 0;

        const stats: RevenueStats = {
          period,
          totalRevenue,
          totalTransactions: venueTransactions.length,
          averageTransaction,
        };

        return stats;
      }

      // Production: Call backend API
      const response = await api.get(`/pos/revenue/${venueId}`, {
        params: { period },
      });

      return response.data as RevenueStats;
    },
  });

  // Helper methods
  const getVenueTransactions = useCallback(
    (venueId: string) => {
      return transactions.filter(t => t.venueId === venueId);
    },
    [transactions]
  );

  const getVenueRevenue = useCallback(
    (venueId: string) => {
      return transactions
        .filter(t => t.venueId === venueId)
        .reduce((sum, t) => sum + t.amount.total, 0);
    },
    [transactions]
  );

  const getActiveRules = useCallback(() => {
    return spendRules.filter(r => r.isActive);
  }, [spendRules]);

  const getUserLifetimeSpend = useCallback(
    (userId: string, venueId: string) => {
      return transactions
        .filter(t => t.userId === userId && t.venueId === venueId)
        .reduce((sum, t) => sum + t.amount.total, 0);
    },
    [transactions]
  );

  // Status helpers
  const isConnected = integration?.status === 'CONNECTED';
  const isConnecting = integration?.status === 'CONNECTING' || integration?.status === 'VALIDATING';
  const hasError = integration?.status === 'ERROR';

  return {
    // State
    integration,
    spendRules,
    transactions,
    availableLocations,

    // Status flags
    isConnected,
    isConnecting,
    hasError,
    isLoading: integrationQuery.isLoading || spendRulesQuery.isLoading,

    // Connection methods
    connectPOS,
    validateCredentials,
    disconnectPOS,
    getStatus,

    // Transaction methods
    syncTransactions,
    getRevenue,
    getVenueTransactions,
    getVenueRevenue,
    getUserLifetimeSpend,

    // Spend rule methods
    createSpendRule,
    updateSpendRule,
    deleteSpendRule,
    toggleSpendRule,
    getActiveRules,
  };
});
