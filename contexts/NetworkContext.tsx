import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useToast } from './ToastNotificationContext';

interface NetworkContextType {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
  isOffline: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

interface NetworkProviderProps {
  children: ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const [networkState, setNetworkState] = useState<NetworkContextType>({
    isConnected: true,
    isInternetReachable: null,
    connectionType: null,
    isOffline: false,
  });
  const { showWarning, showInfo } = useToast();
  const [hasShownOfflineToast, setHasShownOfflineToast] = useState(false);
  const [hasShownOnlineToast, setHasShownOnlineToast] = useState(false);

  useEffect(() => {
    // Get initial network state
    NetInfo.fetch().then((state: NetInfoState) => {
      const isConnected = state.isConnected ?? false;
      const isInternetReachable = state.isInternetReachable ?? null;
      const isOffline = !isConnected || isInternetReachable === false;

      setNetworkState({
        isConnected,
        isInternetReachable,
        connectionType: state.type,
        isOffline,
      });
    });

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isConnected = state.isConnected ?? false;
      const isInternetReachable = state.isInternetReachable ?? null;
      const isOffline = !isConnected || isInternetReachable === false;

      // Show toast when going offline
      if (isOffline && !hasShownOfflineToast) {
        showWarning(
          'You are offline',
          'Some features may not be available until you reconnect.'
        );
        setHasShownOfflineToast(true);
        setHasShownOnlineToast(false);
      }

      // Show toast when coming back online
      if (!isOffline && hasShownOfflineToast && !hasShownOnlineToast) {
        showInfo('Back online', 'You are now connected to the internet.');
        setHasShownOnlineToast(true);
        setHasShownOfflineToast(false);
      }

      setNetworkState({
        isConnected,
        isInternetReachable,
        connectionType: state.type,
        isOffline,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [hasShownOfflineToast, hasShownOnlineToast, showWarning, showInfo]);

  return <NetworkContext.Provider value={networkState}>{children}</NetworkContext.Provider>;
};
