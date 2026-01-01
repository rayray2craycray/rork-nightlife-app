import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import { UserProfile, UserRole, VibeCheckVote, VenueVibeData, UserVibeCooldown, VibeEnergyLevel, WaitTimeRange } from '@/types';
import { mockServers } from '@/mocks/servers';
import { VIBE_CHECK } from '@/constants/app';

const STORAGE_KEYS = {
  PROFILE: 'vibelink_profile',
  VIBE_COOLDOWNS: 'vibelink_vibe_cooldowns',
  CREDENTIALS: 'vibelink_credentials',
};

const defaultProfile: UserProfile = {
  id: 'user-me',
  displayName: 'Alex Rivera',
  bio: '',
  totalSpend: 0,
  badges: [],
  isIncognito: false,
  followedPerformers: [],
  isVenueManager: false,
  managedVenues: [],
  role: null,
  isAuthenticated: false,
  isVerified: false,
  verifiedCategory: undefined,
  transactionHistory: [],
};

export const [AppStateProvider, useAppState] = createContextHook(() => {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [vibeCooldowns, setVibeCooldowns] = useState<UserVibeCooldown[]>([]);
  const [venueVibeData, setVenueVibeData] = useState<VenueVibeData[]>([]);

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

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      const updated = { ...profile, ...updates };
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      setProfile(data);
    },
  });

  const { mutate: updateProfile } = updateProfileMutation;

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
    return mockServers.filter(server => 
      profile.badges.some(badge => badge.venueId === server.venueId)
    );
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

  const createAccount = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const credentials = {
        username,
        password,
        createdAt: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));
      
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
    leaveServer,
    canRejoinVenue,
    canVoteVibeCheck,
    getVibeCooldownRemaining,
    submitVibeCheck,
    getVenueVibe,
    createAccount,
  };
});

export const [DiscoveryProvider, useDiscovery] = createContextHook(() => {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  return {
    selectedVenueId,
    setSelectedVenueId,
  };
});
