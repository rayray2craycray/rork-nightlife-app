import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Hash, Lock, Send, MessageCircle, Settings, LogOut, Users, Bell, AlertTriangle, X, Zap } from 'lucide-react-native';
import { mockServers, mockMessages } from '@/mocks/servers';
import { VenueServer, ServerChannel, Message, VibeEnergyLevel, WaitTimeRange } from '@/types';
import * as Haptics from 'expo-haptics';
import { useAppState } from '@/contexts/AppStateContext';

export default function ServersScreen() {
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  if (!selectedServer) {
    return <ServerList onSelectServer={setSelectedServer} />;
  }

  const server = mockServers.find(s => s.venueId === selectedServer);
  if (!server) return null;

  if (!selectedChannel) {
    return (
      <>
        <ChannelList
          server={server}
          onSelectChannel={setSelectedChannel}
          onBack={() => setSelectedServer(null)}
          onOpenSettings={() => setShowSettings(true)}
        />
        <ServerSettingsModal
          visible={showSettings}
          server={server}
          onClose={() => setShowSettings(false)}
          onLeave={() => {
            setShowSettings(false);
            setSelectedServer(null);
          }}
        />
      </>
    );
  }

  return (
    <ChatView
      server={server}
      channelId={selectedChannel}
      onBack={() => setSelectedChannel(null)}
    />
  );
}

interface ServerListProps {
  onSelectServer: (serverId: string) => void;
}

function ServerList({ onSelectServer }: ServerListProps) {
  const { joinedServers } = useAppState();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#1a1a1a']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Servers</Text>
          <Text style={styles.headerSubtitle}>Connected to {joinedServers.length} venues</Text>
        </View>

        <ScrollView style={styles.serverList} showsVerticalScrollIndicator={false}>
          {joinedServers.length === 0 ? (
            <View style={styles.emptyState}>
              <MessageCircle size={48} color="#666" />
              <Text style={styles.emptyStateTitle}>No servers yet</Text>
              <Text style={styles.emptyStateText}>Join a venue&apos;s lobby from the Discovery tab to start chatting!</Text>
            </View>
          ) : (
            joinedServers.map((server) => (
            <TouchableOpacity
              key={server.venueId}
              style={styles.serverCard}
              onPress={() => onSelectServer(server.venueId)}
            >
              <LinearGradient
                colors={['#1a1a2e', '#1a1a1a']}
                style={styles.serverCardGradient}
              >
                <View style={styles.serverInfo}>
                  <Text style={styles.serverName}>{server.venueName}</Text>
                  <Text style={styles.memberCount}>{server.memberCount} members</Text>
                </View>
                <View style={styles.serverMeta}>
                  <Text style={styles.lastActivity}>
                    {getTimeAgo(server.lastActivity)}
                  </Text>
                  {getTotalUnread(server.channels) > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{getTotalUnread(server.channels)}</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))
          )}

          <TouchableOpacity style={styles.joinNewCard}>
            <MessageCircle size={32} color="#ff0080" />
            <Text style={styles.joinNewText}>Join a new server</Text>
            <Text style={styles.joinNewSubtext}>Visit a venue and scan the QR code</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

interface ChannelListProps {
  server: VenueServer;
  onSelectChannel: (channelId: string) => void;
  onBack: () => void;
  onOpenSettings: () => void;
}

function ChannelList({ server, onSelectChannel, onBack, onOpenSettings }: ChannelListProps) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#1a1a1a']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={onBack}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onOpenSettings} style={styles.settingsButton}>
              <Settings size={24} color="#ff0080" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>{server.venueName}</Text>
          <Text style={styles.headerSubtitle}>{server.memberCount} members online</Text>
        </View>

        <ScrollView style={styles.channelList} showsVerticalScrollIndicator={false}>
          <View style={styles.channelSection}>
            <Text style={styles.sectionTitle}>PUBLIC LOBBY</Text>
            {server.channels
              .filter(ch => ch.type === 'PUBLIC_LOBBY')
              .map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  onPress={() => onSelectChannel(channel.id)}
                />
              ))}
          </View>

          <View style={styles.channelSection}>
            <Text style={styles.sectionTitle}>INNER CIRCLE</Text>
            {server.channels
              .filter(ch => ch.type === 'INNER_CIRCLE')
              .map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  onPress={() => onSelectChannel(channel.id)}
                />
              ))}
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

