export interface Venue {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  isOpen: boolean;
  currentVibeLevel: number;
  coverCharge: number;
  genres: string[];
  imageUrl: string;
  hasPublicLobby: boolean;
  vipThreshold: number;
}

export interface Performer {
  id: string;
  name: string;
  stageName: string;
  genres: string[];
  imageUrl: string;
  followerCount: number;
  totalRevenueGenerated: number;
  baseCity: string;
  epkVideoUrl: string;
}

export interface VibeVideo {
  id: string;
  venueId: string;
  performerId?: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  title: string;
  views: number;
  likes: number;
  timestamp: string;
}

export interface UserBadge {
  id: string;
  venueId: string;
  venueName: string;
  badgeType: 'GUEST' | 'REGULAR' | 'PLATINUM' | 'WHALE';
  unlockedAt: string;
}

export interface ServerChannel {
  id: string;
  name: string;
  type: 'PUBLIC_LOBBY' | 'INNER_CIRCLE' | 'PERFORMER_DIRECT';
  isLocked: boolean;
  unreadCount: number;
}

export interface VenueServer {
  venueId: string;
  venueName: string;
  channels: ServerChannel[];
  memberCount: number;
  lastActivity: string;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  userBadge: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
}

export type UserRole = 'VENUE' | 'PARTYGOER' | 'TALENT' | null;

export interface UserTransaction {
  id: string;
  venueId: string;
  amount: number;
  timestamp: string;
  locationId?: string;
  cardToken?: string;
  orderGuid?: string;
  checkGuid?: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  bio?: string;
  totalSpend: number;
  badges: UserBadge[];
  isIncognito: boolean;
  followedPerformers: string[];
  isVenueManager?: boolean;
  managedVenues?: string[];
  role: UserRole;
  isAuthenticated: boolean;
  isVerified?: boolean;
  verifiedCategory?: 'PERFORMER' | 'PROMOTER' | 'MANAGER';
  transactionHistory: UserTransaction[];
}

export interface VenueRule {
  id: string;
  type: 'SPENDING_TIER' | 'FREQUENCY_TIER' | 'SPECIFIC_PURCHASE' | 'PERFORMER_LOYALTY';
  trigger: {
    condition: string;
    threshold: number;
    timeWindow?: number;
  };
  reward: {
    serverAccess: string;
    badgeType?: string;
    notifyManager?: boolean;
  };
  isActive: boolean;
}

export interface VenueAnalytics {
  venueId: string;
  period: 'today' | 'week' | 'month';
  totalRevenue: number;
  totalTransactions: number;
  averageSpend: number;
  uniqueGuests: number;
  newMembers: number;
  vipUpgrades: number;
  peakHours: { hour: number; revenue: number; guests: number }[];
  topSpenders: { userId: string; name: string; spend: number; tier: string }[];
}

export interface ServerMember {
  userId: string;
  displayName: string;
  tier: 'GUEST' | 'REGULAR' | 'PLATINUM' | 'WHALE';
  totalSpend: number;
  visitCount: number;
  lastVisit: string;
  isOnline: boolean;
  status: 'ACTIVE' | 'BANNED' | 'WARNED';
}

export interface PerformerBooking {
  id: string;
  performerId: string;
  venueId: string;
  date: string;
  startTime: string;
  endTime: string;
  fee: number;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  expectedRevenue?: number;
  actualRevenue?: number;
  attendanceGenerated?: number;
}

export interface PromoterStats {
  promoterId: string;
  promoterName: string;
  uniqueTrackingCode: string;
  totalGuestsBrought: number;
  totalRevenue: number;
  lifetimeValue: number;
  conversionRate: number;
  payout: number;
}

export interface Gig {
  id: string;
  performerId: string;
  venueId: string;
  venueName: string;
  venueImageUrl: string;
  date: string;
  startTime: string;
  endTime: string;
  fee: number;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  genre: string;
  expectedAttendance?: number;
  actualRevenue?: number;
  ticketClicks?: number;
  barSalesGenerated?: number;
}

