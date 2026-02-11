import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserProfile, UserRole, VibeCheckVote, VenueVibeData, UserVibeCooldown, VibeEnergyLevel, WaitTimeRange } from '@/types';
import { mockServers } from '@/mocks/servers';
import { VIBE_CHECK } from '@/constants/app';
import { getSecureItem, setSecureItem, deleteSecureItem, SECURE_KEYS, migrateToSecureStorage } from '@/utils/secureStorage';

const STORAGE_KEYS = {
  PROFILE: 'vibelink_profile',
  VIBE_COOLDOWNS: 'vibelink_vibe_cooldowns',
  CREDENTIALS: 'vibelink_credentials',
  LINKED_CARDS: 'vibelink_linked_cards',
};

const defaultProfile: UserProfile = {
  id: '', // Will be set from auth context
  displayName: 'Alex Rivera',
  bio: '',
  totalSpend: 0,
  badges: [],
  isIncognito: false,
  followedPerformers: [],
  isVenueManager: true,
  managedVenues: ['venue-1'], // The Nox Room
  role: 'VENUE',
  isAuthenticated: true,
  isVerified: true,
  verifiedCategory: 'MANAGER',
  transactionHistory: [],
};

export interface LinkedCard {
  id: string;
  last4: string;
  brand: string;
  cardholderName: string;
  isDefault: boolean;
}

