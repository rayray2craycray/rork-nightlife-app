import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Award, Eye, EyeOff, Settings, CreditCard, Users, BarChart3, Edit, X, CheckCircle2, Shield, UserPlus, UserMinus, Share2 } from 'lucide-react-native';
import { useAppState } from '@/contexts/AppStateContext';
import { useSocial } from '@/contexts/SocialContext';
import { router } from 'expo-router';
import { mockVenues } from '@/mocks/venues';
import * as Haptics from 'expo-haptics';

type SocialTab = 'FOLLOWERS' | 'FOLLOWING';

export default function ProfileScreen() {
  const { profile, toggleIncognito, updateProfileDetails } = useAppState();
  const {
    following,
    followers,
    getFriendProfile,
    isFollowing,
    followUser,
    unfollowUser,
    suggestedPeople,
    getSuggestionSourceLabel,
    getSuggestionSourceColor,
  } = useSocial();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [showSocialList, setShowSocialList] = useState(false);
  const [socialTab, setSocialTab] = useState<SocialTab>('FOLLOWING');
  const [showBadgesList, setShowBadgesList] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(profile.displayName);
  const [editBio, setEditBio] = useState(profile.bio || '');

  const handleIncognitoToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleIncognito();
  };

  const handleSaveProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateProfileDetails(editDisplayName, editBio);
    setIsEditModalVisible(false);
  };

  const openEditModal = () => {
    setEditDisplayName(profile.displayName);
    setEditBio(profile.bio || '');
    setIsEditModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const profileLink = `https://Nox.app/profile/${profile.id}`;
      const message = profile.bio 
        ? `Check out ${profile.displayName} on Nox!\n\n${profile.bio}\n\n${profileLink}`
        : `Check out ${profile.displayName} on Nox!\n\n${profileLink}`;
      
      await Share.share({
        message,
        title: `${profile.displayName} on Nox`,
        url: profileLink,
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#000000', '#1a1a1a']}
        style={styles.gradient}
      >
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={handleShare}
        >
          <Share2 size={24} color="#ff0080" />
        </TouchableOpacity>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#ff0080', '#a855f7']}
              style={styles.avatarGradient}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{profile.displayName[0]}</Text>
              </View>
            </LinearGradient>
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{profile.displayName}</Text>
            {profile.isVerified && (
              <View style={styles.verifiedBadge}>
                <CheckCircle2 size={20} color="#ff0080" />
              </View>
            )}
          </View>
          {profile.isVerified && profile.verifiedCategory && (
            <View style={styles.categoryTag}>
              <Shield size={12} color="#ff0080" />
              <Text style={styles.categoryText}>{profile.verifiedCategory}</Text>
            </View>
          )}
          {profile.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : (
            <Text style={styles.userStats}>Member since 2024</Text>
          )}
          <TouchableOpacity style={styles.editProfileButton} onPress={openEditModal}>
            <Edit size={16} color="#ff0080" />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.incognitoCard}>
          <LinearGradient
            colors={['#1a1a2e', '#1a1a1a']}
            style={styles.incognitoGradient}
          >
            <View style={styles.incognitoLeft}>
              {profile.isIncognito ? (
                <EyeOff size={24} color="#ff0080" />
              ) : (
                <Eye size={24} color="#666" />
              )}
              <View>
                <Text style={styles.incognitoTitle}>Incognito Mode</Text>
                <Text style={styles.incognitoSubtitle}>
                  {profile.isIncognito ? 'You\'re invisible in servers' : 'Everyone can see you'}
                </Text>
              </View>
            </View>
            <Switch
              value={profile.isIncognito}
              onValueChange={handleIncognitoToggle}
              trackColor={{ false: '#1a1a2e', true: '#ff0080' }}
              thumbColor={profile.isIncognito ? '#000000' : '#666'}
            />
          </LinearGradient>
        </View>

        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowBadgesList(!showBadgesList);
              setShowSocialList(false);
            }}
          >
            <Award size={24} color="#ff0080" />
            <Text style={styles.statNumber}>{profile.badges.length}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statCard} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (showSocialList && socialTab === 'FOLLOWERS') {
                setShowSocialList(false);
              } else {
                setSocialTab('FOLLOWERS');
                setShowSocialList(true);
                setShowBadgesList(false);
              }
            }}
          >
            <Users size={24} color="#ff0080" />
            <Text style={styles.statNumber}>{followers.length}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statCard} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (showSocialList && socialTab === 'FOLLOWING') {
                setShowSocialList(false);
              } else {
                setSocialTab('FOLLOWING');
                setShowSocialList(true);
                setShowBadgesList(false);
              }
            }}
          >
            <Users size={24} color="#ff0080" />
            <Text style={styles.statNumber}>{following.length}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        {showSocialList && (
          <View style={styles.section}>
            <View style={styles.socialHeaderContainer}>
              <View style={styles.socialTabHeader}>
                <TouchableOpacity
                  style={[styles.socialTab, socialTab === 'FOLLOWERS' && styles.socialTabActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSocialTab('FOLLOWERS');
                  }}
                >
                  <Text style={[styles.socialTabText, socialTab === 'FOLLOWERS' && styles.socialTabTextActive]}>
                    Followers
                  </Text>
                  {socialTab === 'FOLLOWERS' && <View style={styles.socialTabIndicator} />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.socialTab, socialTab === 'FOLLOWING' && styles.socialTabActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSocialTab('FOLLOWING');
                  }}
                >
                  <Text style={[styles.socialTabText, socialTab === 'FOLLOWING' && styles.socialTabTextActive]}>
                    Following
                  </Text>
                  {socialTab === 'FOLLOWING' && <View style={styles.socialTabIndicator} />}
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowSocialList(false);
                }}
              >
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

          <View style={styles.socialList}>
            {socialTab === 'FOLLOWERS' && followers.length === 0 && (
              <View style={styles.emptyState}>
                <Users size={48} color="#666" />
                <Text style={styles.emptyStateTitle}>No followers yet</Text>
                <Text style={styles.emptyStateText}>
                  Connect with people at venues to build your network
                </Text>
              </View>
            )}
            {socialTab === 'FOLLOWING' && following.length === 0 && (
              <View style={styles.emptyState}>
                <Users size={48} color="#666" />
                <Text style={styles.emptyStateTitle}>Not following anyone</Text>
                <Text style={styles.emptyStateText}>
                  Start following friends to see where they&apos;re at
                </Text>
              </View>
            )}
            {socialTab === 'FOLLOWERS' && followers.map((userId) => {
              const userProfile = getFriendProfile(userId);
              if (!userProfile) return null;
              return (
                <View key={userId} style={styles.userCard}>
                  <LinearGradient
                    colors={['#1a1a2e', '#1a1a1a']}
                    style={styles.userCardGradient}
                  >
                    <View style={styles.userCardLeft}>
                      <Image
                        source={{ uri: userProfile.avatarUrl }}
                        style={styles.userAvatar}
                      />
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{userProfile.displayName}</Text>
                        {userProfile.bio && <Text style={styles.userBio}>{userProfile.bio}</Text>}
                        {userProfile.currentVenueName && (
                          <View style={styles.venueTag}>
                            <View style={styles.onlineIndicator} />
                            <Text style={styles.venueTagText}>{userProfile.currentVenueName}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.followButton,
                        isFollowing(userId) && styles.followingButton
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        if (isFollowing(userId)) {
                          unfollowUser(userId);
                        } else {
                          followUser(userId);
                        }
                      }}
                    >
                      {isFollowing(userId) ? (
                        <UserMinus size={18} color="#fff" />
                      ) : (
                        <UserPlus size={18} color="#000000" />
                      )}
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              );
            })}
            {socialTab === 'FOLLOWING' && following.map((userId) => {
              const userProfile = getFriendProfile(userId);
              if (!userProfile) return null;
              return (
                <View key={userId} style={styles.userCard}>
                  <LinearGradient
                    colors={['#1a1a2e', '#1a1a1a']}
                    style={styles.userCardGradient}
                  >
                    <View style={styles.userCardLeft}>
                      <Image
                        source={{ uri: userProfile.avatarUrl }}
                        style={styles.userAvatar}
                      />
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{userProfile.displayName}</Text>
                        {userProfile.bio && <Text style={styles.userBio}>{userProfile.bio}</Text>}
                        {userProfile.currentVenueName && (
                          <View style={styles.venueTag}>
                            <View style={styles.onlineIndicator} />
                            <Text style={styles.venueTagText}>{userProfile.currentVenueName}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.followingButton}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        unfollowUser(userId);
                      }}
                    >
                      <UserMinus size={18} color="#fff" />
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              );
            })}
          </View>
          </View>
        )}

        {showBadgesList && (
          <View style={styles.section}>
            <View style={styles.badgesHeaderContainer}>
              <Text style={styles.sectionTitle}>All Badges</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowBadgesList(false);
                }}
              >
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            {profile.badges.length === 0 ? (
              <View style={styles.emptyState}>
                <Award size={48} color="#666" />
                <Text style={styles.emptyStateTitle}>No badges yet</Text>
                <Text style={styles.emptyStateText}>
                  Visit venues and spend to unlock exclusive badges
                </Text>
              </View>
            ) : (
              <View style={styles.badgeList}>
                {profile.badges.map((badge) => {
                  const venue = mockVenues.find(v => v.id === badge.venueId);
                  return (
                    <View key={badge.id} style={styles.badgeCard}>
                      <LinearGradient
                        colors={['#1a1a2e', '#1a1a1a']}
                        style={styles.badgeGradient}
                      >
                        {venue && (
                          <Image
                            source={{ uri: venue.imageUrl }}
                            style={styles.badgeImage}
                          />
                        )}
                        <View style={styles.badgeInfo}>
                          <Text style={styles.badgeName}>{badge.venueName}</Text>
                          <View style={styles.badgeTypeTag}>
                            <Text style={styles.badgeTypeText}>{badge.badgeType}</Text>
                          </View>
                          <Text style={styles.badgeDate}>
                            Unlocked {new Date(badge.unlockedAt).toLocaleDateString()}
                          </Text>
                        </View>
                      </LinearGradient>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {!showBadgesList && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Badges</Text>
            {profile.badges.length === 0 ? (
              <View style={styles.emptyState}>
                <Award size={48} color="#666" />
                <Text style={styles.emptyStateTitle}>No badges yet</Text>
                <Text style={styles.emptyStateText}>
                  Visit venues and spend to unlock exclusive badges
                </Text>
              </View>
            ) : (
              profile.badges.slice(0, 3).map((badge) => {
                const venue = mockVenues.find(v => v.id === badge.venueId);
                return (
                  <View key={badge.id} style={styles.badgeCard}>
                    <LinearGradient
                      colors={['#1a1a2e', '#1a1a1a']}
                      style={styles.badgeGradient}
                    >
                      {venue && (
                        <Image
                          source={{ uri: venue.imageUrl }}
                          style={styles.badgeImage}
                        />
                      )}
                      <View style={styles.badgeInfo}>
                        <Text style={styles.badgeName}>{badge.venueName}</Text>
                        <View style={styles.badgeTypeTag}>
                          <Text style={styles.badgeTypeText}>{badge.badgeType}</Text>
                        </View>
                        <Text style={styles.badgeDate}>
                          Unlocked {new Date(badge.unlockedAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </LinearGradient>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          {profile.isVenueManager && (
            <TouchableOpacity 
              style={styles.managementButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/management');
              }}
            >
              <LinearGradient
                colors={['#ff0080', '#00d4ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.managementGradient}
              >
                <BarChart3 size={22} color="#000000" />
                <Text style={styles.managementButtonText}>Management Dashboard</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionButton}>
            <CreditCard size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Link Payment Card</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/settings');
            }}
          >
            <Settings size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Account Settings</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>People You May Know</Text>
          <Text style={styles.sectionSubtitle}>Based on your contacts and connections</Text>
          {suggestedPeople.length === 0 ? (
            <View style={styles.emptyState}>
              <Users size={48} color="#666" />
              <Text style={styles.emptyStateTitle}>No suggestions</Text>
              <Text style={styles.emptyStateText}>
                We&apos;ll show people you may know here
              </Text>
            </View>
          ) : (
            <View style={styles.suggestedList}>
              {suggestedPeople.map((person) => (
                <View key={person.id} style={styles.userCard}>
                  <LinearGradient
                    colors={['#1a1a2e', '#1a1a1a']}
                    style={styles.userCardGradient}
                  >
                    <View style={styles.userCardLeft}>
                      <Image
                        source={{ uri: person.avatarUrl }}
                        style={styles.userAvatar}
                      />
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{person.displayName}</Text>
                        <View
                          style={[
                            styles.sourceBadge,
                            { backgroundColor: getSuggestionSourceColor(person) + '20' },
                          ]}
                        >
                          <View
                            style={[
                              styles.sourceBadgeDot,
                              { backgroundColor: getSuggestionSourceColor(person) },
                            ]}
                          />
                          <Text
                            style={[
                              styles.sourceBadgeText,
                              { color: getSuggestionSourceColor(person) },
                            ]}
                          >
                            {getSuggestionSourceLabel(person)}
                          </Text>
                        </View>
                        {person.bio && <Text style={styles.userBio}>{person.bio}</Text>}
                        {person.mutualFriends > 0 && person.source.type !== 'MUTUAL_FRIENDS' && (
                          <Text style={styles.mutualText}>
                            {person.mutualFriends} mutual {person.mutualFriends === 1 ? 'friend' : 'friends'}
                          </Text>
                        )}
                        {person.currentVenueName && (
                          <View style={styles.venueTag}>
                            <View style={styles.onlineIndicator} />
                            <Text style={styles.venueTagText}>{person.currentVenueName}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.followButton}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        followUser(person.id);
                      }}
                    >
                      <UserPlus size={18} color="#000000" />
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              ))}
            </View>
          )}
        </View>
      </LinearGradient>

      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsEditModalVisible(false);
                }}
              >
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Display Name</Text>
                <TextInput
                  style={styles.input}
                  value={editDisplayName}
                  onChangeText={setEditDisplayName}
                  placeholder="Enter your display name"
                  placeholderTextColor="#666"
                  maxLength={30}
                />
                <Text style={styles.inputHint}>{editDisplayName.length}/30</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={4}
                  maxLength={150}
                />
                <Text style={styles.inputHint}>{editBio.length}/150</Text>
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
              >
                <LinearGradient
                  colors={['#ff0080', '#00d4ff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradient: {
    flex: 1,
    paddingBottom: 40,
  },
  shareButton: {
    position: 'absolute' as const,
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    zIndex: 10,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center' as const,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarGradient: {
    borderRadius: 50,
    padding: 4,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#000000',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#ff0080',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  userStats: {
    fontSize: 14,
    color: '#999',
  },
  nameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 4,
  },
  verifiedBadge: {
    marginTop: 2,
  },
  categoryTag: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: 'rgba(0, 255, 204, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#ff0080',
  },
  bio: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center' as const,
    paddingHorizontal: 40,
    marginBottom: 12,
  },
  editProfileButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 204, 0.1)',
    marginTop: 8,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#ff0080',
  },
  incognitoCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  incognitoGradient: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 16,
  },
  incognitoLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flex: 1,
  },
  incognitoTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  incognitoSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row' as const,
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center' as const,
    gap: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600' as const,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center' as const,
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center' as const,
    maxWidth: 240,
  },
  badgeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  badgeGradient: {
    flexDirection: 'row' as const,
    padding: 12,
    gap: 12,
  },
  badgeImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  badgeInfo: {
    flex: 1,
    justifyContent: 'center' as const,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  badgeTypeTag: {
    alignSelf: 'flex-start' as const,
    backgroundColor: '#ff0080',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  badgeTypeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#000000',
  },
  badgeDate: {
    fontSize: 12,
    color: '#999',
  },
  actionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  managementButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  managementGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 18,
    gap: 12,
  },
  managementButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#000000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#000000',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#1a1a2e',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top' as const,
  },
  inputHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right' as const,
  },
  saveButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
  },
  saveButtonGradient: {
    padding: 18,
    alignItems: 'center' as const,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#000000',
  },
  socialHeaderContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 16,
  },
  socialTabHeader: {
    flex: 1,
    flexDirection: 'row' as const,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  socialTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center' as const,
    borderRadius: 8,
    position: 'relative' as const,
  },
  socialTabActive: {
    backgroundColor: 'rgba(0, 255, 204, 0.1)',
  },
  socialTabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
  },
  socialTabTextActive: {
    color: '#ff0080',
  },
  socialTabIndicator: {
    position: 'absolute' as const,
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2,
    backgroundColor: '#ff0080',
    borderRadius: 1,
  },
  socialList: {
    gap: 12,
  },
  badgesHeaderContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 16,
  },
  badgeList: {
    gap: 12,
  },
  userCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  userCardGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 12,
  },
  userCardLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000000',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 2,
  },
  sourceBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 2,
    marginBottom: 4,
  },
  sourceBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  userBio: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  venueTag: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  onlineIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff0080',
  },
  venueTagText: {
    fontSize: 11,
    color: '#ff0080',
    fontWeight: '600' as const,
  },
  followButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ff0080',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  followingButton: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#999',
    marginBottom: 16,
    marginTop: -8,
  },
  suggestedList: {
    gap: 12,
  },
  mutualText: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
});