interface ChannelItemProps {
  channel: ServerChannel;
  onPress: () => void;
}

function ChannelItem({ channel, onPress }: ChannelItemProps) {
  return (
    <TouchableOpacity
      style={[styles.channelItem, channel.isLocked && styles.channelLocked]}
      onPress={channel.isLocked ? undefined : onPress}
      disabled={channel.isLocked}
    >
      {channel.isLocked ? (
        <Lock size={18} color="#666" />
      ) : (
        <Hash size={18} color="#ff0080" />
      )}
      <Text style={[styles.channelName, channel.isLocked && styles.channelNameLocked]}>
        {channel.name}
      </Text>
      {channel.unreadCount > 0 && (
        <View style={styles.channelUnread}>
          <Text style={styles.channelUnreadText}>{channel.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

interface ChatViewProps {
  server: VenueServer;
  channelId: string;
  onBack: () => void;
}

function ChatView({ server, channelId, onBack }: ChatViewProps) {
  const [message, setMessage] = useState<string>('');
  const [showVibeCheck, setShowVibeCheck] = useState<boolean>(false);
  const messages = mockMessages.filter(m => m.channelId === channelId);
  const channel = server.channels.find(c => c.id === channelId);
  const isGeneralChannel = channel?.name === 'general' && channel?.type === 'PUBLIC_LOBBY';

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Message Sent', 'Your message has been sent to the channel!');
    setMessage('');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#1a1a1a']}
        style={styles.gradient}
      >
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.chatHeaderTitle}>#{server.channels.find(c => c.id === channelId)?.name}</Text>
        </View>

        {isGeneralChannel && (
          <VibeCheckOverlay 
            venueId={server.venueId}
            venueName={server.venueName}
            visible={showVibeCheck}
            onToggle={() => setShowVibeCheck(!showVibeCheck)}
          />
        )}

        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            value={message}
            onChangeText={setMessage}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
            <Send size={20} color="#000000" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const badgeColors: Record<string, string> = {
    PLATINUM: '#ff0080',
    WHALE: '#ff006e',
    PERFORMER: '#ffcc00',
    REGULAR: '#6680ff',
    GUEST: '#666',
  };

  return (
    <View style={[styles.messageBubble, message.isOwn && styles.messageBubbleOwn]}>
      <View style={styles.messageHeader}>
        <Text style={styles.messageName}>{message.userName}</Text>
        <View style={[styles.messageBadge, { backgroundColor: badgeColors[message.userBadge] }]}>
          <Text style={styles.messageBadgeText}>{message.userBadge}</Text>
        </View>
      </View>
      <Text style={styles.messageContent}>{message.content}</Text>
      <Text style={styles.messageTime}>{getTimeAgo(message.timestamp)}</Text>
    </View>
  );
}

function getTotalUnread(channels: ServerChannel[]): number {
  return channels.reduce((sum, ch) => sum + ch.unreadCount, 0);
}

function getTimeAgo(timestamp: string): string {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface ServerSettingsModalProps {
  visible: boolean;
  server: VenueServer;
  onClose: () => void;
  onLeave: () => void;
}

function ServerSettingsModal({ visible, server, onClose, onLeave }: ServerSettingsModalProps) {
  const { leaveServer, profile } = useAppState();
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState<boolean>(false);
  
  const userBadge = profile.badges.find(b => b.venueId === server.venueId);
  const isVIP = userBadge?.badgeType === 'WHALE' || userBadge?.badgeType === 'PLATINUM';

  const handleLeave = () => {
    setShowLeaveConfirmation(true);
  };

  const confirmLeave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowLeaveConfirmation(false);
    onClose();
    onLeave();
    leaveServer.mutate(server.venueId, {
      onError: (error) => {
        console.error('Error leaving server:', error);
      }
    });
  };

  const cancelLeave = () => {
    setShowLeaveConfirmation(false);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={{ flex: 1 }} 
            activeOpacity={1} 
            onPress={onClose}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Server Settings</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeButton}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Server Info</Text>
              <View style={styles.settingsItem}>
                <Users size={20} color="#ff0080" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingsItemText}>{server.venueName}</Text>
                  <Text style={styles.settingsItemSubtext}>{server.memberCount} members</Text>
                </View>
              </View>
              {userBadge && (
                <View style={styles.settingsItem}>
                  <Bell size={20} color="#ff0080" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingsItemText}>Your Status</Text>
                    <Text style={styles.settingsItemSubtext}>{userBadge.badgeType}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Danger Zone</Text>
              <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
                <LogOut size={20} color="#ff006e" />
                <Text style={styles.leaveButtonText}>Leave Server</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isVIP ? (
        <VIPLeaveConfirmationModal
          visible={showLeaveConfirmation}
          venueName={server.venueName}
          badgeType={userBadge?.badgeType || 'WHALE'}
          onConfirm={confirmLeave}
          onCancel={cancelLeave}
        />
      ) : (
        <PublicLobbyLeaveConfirmationModal
          visible={showLeaveConfirmation}
          venueName={server.venueName}
          onConfirm={confirmLeave}
          onCancel={cancelLeave}
        />
      )}
    </>
  );
}

interface PublicLobbyLeaveConfirmationModalProps {
  visible: boolean;
  venueName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function PublicLobbyLeaveConfirmationModal({ 
  visible, 
  venueName, 
  onConfirm, 
  onCancel 
}: PublicLobbyLeaveConfirmationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.confirmModalOverlay}>
        <View style={styles.confirmModalContent}>
          <View style={styles.confirmModalHeader}>
            <Text style={styles.confirmModalTitle}>Leave Public Lobby?</Text>
          </View>

          <Text style={styles.confirmModalBody}>
            You will stop receiving live updates and chat notifications for {venueName}. You can re-join anytime by scanning the venue QR code.
          </Text>

          <View style={styles.confirmModalButtons}>
            <TouchableOpacity 
              style={[styles.confirmModalButton, styles.confirmModalButtonCancel]} 
              onPress={onCancel}
            >
              <Text style={styles.confirmModalButtonTextCancel}>Stay</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.confirmModalButton, styles.confirmModalButtonLeave]} 
              onPress={onConfirm}
            >
              <Text style={styles.confirmModalButtonTextLeave}>Leave Lobby</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface VIPLeaveConfirmationModalProps {
  visible: boolean;
  venueName: string;
  badgeType: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function VIPLeaveConfirmationModal({ 
  visible, 
  venueName, 
  badgeType, 
  onConfirm, 
  onCancel 
}: VIPLeaveConfirmationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.confirmModalOverlay}>
        <View style={styles.confirmModalContent}>
          <View style={styles.confirmModalHeader}>
            <AlertTriangle size={28} color="#ff006e" />
            <Text style={styles.confirmModalTitle}>Relinquish VIP Access?</Text>
          </View>

          <Text style={styles.confirmModalBody}>
            You are about to leave the {venueName} Inner Circle. Your &ldquo;{badgeType}&rdquo; status and history will be archived, but you will lose access to private chats and performer requests immediately.
          </Text>

          <View style={styles.vipWarningBox}>
            <AlertTriangle size={16} color="#ff006e" />
            <Text style={styles.vipWarningText}>Re-entry requires meeting the spend threshold again.</Text>
          </View>

          <View style={styles.confirmModalButtons}>
            <TouchableOpacity 
              style={[styles.confirmModalButton, styles.confirmModalButtonCancel]} 
              onPress={onCancel}
            >
              <Text style={styles.confirmModalButtonTextCancel}>Keep My Status</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.confirmModalButton, styles.confirmModalButtonDestroy]} 
              onPress={onConfirm}
            >
              <Text style={styles.confirmModalButtonTextDestroy}>Confirm Exit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface AccessRevokedModalProps {
  visible: boolean;
  venueName: string;
  onDismiss: () => void;
}