export interface PromoVideo {
  id: string;
  performerId: string;
  gigId?: string;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  caption: string;
  duration: number;
  status: 'DRAFT' | 'PUBLISHED' | 'PROCESSING';
  createdAt: string;
  views: number;
  ticketClicks: number;
  socialShares: number;
}

export interface PerformerAnalytics {
  performerId: string;
  totalGigs: number;
  totalRevenue: number;
  totalBarSalesGenerated: number;
  followerCount: number;
  followerGrowth: number;
  averageTicketClicks: number;
  topVenues: { venueId: string; venueName: string; gigCount: number; revenue: number }[];
  recentVideos: PromoVideo[];
  upcomingGigs: Gig[];
}

export type VibeEnergyLevel = 'Chill' | 'Social' | 'Wild';
export type WaitTimeRange = '0-10m' | '10-30m' | '30m+';

export interface VibeCheckVote {
  userId: string;
  venueId: string;
  music: number;
  density: number;
  energy: VibeEnergyLevel;
  waitTime: WaitTimeRange;
  weight: number;
  timestamp: string;
}

export interface VenueVibeData {
  venueId: string;
  musicScore: number;
  densityScore: number;
  energyLevel: VibeEnergyLevel;
  waitTime: WaitTimeRange;
  lastUpdated: string;
  totalVotes: number;
}

export interface UserVibeCooldown {
  venueId: string;
  lastVoteTimestamp: string;
}

export interface Follow {
  followerId: string;
  followingId: string;
  shareLocation: boolean;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export type LocationPrecision = 'EXACT' | 'VENUE_ONLY' | 'HIDDEN';

export interface FriendLocation {
  userId: string;
  displayName: string;
  avatarUrl: string;
  location: {
    latitude: number;
    longitude: number;
  };
  venueId?: string;
  venueName?: string;
  precision: LocationPrecision;
  lastUpdated: string;
  isActive: boolean;
}

export interface LocationSettings {
  ghostMode: boolean;
  precision: LocationPrecision;
  autoExpireEnabled: boolean;
  autoExpireTime: string;
  onlyShowToMutual: boolean;
}

export interface FriendProfile {
  id: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
  isOnline: boolean;
  currentVenueId?: string;
  currentVenueName?: string;
  mutualFriends: number;
}

export type SuggestionSource =
  | { type: 'CONTACT'; phoneNumber: string }
  | { type: 'INSTAGRAM'; instagramUsername: string }
  | { type: 'MUTUAL_FRIENDS'; count: number }
  | { type: 'VENUE'; venueId: string; venueName: string }
  | { type: 'ALGORITHM' };

export interface SuggestedPerson extends FriendProfile {
  source: SuggestionSource;
  priority: number; // Higher = show first (contacts = 100, Instagram = 80, mutuals = 60, etc.)
}

export type FeedFilter = 'NEARBY' | 'FOLLOWING';

export interface FeedSettings {
  selectedFilter: FeedFilter;
  lastUpdated: string;
}

export interface ToastLocation {
  id: string;
  name: string;
  address: string;
  restaurantGuid: string;
}

export interface ToastIntegration {
  id: string;
  venueId: string;
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';
  accessToken?: string;
  refreshToken?: string;
  selectedLocations: string[];
  connectedAt?: string;
  lastSyncAt?: string;
  webhooksEnabled: boolean;
}

export interface ToastSpendRule {
  id: string;
  venueId: string;
  threshold: number;
  tierUnlocked: 'GUEST' | 'REGULAR' | 'PLATINUM' | 'WHALE';
  serverAccessLevel: 'PUBLIC_LOBBY' | 'INNER_CIRCLE';
  isLiveOnly: boolean;
  liveTimeWindow?: {
    startTime: string;
    endTime: string;
  };
  performerId?: string;
  isActive: boolean;
}

export interface ToastTransactionData {
  id: string;
  venueId: string;
  locationId: string;
  amount: number;
  cardToken: string;
  timestamp: string;
  orderGuid: string;
  checkGuid: string;
  userId?: string;
}

export interface CardTokenMapping {
  userId: string;
  cardToken: string;
  lastUsed: string;
  provider: 'STRIPE' | 'PLAID';
}