export const [AppStateProvider, useAppState] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [vibeCooldowns, setVibeCooldowns] = useState<UserVibeCooldown[]>([]);
  const [venueVibeData, setVenueVibeData] = useState<VenueVibeData[]>([]);
  const [broadcastMessages, setBroadcastMessages] = useState<Array<{
    id: string;
    channelId: string;
    message: string;
    timestamp: string;
    venueId: string;
  }>>([]);
  const [linkedCards, setLinkedCards] = useState<LinkedCard[]>([]);

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
      if (stored) {
        return JSON.parse(stored) as UserProfile;
      }
      return defaultProfile;
    },
  });

  const cooldownsQuery = useQuery({
    queryKey: ['vibe-cooldowns'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.VIBE_COOLDOWNS);
      if (stored) {
        return JSON.parse(stored) as UserVibeCooldown[];
      }
      return [];
    },
  });

  const linkedCardsQuery = useQuery({
    queryKey: ['linked-cards'],
    queryFn: async () => {
      const stored = await getSecureItem(SECURE_KEYS.LINKED_CARDS);
      if (stored) {
        return JSON.parse(stored) as LinkedCard[];
      }
      return [];
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
    }
  }, [profileQuery.data]);

  useEffect(() => {
    if (cooldownsQuery.data) {
      setVibeCooldowns(cooldownsQuery.data);
    }
  }, [cooldownsQuery.data]);

  useEffect(() => {
    if (linkedCardsQuery.data) {
      setLinkedCards(linkedCardsQuery.data);
    }
  }, [linkedCardsQuery.data]);

  // Migrate existing AsyncStorage data to SecureStore on app startup
  useEffect(() => {
    const migrateExistingData = async () => {
      try {
        // Migrate credentials
        await migrateToSecureStorage(STORAGE_KEYS.CREDENTIALS, SECURE_KEYS.USER_CREDENTIALS);

        // Migrate linked cards
        await migrateToSecureStorage(STORAGE_KEYS.LINKED_CARDS, SECURE_KEYS.LINKED_CARDS);
      } catch (error) {
        console.error('Error migrating data to SecureStore:', error);
      }
    };

    migrateExistingData();
  }, []); // Run once on mount

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      if (__DEV__) {
        console.log('[AppState] updateProfile called with:', updates);
      }
      // Read current profile from storage to avoid stale closure issues
      const currentProfile = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
      const profileData = currentProfile ? JSON.parse(currentProfile) : defaultProfile;
      const updated = { ...profileData, ...updates };
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
      if (__DEV__) {
        console.log('[AppState] Profile updated, badges:', updated.badges.map((b: any) => b.venueId));
      }
      return updated;
    },
    onSuccess: (data) => {
      if (__DEV__) {
        console.log('[AppState] updateProfile onSuccess, setting profile state');
      }
      setProfile(data);
      // Invalidate profile query to ensure React Query cache is updated
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const { mutate: updateProfile, mutateAsync: updateProfileAsync } = updateProfileMutation;

  const toggleIncognito = useCallback(() => {
    const newIncognito = !profile.isIncognito;
    updateProfile({ isIncognito: newIncognito });
  }, [profile.isIncognito, updateProfile]);

  const followPerformer = useCallback((performerId: string) => {
    const newFollowed = profile.followedPerformers.includes(performerId)
      ? profile.followedPerformers.filter(id => id !== performerId)
      : [...profile.followedPerformers, performerId];
    updateProfile({ followedPerformers: newFollowed });
  }, [profile.followedPerformers, updateProfile]);

  const isFollowing = useCallback((performerId: string) => {
    return profile.followedPerformers.includes(performerId);
  }, [profile.followedPerformers]);

  const joinedServers = useMemo(() => {
    // First, try to match with mock servers
    const matchedMockServers = mockServers.filter(server =>
      profile.badges.some(badge => badge.venueId === server.venueId)
    );

    // For badges that don't match mock servers, create dynamic server entries
    const dynamicServers = profile.badges
      .filter(badge => !mockServers.some(server => server.venueId === badge.venueId))
      .map(badge => ({
        venueId: badge.venueId,
        venueName: badge.venueName,
        memberCount: 1, // Default value
        lastActivity: badge.unlockedAt,
        channels: [
          {
            id: `${badge.venueId}-general`,
            name: 'general',
            type: 'PUBLIC_LOBBY' as const,
            isLocked: false,
            unreadCount: 0,
          }
        ]
      }));

    const allServers = [...matchedMockServers, ...dynamicServers];

    if (__DEV__) {
      console.log('[AppState] Joined servers calculated:', allServers.length);
      console.log('[AppState] Mock servers matched:', matchedMockServers.length);
      console.log('[AppState] Dynamic servers created:', dynamicServers.length);
      console.log('[AppState] Profile badges:', profile.badges.map(b => b.venueId));
    }
    return allServers;
  }, [profile.badges]);

  const setUserRole = useCallback((role: UserRole) => {
    updateProfile({ 
      role, 
      isAuthenticated: role !== null,
      isVenueManager: role === 'VENUE',
      managedVenues: role === 'VENUE' ? ['venue-1'] : [],
    });
  }, [updateProfile]);

  const updateProfileDetails = useCallback((displayName: string, bio: string) => {
    updateProfile({ displayName, bio });
  }, [updateProfile]);

  const leaveServer = useMutation({
    mutationFn: async (venueId: string) => {
      const currentProfile = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
      const profileData = currentProfile ? JSON.parse(currentProfile) : defaultProfile;
      const newBadges = profileData.badges.filter((badge: any) => badge.venueId !== venueId);
      const updated = { ...profileData, badges: newBadges };
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      setProfile(data);
    },
  });

  const canRejoinVenue = useCallback((venueId: string, venue: any) => {
    const hadBadge = profile.badges.some(b => b.venueId === venueId);
    if (!hadBadge) return true;

    if (venue.hasPublicLobby) {
      return true;
    }

    const venueSpend = profile.transactionHistory
      .filter(t => t.venueId === venueId)
      .reduce((sum, t) => sum + t.amount, 0);

    return venueSpend >= venue.vipThreshold;
  }, [profile.badges, profile.transactionHistory]);

  const canVoteVibeCheck = useCallback((venueId: string): boolean => {
    const cooldown = vibeCooldowns.find(c => c.venueId === venueId);
    if (!cooldown) return true;

    const timeSinceVote = Date.now() - new Date(cooldown.lastVoteTimestamp).getTime();
    return timeSinceVote >= VIBE_CHECK.VOTE_COOLDOWN_MS;
  }, [vibeCooldowns]);

  const getVibeCooldownRemaining = useCallback((venueId: string): number => {
    const cooldown = vibeCooldowns.find(c => c.venueId === venueId);
    if (!cooldown) return 0;

    const timeSinceVote = Date.now() - new Date(cooldown.lastVoteTimestamp).getTime();
    const remaining = VIBE_CHECK.VOTE_COOLDOWN_MS - timeSinceVote;
    return Math.max(0, remaining);
  }, [vibeCooldowns]);

  const submitVibeCheck = useMutation({
    mutationFn: async (vote: {
      venueId: string;
      music: number;
      density: number;
      energy: VibeEnergyLevel;
      waitTime: WaitTimeRange;
    }) => {
      const userBadge = profile.badges.find(b => b.venueId === vote.venueId);
      const isVIP = userBadge?.badgeType === 'WHALE' || userBadge?.badgeType === 'PLATINUM';
      const weight = isVIP ? 2.0 : 1.0;

      const newVote: VibeCheckVote = {
        userId: profile.id,
        venueId: vote.venueId,
        music: vote.music,
        density: vote.density,
        energy: vote.energy,
        waitTime: vote.waitTime,
        weight,
        timestamp: new Date().toISOString(),
      };

      const newCooldown: UserVibeCooldown = {
        venueId: vote.venueId,
        lastVoteTimestamp: newVote.timestamp,
      };

      const updatedCooldowns = [
        ...vibeCooldowns.filter(c => c.venueId !== vote.venueId),
        newCooldown,
      ];

      await AsyncStorage.setItem(STORAGE_KEYS.VIBE_COOLDOWNS, JSON.stringify(updatedCooldowns));
      setVibeCooldowns(updatedCooldowns);

      const existingData = venueVibeData.find(v => v.venueId === vote.venueId);
      const updatedVibeData: VenueVibeData = {
        venueId: vote.venueId,
        musicScore: existingData ? (existingData.musicScore * existingData.totalVotes + vote.music * weight) / (existingData.totalVotes + weight) : vote.music,
        densityScore: existingData ? (existingData.densityScore * existingData.totalVotes + vote.density * weight) / (existingData.totalVotes + weight) : vote.density,
        energyLevel: vote.energy,
        waitTime: vote.waitTime,
        lastUpdated: newVote.timestamp,
        totalVotes: existingData ? existingData.totalVotes + weight : weight,
      };

      setVenueVibeData([
        ...venueVibeData.filter(v => v.venueId !== vote.venueId),
        updatedVibeData,
      ]);

      return newVote;
    },
  });

  const getVenueVibe = useCallback((venueId: string): VenueVibeData | null => {
    const vibeData = venueVibeData.find(v => v.venueId === venueId);
    if (!vibeData) return null;

    const timeSinceUpdate = Date.now() - new Date(vibeData.lastUpdated).getTime();
    if (timeSinceUpdate >= VIBE_CHECK.DATA_DECAY_MS) return null;

    return vibeData;
  }, [venueVibeData]);

  const calculateVibePercentage = useCallback((venueId: string): number | null => {
    const vibeData = venueVibeData.find(v => v.venueId === venueId);
    if (!vibeData) return null;

    const timeSinceUpdate = Date.now() - new Date(vibeData.lastUpdated).getTime();
    if (timeSinceUpdate >= VIBE_CHECK.DATA_DECAY_MS) return null;

    // Calculate vibe percentage from music and density scores (both 1-5)
    const averageScore = (vibeData.musicScore + vibeData.densityScore) / 2;
    const percentage = Math.round((averageScore / 5) * 100);

    return percentage;
  }, [venueVibeData]);

  const createAccount = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      // TODO: Replace with backend API call to /api/auth/register
      const credentials = {
        username,
        password,
        createdAt: new Date().toISOString(),
      };

      // Store credentials securely using SecureStore
      await setSecureItem(SECURE_KEYS.USER_CREDENTIALS, JSON.stringify(credentials));

      const updated = {
        ...profile,
        displayName: username,
        isAuthenticated: true,
      };

      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      setProfile(data);
    },
  });

  const addBroadcastMessage = useCallback((channelId: string, message: string, venueId: string) => {
    const newMessage = {
      id: `broadcast-${Date.now()}`,
      channelId,
      message,
      timestamp: new Date().toISOString(),
      venueId,
    };
    setBroadcastMessages(prev => [...prev, newMessage]);
  }, []);

  const getBroadcastMessagesForChannel = useCallback((channelId: string) => {
    return broadcastMessages.filter(msg => msg.channelId === channelId);
  }, [broadcastMessages]);

  const addLinkedCard = useCallback(async (card: Omit<LinkedCard, 'id'>) => {
    // TODO: Replace with backend API call to /api/payment/cards/add
    const newCard: LinkedCard = {
      ...card,
      id: Date.now().toString(),
      isDefault: linkedCards.length === 0, // First card is default
    };
    const updated = [...linkedCards, newCard];
    await setSecureItem(SECURE_KEYS.LINKED_CARDS, JSON.stringify(updated));
    setLinkedCards(updated);
  }, [linkedCards]);

  const removeLinkedCard = useCallback(async (cardId: string) => {
    // TODO: Replace with backend API call to /api/payment/cards/remove
    const updated = linkedCards.filter(card => card.id !== cardId);
    await setSecureItem(SECURE_KEYS.LINKED_CARDS, JSON.stringify(updated));
    setLinkedCards(updated);
  }, [linkedCards]);

  return {
    profile,
    isLoading: profileQuery.isLoading,
    toggleIncognito,
    followPerformer,
    isFollowing,
    joinedServers,
    setUserRole,
    updateProfileDetails,
    updateProfile,
    updateProfileAsync,
    leaveServer,
    canRejoinVenue,
    canVoteVibeCheck,
    getVibeCooldownRemaining,
    submitVibeCheck,
    getVenueVibe,
    calculateVibePercentage,
    createAccount,
    addBroadcastMessage,
    getBroadcastMessagesForChannel,
    linkedCards,
    addLinkedCard,
    removeLinkedCard,
  };
});

export const [DiscoveryProvider, useDiscovery] = createContextHook(() => {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  return {
    selectedVenueId,
    setSelectedVenueId,
  };
});
