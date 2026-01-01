import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ToastIntegration,
  ToastLocation,
  ToastSpendRule,
  ToastTransactionData,
} from '@/types';
import {
  mockToastIntegration,
  mockToastLocations,
  mockToastSpendRules,
} from '@/mocks/toast';

const STORAGE_KEYS = {
  TOAST_INTEGRATION: 'vibelink_toast_integration',
  TOAST_SPEND_RULES: 'vibelink_toast_spend_rules',
  TOAST_TRANSACTIONS: 'vibelink_toast_transactions',
};

export const [ToastProvider, useToast] = createContextHook(() => {
  const [integration, setIntegration] = useState<ToastIntegration>(mockToastIntegration);
  const [spendRules, setSpendRules] = useState<ToastSpendRule[]>([]);
  const [transactions, setTransactions] = useState<ToastTransactionData[]>([]);
  const [availableLocations, setAvailableLocations] = useState<ToastLocation[]>([]);

  const integrationQuery = useQuery({
    queryKey: ['toast-integration'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.TOAST_INTEGRATION);
      if (stored) {
        return JSON.parse(stored) as ToastIntegration;
      }
      return mockToastIntegration;
    },
  });

  const spendRulesQuery = useQuery({
    queryKey: ['toast-spend-rules'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.TOAST_SPEND_RULES);
      if (stored) {
        return JSON.parse(stored) as ToastSpendRule[];
      }
      return mockToastSpendRules;
    },
  });

  const transactionsQuery = useQuery({
    queryKey: ['toast-transactions'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.TOAST_TRANSACTIONS);
      if (stored) {
        return JSON.parse(stored) as ToastTransactionData[];
      }
      return [];
    },
  });

  useEffect(() => {
    if (integrationQuery.data) {
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

  const connectToast = useMutation({
    mutationFn: async () => {
      console.log('[Toast] Initiating OAuth connection');
      const updatedIntegration: ToastIntegration = {
        ...integration,
        status: 'CONNECTING',
      };
      setIntegration(updatedIntegration);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const connectedIntegration: ToastIntegration = {
        ...updatedIntegration,
        status: 'CONNECTED',
        accessToken: 'mock-access-token-' + Date.now(),
        refreshToken: 'mock-refresh-token-' + Date.now(),
        connectedAt: new Date().toISOString(),
        lastSyncAt: new Date().toISOString(),
        webhooksEnabled: true,
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.TOAST_INTEGRATION,
        JSON.stringify(connectedIntegration)
      );

      setAvailableLocations(mockToastLocations);
      return connectedIntegration;
    },
    onSuccess: (data) => {
      setIntegration(data);
      console.log('[Toast] Connection successful');
    },
    onError: (error) => {
      console.error('[Toast] Connection failed:', error);
      setIntegration(prev => ({ ...prev, status: 'ERROR' }));
    },
  });

  const disconnectToast = useMutation({
    mutationFn: async () => {
      console.log('[Toast] Disconnecting integration');
      const disconnectedIntegration: ToastIntegration = {
        ...integration,
        status: 'DISCONNECTED',
        accessToken: undefined,
        refreshToken: undefined,
        selectedLocations: [],
        connectedAt: undefined,
        lastSyncAt: undefined,
        webhooksEnabled: false,
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.TOAST_INTEGRATION,
        JSON.stringify(disconnectedIntegration)
      );

      setAvailableLocations([]);
      return disconnectedIntegration;
    },
    onSuccess: (data) => {
      setIntegration(data);
      console.log('[Toast] Disconnected successfully');
    },
  });

  const selectLocations = useMutation({
    mutationFn: async (locationIds: string[]) => {
      console.log('[Toast] Selecting locations:', locationIds);
      const updatedIntegration: ToastIntegration = {
        ...integration,
        selectedLocations: locationIds,
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.TOAST_INTEGRATION,
        JSON.stringify(updatedIntegration)
      );

      return updatedIntegration;
    },
    onSuccess: (data) => {
      setIntegration(data);
      console.log('[Toast] Locations updated');
    },
  });

  const createSpendRule = useMutation({
    mutationFn: async (rule: Omit<ToastSpendRule, 'id'>) => {
      console.log('[Toast] Creating spend rule:', rule);
      const newRule: ToastSpendRule = {
        ...rule,
        id: 'toast-rule-' + Date.now(),
      };

      const updatedRules = [...spendRules, newRule];
      await AsyncStorage.setItem(
        STORAGE_KEYS.TOAST_SPEND_RULES,
        JSON.stringify(updatedRules)
      );

      return updatedRules;
    },
    onSuccess: (data) => {
      setSpendRules(data);
      console.log('[Toast] Spend rule created');
    },
  });

  const updateSpendRule = useMutation({
    mutationFn: async (rule: ToastSpendRule) => {
      console.log('[Toast] Updating spend rule:', rule.id);
      const updatedRules = spendRules.map(r => (r.id === rule.id ? rule : r));

      await AsyncStorage.setItem(
        STORAGE_KEYS.TOAST_SPEND_RULES,
        JSON.stringify(updatedRules)
      );

      return updatedRules;
    },
    onSuccess: (data) => {
      setSpendRules(data);
      console.log('[Toast] Spend rule updated');
    },
  });

  const deleteSpendRule = useMutation({
    mutationFn: async (ruleId: string) => {
      console.log('[Toast] Deleting spend rule:', ruleId);
      const updatedRules = spendRules.filter(r => r.id !== ruleId);

      await AsyncStorage.setItem(
        STORAGE_KEYS.TOAST_SPEND_RULES,
        JSON.stringify(updatedRules)
      );

      return updatedRules;
    },
    onSuccess: (data) => {
      setSpendRules(data);
      console.log('[Toast] Spend rule deleted');
    },
  });

  const processTransaction = useCallback(
    async (transaction: ToastTransactionData) => {
      console.log('[Toast] Processing transaction:', transaction.id);
      console.log('[Toast] Amount:', transaction.amount);
      console.log('[Toast] Card Token:', transaction.cardToken);

      const updatedTransactions = [...transactions, transaction];
      await AsyncStorage.setItem(
        STORAGE_KEYS.TOAST_TRANSACTIONS,
        JSON.stringify(updatedTransactions)
      );
      setTransactions(updatedTransactions);

      const matchingRules = spendRules
        .filter(rule => rule.isActive && rule.venueId === transaction.venueId)
        .filter(rule => transaction.amount >= rule.threshold);

      if (matchingRules.length > 0) {
        const highestRule = matchingRules.sort((a, b) => b.threshold - a.threshold)[0];
        console.log('[Toast] Transaction triggers rule:', highestRule.id);
        console.log('[Toast] User unlocked:', highestRule.tierUnlocked);
        console.log('[Toast] Server access:', highestRule.serverAccessLevel);

        return {
          success: true,
          ruleTriggered: highestRule,
          notification: `Unlocked ${highestRule.tierUnlocked} tier!`,
        };
      }

      console.log('[Toast] No rules triggered for this transaction');
      return { success: true, ruleTriggered: null };
    },
    [transactions, spendRules]
  );

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
        .reduce((sum, t) => sum + t.amount, 0);
    },
    [transactions]
  );

  const getActiveRules = useCallback(() => {
    return spendRules.filter(r => r.isActive);
  }, [spendRules]);

  const isConnected = integration.status === 'CONNECTED';
  const isConnecting = integration.status === 'CONNECTING';
  const hasError = integration.status === 'ERROR';

  return {
    integration,
    spendRules,
    transactions,
    availableLocations,
    isConnected,
    isConnecting,
    hasError,
    isLoading: integrationQuery.isLoading || spendRulesQuery.isLoading,
    connectToast,
    disconnectToast,
    selectLocations,
    createSpendRule,
    updateSpendRule,
    deleteSpendRule,
    processTransaction,
    getVenueTransactions,
    getVenueRevenue,
    getActiveRules,
  };
});