interface VibeCheckOverlayProps {
  venueId: string;
  venueName: string;
  visible: boolean;
  onToggle: () => void;
}

function VibeCheckOverlay({ venueId, venueName, visible, onToggle }: VibeCheckOverlayProps) {
  const { canVoteVibeCheck, getVibeCooldownRemaining, submitVibeCheck, getVenueVibe } = useAppState();
  const [music, setMusic] = useState<number>(3);
  const [density, setDensity] = useState<number>(3);
  const [energy, setEnergy] = useState<VibeEnergyLevel>('Social');
  const [waitTime, setWaitTime] = useState<WaitTimeRange>('0-10m');

  const canVote = canVoteVibeCheck(venueId);
  const cooldownRemaining = getVibeCooldownRemaining(venueId);
  const currentVibe = getVenueVibe(venueId);

  const handleSubmit = async () => {
    if (!canVote) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await submitVibeCheck.mutateAsync({
      venueId,
      music,
      density,
      energy,
      waitTime,
    });
    Alert.alert('Vibe Check Submitted!', 'Thanks for helping the community know what\'s happening at ' + venueName);
    onToggle();
  };

  const formatCooldown = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const getVibeColor = (energyLevel: VibeEnergyLevel): string => {
    switch (energyLevel) {
      case 'Chill': return '#6680ff';
      case 'Social': return '#b366ff';
      case 'Wild': return '#ff006e';
      default: return '#ff0080';
    }
  };

  if (!visible) {
    return (
      <TouchableOpacity style={styles.vibeCheckContainer} onPress={onToggle}>
        <View style={styles.vibeCheckCollapsed}>
          <Zap size={20} color="#ff0080" />
          <Text style={styles.vibeCheckCollapsedText}>Vibe Check</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.vibeCheckContainer}>
      <TouchableOpacity style={styles.vibeCheckHeader} onPress={onToggle}>
        <Text style={styles.vibeCheckTitle}>Vibe Check</Text>
        <X size={20} color="#ff0080" />
      </TouchableOpacity>

      <ScrollView style={styles.vibeCheckScroll} contentContainerStyle={styles.vibeCheckContent} showsVerticalScrollIndicator={false}>
        {currentVibe && (
          <View style={styles.vibeCheckCurrentData}>
            <Text style={styles.vibeCheckCurrentTitle}>Current Vibe</Text>
            <View style={styles.vibeCheckCurrentRow}>
              <Text style={styles.vibeCheckCurrentLabel}>Music</Text>
              <Text style={styles.vibeCheckCurrentValue}>{currentVibe.musicScore.toFixed(1)}/5</Text>
            </View>
            <View style={styles.vibeCheckCurrentRow}>
              <Text style={styles.vibeCheckCurrentLabel}>Density</Text>
              <Text style={styles.vibeCheckCurrentValue}>{currentVibe.densityScore.toFixed(1)}/5</Text>
            </View>
            <View style={styles.vibeCheckCurrentRow}>
              <Text style={styles.vibeCheckCurrentLabel}>Energy</Text>
              <Text style={[styles.vibeCheckCurrentValue, { color: getVibeColor(currentVibe.energyLevel) }]}>
                {currentVibe.energyLevel}
              </Text>
            </View>
            <View style={styles.vibeCheckCurrentRow}>
              <Text style={styles.vibeCheckCurrentLabel}>Wait Time</Text>
              <Text style={styles.vibeCheckCurrentValue}>{currentVibe.waitTime}</Text>
            </View>
          </View>
        )}

        <View style={styles.vibeCheckSection}>
          <Text style={styles.vibeCheckLabel}>Music</Text>
          <View style={styles.vibeSlider}>
            <View style={styles.sliderTrack}>
              <LinearGradient
                colors={['#6680ff', '#ff0080']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.sliderFill, { width: `${(music / 5) * 100}%` }]}
              />
            </View>
            <View style={styles.sliderLabels}>
              {[1, 2, 3, 4, 5].map((val) => (
                <TouchableOpacity key={val} onPress={() => setMusic(val)}>
                  <Text style={[styles.sliderLabel, music === val && styles.sliderLabelActive]}>
                    {val === 1 ? 'Weak' : val === 5 ? 'Fire' : val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.vibeCheckSection}>
          <Text style={styles.vibeCheckLabel}>Density</Text>
          <View style={styles.vibeSlider}>
            <View style={styles.sliderTrack}>
              <LinearGradient
                colors={['#6680ff', '#ff006e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.sliderFill, { width: `${(density / 5) * 100}%` }]}
              />
            </View>
            <View style={styles.sliderLabels}>
              {[1, 2, 3, 4, 5].map((val) => (
                <TouchableOpacity key={val} onPress={() => setDensity(val)}>
                  <Text style={[styles.sliderLabel, density === val && styles.sliderLabelActive]}>
                    {val === 1 ? 'Empty' : val === 5 ? 'Packed' : val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.vibeCheckSection}>
          <Text style={styles.vibeCheckLabel}>Energy</Text>
          <View style={styles.energyButtons}>
            {(['Chill', 'Social', 'Wild'] as VibeEnergyLevel[]).map((level) => (
              <TouchableOpacity
                key={level}
                style={[styles.energyButton, energy === level && styles.energyButtonActive]}
                onPress={() => setEnergy(level)}
              >
                <Text style={[styles.energyButtonText, energy === level && styles.energyButtonTextActive]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.vibeCheckSection}>
          <Text style={styles.vibeCheckLabel}>Wait Time</Text>
          <View style={styles.waitTimeButtons}>
            {(['0-10m', '10-30m', '30m+'] as WaitTimeRange[]).map((time) => (
              <TouchableOpacity
                key={time}
                style={[styles.waitTimeButton, waitTime === time && styles.waitTimeButtonActive]}
                onPress={() => setWaitTime(time)}
              >
                <Text style={[styles.waitTimeButtonText, waitTime === time && styles.waitTimeButtonTextActive]}>
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.vibeSubmitButton, !canVote && styles.vibeSubmitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canVote || submitVibeCheck.isPending}
        >
          <Text style={styles.vibeSubmitButtonText}>
            {submitVibeCheck.isPending ? 'Submitting...' : 'Submit Vibe Check'}
          </Text>
        </TouchableOpacity>

        {!canVote && (
          <Text style={styles.vibeCooldownText}>
            Next vote available in {formatCooldown(cooldownRemaining)}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

export function AccessRevokedModal({ visible, venueName, onDismiss }: AccessRevokedModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.confirmModalOverlay}>
        <View style={styles.confirmModalContent}>
          <View style={styles.revokedHeader}>
            <View style={styles.revokedIconContainer}>
              <X size={32} color="#ff006e" />
            </View>
            <Text style={styles.confirmModalTitle}>Access Revoked</Text>
          </View>

          <Text style={styles.confirmModalBody}>
            Your access to {venueName} has been suspended by the venue management for a violation of community guidelines.
          </Text>

          <View style={styles.revokedDetailBox}>
            <Text style={styles.revokedDetailText}>
              Your linked card has been disconnected from this venue&apos;s loyalty logic.
            </Text>
          </View>

          <TouchableOpacity style={styles.revokedAppealButton}>
            <Text style={styles.revokedAppealButtonText}>Appeal Decision / View Community Guidelines</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.revokedDismissButton} 
            onPress={onDismiss}
          >
            <Text style={styles.revokedDismissButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ff0080',
    fontWeight: '600' as const,
  },
  backButton: {
    fontSize: 16,
    color: '#ff0080',
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  serverList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  serverCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  serverCardGradient: {
    padding: 16,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 13,
    color: '#999',
  },
  serverMeta: {
    alignItems: 'flex-end' as const,
    gap: 6,
  },
  lastActivity: {
    fontSize: 12,
    color: '#666',
  },
  unreadBadge: {
    backgroundColor: '#ff0080',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center' as const,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#000000',
  },
  joinNewCard: {
    backgroundColor: 'rgba(0, 255, 204, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 204, 0.3)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center' as const,
    marginTop: 12,
    marginBottom: 40,
  },
  joinNewText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#ff0080',
    marginTop: 12,
  },
  joinNewSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
    textAlign: 'center' as const,
  },
  channelList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  channelSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#666',
    marginBottom: 8,
  },
  channelItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderRadius: 8,
  },
  channelLocked: {
    opacity: 0.5,
  },
  channelName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
    flex: 1,
  },
  channelNameLocked: {
    color: '#666',
  },
  channelUnread: {
    backgroundColor: '#ff006e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center' as const,
  },
  channelUnreadText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#fff',
  },
  chatHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  chatHeaderTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 20,
    gap: 16,
  },
  messageBubble: {
    backgroundColor: '#1a1a2e',
    padding: 12,
    borderRadius: 12,
    maxWidth: '85%',
  },
  messageBubbleOwn: {
    backgroundColor: '#ff0080',
    alignSelf: 'flex-end' as const,
  },
  messageHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 6,
  },
  messageName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  messageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  messageBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#000000',
  },
  messageContent: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row' as const,
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    color: '#fff',
    fontSize: 15,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ff0080',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center' as const,
    paddingHorizontal: 40,
  },
  headerTop: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  settingsButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
  },
  closeButton: {
    fontSize: 16,
    color: '#ff0080',
    fontWeight: '600' as const,
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase' as const,
  },
  settingsItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  settingsItemText: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    fontWeight: '600' as const,
  },
  settingsItemSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  leaveButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(255, 0, 110, 0.15)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff006e',
    gap: 8,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#ff006e',
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
  },
  confirmModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  confirmModalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
  },
  confirmModalBody: {
    fontSize: 15,
    color: '#ccc',
    lineHeight: 22,
    marginBottom: 20,
  },
  vipWarningBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255, 0, 110, 0.15)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff006e',
    gap: 8,
    marginBottom: 20,
  },
  vipWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#ff006e',
    fontWeight: '600' as const,
  },
  confirmModalButtons: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  confirmModalButtonCancel: {
    backgroundColor: '#ff0080',
  },
  confirmModalButtonLeave: {
    backgroundColor: '#444',
  },
  confirmModalButtonDestroy: {
    backgroundColor: '#ff006e',
  },
  confirmModalButtonTextCancel: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#000000',
  },
  confirmModalButtonTextLeave: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#ccc',
  },
  confirmModalButtonTextDestroy: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  revokedHeader: {
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  revokedIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 0, 110, 0.15)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#ff006e',
  },
  revokedDetailBox: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  revokedDetailText: {
    fontSize: 13,
    color: '#999',
    lineHeight: 20,
  },
  revokedAppealButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  revokedAppealButtonText: {
    fontSize: 13,
    color: '#ff0080',
    fontWeight: '600' as const,
    textDecorationLine: 'underline' as const,
  },
  revokedDismissButton: {
    backgroundColor: '#444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  revokedDismissButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  vibeCheckContainer: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  vibeCheckHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  vibeCheckTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  vibeCheckCollapsed: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
    gap: 12,
  },
  vibeCheckCollapsedText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#ff0080',
  },
  vibeCheckScroll: {
    maxHeight: 400,
  },
  vibeCheckContent: {
    padding: 16,
  },
  vibeCheckSection: {
    marginBottom: 20,
  },
  vibeCheckLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#999',
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  vibeSlider: {
    gap: 8,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: '#000000',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 4,
  },
  sliderLabels: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  sliderLabel: {
    fontSize: 11,
    color: '#666',
  },
  sliderLabelActive: {
    color: '#ff0080',
    fontWeight: '700' as const,
  },
  energyButtons: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  energyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#000000',
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  energyButtonActive: {
    backgroundColor: 'rgba(0, 255, 204, 0.15)',
    borderColor: '#ff0080',
  },
  energyButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#666',
  },
  energyButtonTextActive: {
    color: '#ff0080',
    fontWeight: '700' as const,
  },
  waitTimeButtons: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  waitTimeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#000000',
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  waitTimeButtonActive: {
    backgroundColor: 'rgba(0, 255, 204, 0.15)',
    borderColor: '#ff0080',
  },
  waitTimeButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#666',
  },
  waitTimeButtonTextActive: {
    color: '#ff0080',
    fontWeight: '700' as const,
  },
  vibeSubmitButton: {
    backgroundColor: '#ff0080',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginTop: 4,
  },
  vibeSubmitButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  vibeSubmitButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#000000',
  },
  vibeCooldownText: {
    fontSize: 12,
    color: '#ff006e',
    textAlign: 'center' as const,
    marginTop: 8,
  },
  vibeMeterContainer: {
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  vibeCheckCurrentData: {
    backgroundColor: '#000000',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  vibeCheckCurrentTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase' as const,
  },
  vibeCheckCurrentRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  vibeCheckCurrentLabel: {
    fontSize: 13,
    color: '#999',
  },
  vibeCheckCurrentValue: {
    fontSize: 13,
    color: '#ff0080',
    fontWeight: '600' as const,
  },
});
