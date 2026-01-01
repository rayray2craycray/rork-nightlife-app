import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, Alert, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePerformer } from '@/contexts/PerformerContext';
import { useAppState } from '@/contexts/AppStateContext';
import { Calendar, DollarSign, TrendingUp, Video, X, Music, Camera, Upload, Play, Pause, RotateCw, Zap, ZapOff, Scissors, Check, Type, Sparkles, Sticker, Music2, Share2, Instagram, ExternalLink } from 'lucide-react-native';
import { Gig } from '@/types';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Video as ExpoVideo, ResizeMode, AVPlaybackStatus } from 'expo-av';
import Slider from '@react-native-community/slider';

const COLORS = {
  background: '#0a0a0f',
  card: '#15151f',
  accent: '#00ffcc',
  purple: '#9d4edd',
  text: '#ffffff',
  textSecondary: '#999999',
  border: '#2a2a3a',
  success: '#4ade80',
  warning: '#fbbf24',
};

type PromoStep = 'SELECT_METHOD' | 'RECORDING' | 'TRIM' | 'PREVIEW' | 'CUSTOMIZE' | 'SHARE';
type SafeZoneType = 'instagram' | 'tiktok' | 'none';
type VibeFilter = 'none' | 'neon-glitch' | 'afterhours-noir' | 'vhs-retro' | 'cyber-wave' | 'golden-hour';
type StickerType = 'none' | 'get-tickets' | 'join-lobby' | 'live-tonight' | 'swipe-up';

export default function StudioScreen() {
  const { profile } = useAppState();
  const { upcomingGigs, completedGigs, analytics, createPromoVideo, selectedGig, setSelectedGig } = usePerformer();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'create'>('upcoming');
  const [promoStep, setPromoStep] = useState<PromoStep>('SELECT_METHOD');
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'neon' | 'beat-sync'>('neon');
  const [safeZone, setSafeZone] = useState<SafeZoneType>('instagram');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(15);
  const [videoDuration, setVideoDuration] = useState(15);
  const [selectedFilter, setSelectedFilter] = useState<VibeFilter>('neon-glitch');
  const [selectedSticker, setSelectedSticker] = useState<StickerType>('get-tickets');
  const [showTextOverlay, setShowTextOverlay] = useState(true);
  const [audioTrack, setAudioTrack] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string>('');
  const cameraRef = useRef<any>(null);
  const videoRef = useRef<any>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  if (profile.role !== 'TALENT') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDeniedContainer}>
          <LinearGradient
            colors={['#ff006e', '#8338ec'] as [string, string, ...string[]]}
            style={styles.accessDeniedIconContainer}
          >
            <Video size={48} color="#ffffff" strokeWidth={2.5} />
          </LinearGradient>
          <Text style={styles.accessDeniedTitle}>Talent Access Only</Text>
          <Text style={styles.accessDeniedText}>
            The Promo Studio is exclusively for performers and DJs.
            Switch to a Talent account to create promotional videos and manage your gigs.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleRequestPermissions = async () => {
    const cameraStatus = await requestCameraPermission();
    
    if (!cameraStatus.granted) {
      Alert.alert(
        'Permissions Required',
        'Camera and microphone access are needed to record promo videos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const startCountdown = () => {
    setCountdown(3);
    let count = 3;
    
    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      
      if (count === 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setCountdown(null);
        beginRecording();
      }
    }, 1000);
  };

  const beginRecording = async () => {
    if (!cameraRef.current) return;

    console.log('Starting video recording...');
    setIsRecording(true);
    setRecordingDuration(0);

    recordingIntervalRef.current = setInterval(() => {
      setRecordingDuration(prev => {
        const newDuration = prev + 0.1;
        if (newDuration >= 15) {
          handleStopRecording();
          return 15;
        }
        return newDuration;
      });
    }, 100);

    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: 15,
      });
      
      console.log('Video recorded:', video.uri);
      setRecordedVideo(video.uri);
      setVideoDuration(15);
      setTrimStart(0);
      setTrimEnd(15);
      setPromoStep('TRIM');
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert('Recording Error', 'Failed to record video. Please try again.');
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const handleStartRecording = async () => {
    if (!cameraRef.current) return;

    const hasPermissions = await handleRequestPermissions();
    if (!hasPermissions) return;

    startCountdown();
  };

  const handleStopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;

    console.log('Stopping video recording...');
    setIsRecording(false);
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    try {
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error('Stop recording error:', error);
    }
  };

  const handleUploadVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 15,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('Video selected:', result.assets[0].uri);
        const duration = result.assets[0].duration ? result.assets[0].duration / 1000 : 15;
        setRecordedVideo(result.assets[0].uri);
        setVideoDuration(duration);
        setTrimStart(0);
        setTrimEnd(Math.min(duration, 15));
        setPromoStep('TRIM');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Error', 'Failed to select video. Please try again.');
    }
  };

  const toggleCamera = () => {
    setCameraType(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlashMode(current => {
      if (current === 'off') return 'on';
      return 'off';
    });
  };

  const getFlashIcon = () => {
    if (flashMode === 'off') return <ZapOff size={24} color={COLORS.text} />;
    return <Zap size={24} color={COLORS.accent} />;
  };

  const handlePlayPause = async () => {
    if (!videoRef.current) return;

    try {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const handleRetake = () => {
    setRecordedVideo(null);
    setRecordingDuration(0);
    setIsPlaying(false);
    setTrimStart(0);
    setTrimEnd(15);
    setPromoStep('SELECT_METHOD');
  };

  const handleContinueFromTrim = () => {
    const trimmedDuration = trimEnd - trimStart;
    if (trimmedDuration < 10) {
      Alert.alert('Video Too Short', 'Please select at least 10 seconds of video.');
      return;
    }
    if (trimmedDuration > 15) {
      Alert.alert('Video Too Long', 'Please select at most 15 seconds of video.');
      return;
    }
    console.log(`Trimmed video: ${trimStart}s to ${trimEnd}s (${trimmedDuration}s)`);
    setPromoStep('PREVIEW');
  };

  const handleSelectTemplate = (template: 'neon' | 'beat-sync') => {
    setSelectedTemplate(template);
  };

  const handleContinueToCustomize = () => {
    setPromoStep('CUSTOMIZE');
  };

  const handleSelectAudio = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        setAudioTrack(result.assets[0].uri);
        setAudioName('Custom Track');
        Alert.alert('Audio Added', 'Your audio track has been added to the video.');
      }
    } catch (error) {
      console.error('Audio selection error:', error);
    }
  };

  const handleContinueToShare = () => {
    setPromoStep('SHARE');
  };

  const handleShareToInstagram = async () => {
    if (!recordedVideo) return;
    
    try {
      await Share.share({
        message: `Check out my upcoming gig at ${selectedGig?.venueName}! 🎵\n${selectedGig?.date} • ${selectedGig?.startTime}`,
        url: recordedVideo,
        title: 'Share to Instagram',
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Share Failed', 'Unable to share to Instagram. Please try again.');
    }
  };

  const handleShareToTikTok = async () => {
    if (!recordedVideo) return;
    
    try {
      await Share.share({
        message: `Catch me at ${selectedGig?.venueName}! 🔥\n${selectedGig?.date} • ${selectedGig?.startTime}\n#Nightlife #DJ #LiveMusic`,
        url: recordedVideo,
        title: 'Share to TikTok',
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Share Failed', 'Unable to share to TikTok. Please try again.');
    }
  };

  const handleShareGeneric = async () => {
    if (!recordedVideo) return;
    
    try {
      await Share.share({
        message: `Check out my upcoming gig!\n${selectedGig?.venueName}\n${selectedGig?.date} • ${selectedGig?.startTime}`,
        url: recordedVideo,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handlePublishVideo = () => {
    console.log('Publishing video:', {
      template: selectedTemplate,
      filter: selectedFilter,
      sticker: selectedSticker,
      audioTrack: audioTrack ? 'Custom' : 'None',
      textOverlay: showTextOverlay,
    });
    
    handleContinueToShare();
  };

  const handleCloseModal = () => {
    setSelectedGig(null);
    setRecordedVideo(null);
    setPromoStep('SELECT_METHOD');
    setIsPlaying(false);
    setRecordingDuration(0);
    setCountdown(null);
    setTrimStart(0);
    setTrimEnd(15);
    setSelectedFilter('neon-glitch');
    setSelectedSticker('get-tickets');
    setShowTextOverlay(true);
    setAudioTrack(null);
    setAudioName('');
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
  };

  const renderStatsCard = (icon: React.ReactNode, label: string, value: string, subtitle?: string) => (
    <View style={styles.statsCard}>
      <View style={styles.statsIconContainer}>
        {icon}
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsLabel}>{label}</Text>
      {subtitle && <Text style={styles.statsSubtitle}>{subtitle}</Text>}
    </View>
  );

  const getFilterStyle = (filter: VibeFilter) => {
    switch (filter) {
      case 'neon-glitch':
        return { backgroundColor: 'rgba(0, 255, 204, 0.15)' };
      case 'afterhours-noir':
        return { backgroundColor: 'rgba(0, 0, 0, 0.4)' };
      case 'vhs-retro':
        return { backgroundColor: 'rgba(255, 100, 100, 0.2)' };
      case 'cyber-wave':
        return { backgroundColor: 'rgba(157, 78, 221, 0.2)' };
      case 'golden-hour':
        return { backgroundColor: 'rgba(251, 191, 36, 0.2)' };
      default:
        return {};
    }
  };

  const renderFilterOption = (filter: VibeFilter, label: string) => (
    <TouchableOpacity
      key={filter}
      style={[styles.filterOption, selectedFilter === filter && styles.filterOptionActive]}
      onPress={() => setSelectedFilter(filter)}
    >
      <View style={[styles.filterPreview, getFilterStyle(filter)]}>
        <Text style={styles.filterPreviewText}>Aa</Text>
      </View>
      <Text style={[styles.filterLabel, selectedFilter === filter && styles.filterLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderSticker = (sticker: StickerType) => {
    const stickerConfig = {
      'get-tickets': { text: 'Get Tickets', icon: '🎫', gradient: ['#00ffcc', '#00ccaa'] },
      'join-lobby': { text: 'Join Lobby', icon: '🎉', gradient: ['#9d4edd', '#7b2cbf'] },
      'live-tonight': { text: 'Live Tonight', icon: '🔥', gradient: ['#ff006e', '#d90059'] },
      'swipe-up': { text: 'Swipe Up', icon: '⬆️', gradient: ['#fbbf24', '#f59e0b'] },
    };

    if (sticker === 'none') return null;
    const config = stickerConfig[sticker];

    return (
      <LinearGradient
        colors={config.gradient as [string, string, ...string[]]}
        style={styles.sticker}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.stickerIcon}>{config.icon}</Text>
        <Text style={styles.stickerText}>{config.text}</Text>
      </LinearGradient>
    );
  };

  const renderStickerOption = (sticker: StickerType, label: string) => (
    <TouchableOpacity
      key={sticker}
      style={[styles.filterOption, selectedSticker === sticker && styles.filterOptionActive]}
      onPress={() => setSelectedSticker(sticker)}
    >
      <View style={styles.stickerPreview}>
        {sticker !== 'none' ? renderSticker(sticker) : (
          <Text style={styles.stickerPreviewText}>None</Text>
        )}
      </View>
      <Text style={[styles.filterLabel, selectedSticker === sticker && styles.filterLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderGigCard = (gig: Gig) => {
    const isUpcoming = gig.status === 'UPCOMING';
    
    return (
      <TouchableOpacity
        key={gig.id}
        style={styles.gigCard}
        onPress={() => isUpcoming ? createPromoVideo(gig) : null}
      >
        <Image source={{ uri: gig.venueImageUrl }} style={styles.gigImage} />
        
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={styles.gigGradient}
        />

        <View style={styles.gigContent}>
          <View style={styles.gigHeader}>
            <Text style={styles.gigVenue}>{gig.venueName}</Text>
            {isUpcoming && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>UPCOMING</Text>
              </View>
            )}
          </View>

          <View style={styles.gigDetails}>
            <View style={styles.gigDetailRow}>
              <Calendar size={14} color={COLORS.textSecondary} />
              <Text style={styles.gigDetailText}>
                {formatDate(gig.date)} • {gig.startTime} - {gig.endTime}
              </Text>
            </View>
            <View style={styles.gigDetailRow}>
              <Music size={14} color={COLORS.textSecondary} />
              <Text style={styles.gigDetailText}>{gig.genre}</Text>
            </View>
          </View>

          <View style={styles.gigStats}>
            <View style={styles.gigStatItem}>
              <DollarSign size={16} color={COLORS.accent} />
              <Text style={styles.gigStatText}>{formatCurrency(gig.fee)}</Text>
              <Text style={styles.gigStatLabel}>Fee</Text>
            </View>

            {!isUpcoming && gig.barSalesGenerated && (
              <View style={styles.gigStatItem}>
                <TrendingUp size={16} color={COLORS.success} />
                <Text style={styles.gigStatText}>{formatCurrency(gig.barSalesGenerated)}</Text>
                <Text style={styles.gigStatLabel}>Bar Sales</Text>
              </View>
            )}

            {gig.ticketClicks !== undefined && gig.ticketClicks > 0 && (
              <View style={styles.gigStatItem}>
                <Video size={16} color={COLORS.purple} />
                <Text style={styles.gigStatText}>{gig.ticketClicks}</Text>
                <Text style={styles.gigStatLabel}>Clicks</Text>
              </View>
            )}
          </View>

          {isUpcoming && (
            <TouchableOpacity
              style={styles.promoButton}
              onPress={() => createPromoVideo(gig)}
            >
              <Video size={16} color={COLORS.background} />
              <Text style={styles.promoButtonText}>Create Promo</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Studio</Text>
        <Text style={styles.headerSubtitle}>Manage your gigs & content</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          {renderStatsCard(
            <DollarSign size={24} color={COLORS.accent} />,
            'Total Earnings',
            formatCurrency(analytics.totalRevenue),
            `${analytics.totalGigs} completed gigs`
          )}
          {renderStatsCard(
            <TrendingUp size={24} color={COLORS.success} />,
            'Bar Sales Generated',
            formatCurrency(analytics.totalBarSalesGenerated),
            'Venue revenue'
          )}
          {renderStatsCard(
            <Video size={24} color={COLORS.purple} />,
            'Avg Ticket Clicks',
            Math.round(analytics.averageTicketClicks).toString(),
            'Per promo video'
          )}
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
              Upcoming ({upcomingGigs.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
              Completed ({completedGigs.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'create' && styles.tabActive]}
            onPress={() => setActiveTab('create')}
          >
            <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>
              Create Video
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gigsContainer}>
          {activeTab === 'upcoming' && upcomingGigs.map(renderGigCard)}
          {activeTab === 'completed' && completedGigs.map(renderGigCard)}
          
          {activeTab === 'create' && (
            <View style={styles.createVideoContainer}>
              <View style={styles.createVideoHeader}>
                <View style={styles.createVideoIconContainer}>
                  <Video size={32} color={COLORS.accent} />
                </View>
                <Text style={styles.createVideoTitle}>Promo Video Studio</Text>
                <Text style={styles.createVideoSubtitle}>
                  Create 10-15 second promotional videos for your upcoming gigs with professional templates and effects.
                </Text>
              </View>

              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Camera size={20} color={COLORS.accent} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>9:16 Vertical Recording</Text>
                    <Text style={styles.featureDesc}>Perfect for Instagram Reels & TikTok with countdown timer and flash toggle</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Scissors size={20} color={COLORS.purple} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Smart Clip Trimmer</Text>
                    <Text style={styles.featureDesc}>Precise slider to trim your videos to exactly 10-15 seconds</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Sparkles size={20} color={COLORS.accent} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Vibe Filters</Text>
                    <Text style={styles.featureDesc}>5 nightlife-themed filters: Neon Glitch, Afterhours Noir, VHS Retro & more</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Type size={20} color={COLORS.purple} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Dynamic Text Overlays</Text>
                    <Text style={styles.featureDesc}>Auto-pulls venue name, event date, and performer handle from your gigs</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Sticker size={20} color={COLORS.accent} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Call-to-Action Stickers</Text>
                    <Text style={styles.featureDesc}>Interactive stickers like &quot;Get Tickets&quot; and &quot;Join Lobby&quot; to drive engagement</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Music2 size={20} color={COLORS.purple} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Audio Library</Text>
                    <Text style={styles.featureDesc}>Overlay high-quality audio files, DJ drops, or set snippets</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Share2 size={20} color={COLORS.accent} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Native Sharing</Text>
                    <Text style={styles.featureDesc}>Direct-to-story posting for Instagram & TikTok with safe zone overlays</Text>
                  </View>
                </View>
              </View>

              <View style={styles.createVideoActions}>
                <TouchableOpacity 
                  style={styles.createWithGigButton}
                  onPress={() => {
                    if (upcomingGigs.length > 0) {
                      setActiveTab('upcoming');
                    } else {
                      Alert.alert('No Upcoming Gigs', 'You need an upcoming gig to create a promotional video.');
                    }
                  }}
                >
                  <Calendar size={20} color={COLORS.background} />
                  <Text style={styles.createWithGigButtonText}>Select Gig to Promote</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.quickCreateButton}
                  onPress={() => {
                    if (upcomingGigs.length > 0) {
                      createPromoVideo(upcomingGigs[0]);
                    } else {
                      Alert.alert('No Upcoming Gigs', 'You need an upcoming gig to create a promotional video.');
                    }
                  }}
                >
                  <Zap size={20} color={COLORS.accent} />
                  <Text style={styles.quickCreateButtonText}>Quick Create (Next Gig)</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.proTip}>
                <View style={styles.proTipIcon}>
                  <Sparkles size={16} color={COLORS.warning} />
                </View>
                <View style={styles.proTipContent}>
                  <Text style={styles.proTipTitle}>Pro Tip</Text>
                  <Text style={styles.proTipText}>
                    Videos with &quot;Get Tickets&quot; stickers generate 3x more clicks. Export time is under 10 seconds for a snappy experience!
                  </Text>
                </View>
              </View>
            </View>
          )}
          
          {activeTab === 'upcoming' && upcomingGigs.length === 0 && (
            <View style={styles.emptyState}>
              <Calendar size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyStateText}>No upcoming gigs</Text>
              <Text style={styles.emptyStateSubtext}>Your scheduled performances will appear here</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={selectedGig !== null}
        animationType="slide"
        transparent={promoStep !== 'RECORDING'}
        onRequestClose={handleCloseModal}
      >
        {promoStep === 'SELECT_METHOD' && selectedGig && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Promo Video</Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.gigPreview}>
                <Image source={{ uri: selectedGig.venueImageUrl }} style={styles.gigPreviewImage} />
                <View style={styles.gigPreviewInfo}>
                  <Text style={styles.gigPreviewVenue}>{selectedGig.venueName}</Text>
                  <Text style={styles.gigPreviewDate}>
                    {formatDate(selectedGig.date)} • {selectedGig.startTime}
                  </Text>
                  <Text style={styles.gigPreviewGenre}>{selectedGig.genre}</Text>
                </View>
              </View>

              <View style={styles.promoOptions}>
                <Text style={styles.promoOptionsTitle}>Record or Upload</Text>
                <Text style={styles.promoOptionsSubtitle}>Create a 10-15 second promo video</Text>
                
                <TouchableOpacity 
                  style={styles.methodCard}
                  onPress={() => setPromoStep('RECORDING')}
                >
                  <View style={[styles.templateIcon, { backgroundColor: 'rgba(157, 78, 221, 0.1)' }]}>
                    <Camera size={24} color={COLORS.purple} />
                  </View>
                  <View style={styles.templateInfo}>
                    <Text style={styles.templateName}>Record Video</Text>
                    <Text style={styles.templateDesc}>Use your camera to record</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.methodCard}
                  onPress={handleUploadVideo}
                >
                  <View style={styles.templateIcon}>
                    <Upload size={24} color={COLORS.accent} />
                  </View>
                  <View style={styles.templateInfo}>
                    <Text style={styles.templateName}>Upload from Library</Text>
                    <Text style={styles.templateDesc}>Choose an existing video</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {promoStep === 'RECORDING' && (
          <View style={styles.fullScreenContainer}>
            {Platform.OS !== 'web' && cameraPermission?.granted ? (
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={cameraType}
                flash={flashMode}
                mode="video"
              >
                <View style={styles.cameraOverlay}>
                  <View style={styles.cameraHeader}>
                    <TouchableOpacity onPress={handleCloseModal} style={styles.cameraCloseButton}>
                      <X size={28} color={COLORS.text} />
                    </TouchableOpacity>
                    <View style={styles.recordingTimer}>
                      <View style={[styles.recordingDot, isRecording && styles.recordingDotActive]} />
                      <Text style={styles.timerText}>{recordingDuration.toFixed(1)}s / 15.0s</Text>
                    </View>
                    <View style={styles.cameraTopRightButtons}>
                      <TouchableOpacity onPress={toggleFlash} style={styles.cameraFlashButton}>
                        {getFlashIcon()}
                      </TouchableOpacity>
                      <TouchableOpacity onPress={toggleCamera} style={styles.cameraFlipButton}>
                        <RotateCw size={24} color={COLORS.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {countdown !== null && (
                    <View style={styles.countdownOverlay}>
                      <Text style={styles.countdownText}>{countdown}</Text>
                    </View>
                  )}

                  <View style={styles.cameraControls}>
                    <TouchableOpacity
                      style={[styles.recordButton, isRecording && styles.recordButtonActive]}
                      onPress={isRecording ? handleStopRecording : handleStartRecording}
                      disabled={countdown !== null || (isRecording && recordingDuration < 10)}
                    >
                      <View style={[styles.recordButtonInner, isRecording && styles.recordButtonInnerActive]} />
                    </TouchableOpacity>
                  </View>

                  {isRecording && recordingDuration < 10 && (
                    <View style={styles.minDurationWarning}>
                      <Text style={styles.minDurationText}>Record at least 10 seconds</Text>
                    </View>
                  )}
                </View>
              </CameraView>
            ) : (
              <View style={styles.permissionContainer}>
                <Camera size={64} color={COLORS.textSecondary} />
                <Text style={styles.permissionTitle}>Camera Access Required</Text>
                <Text style={styles.permissionText}>Allow camera access to record promo videos</Text>
                <TouchableOpacity style={styles.permissionButton} onPress={handleRequestPermissions}>
                  <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.backButton} onPress={handleCloseModal}>
                  <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {promoStep === 'TRIM' && recordedVideo && selectedGig && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Trim Video</Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.trimContainer}>
                <View style={styles.videoPreviewContainer}>
                  <ExpoVideo
                    ref={videoRef}
                    source={{ uri: recordedVideo }}
                    style={styles.videoPreview}
                    resizeMode={ResizeMode.COVER}
                    isLooping
                    onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                      if (status.isLoaded && status.didJustFinish) {
                        setIsPlaying(false);
                      }
                    }}
                  />
                  
                  <TouchableOpacity style={styles.playPauseButton} onPress={handlePlayPause}>
                    {isPlaying ? (
                      <Pause size={32} color={COLORS.text} />
                    ) : (
                      <Play size={32} color={COLORS.text} />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.trimControls}>
                  <View style={styles.trimInfo}>
                    <Scissors size={20} color={COLORS.accent} />
                    <Text style={styles.trimInfoText}>
                      {trimStart.toFixed(1)}s - {trimEnd.toFixed(1)}s ({(trimEnd - trimStart).toFixed(1)}s)
                    </Text>
                  </View>

                  <View style={styles.sliderContainer}>
                    <Text style={styles.sliderLabel}>Start Time</Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={Math.max(0, videoDuration - 10)}
                      value={trimStart}
                      onValueChange={setTrimStart}
                      minimumTrackTintColor={COLORS.accent}
                      maximumTrackTintColor={COLORS.border}
                      thumbTintColor={COLORS.accent}
                    />
                    <Text style={styles.sliderValue}>{trimStart.toFixed(1)}s</Text>
                  </View>

                  <View style={styles.sliderContainer}>
                    <Text style={styles.sliderLabel}>End Time</Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={Math.min(trimStart + 10, videoDuration)}
                      maximumValue={Math.min(trimStart + 15, videoDuration)}
                      value={trimEnd}
                      onValueChange={setTrimEnd}
                      minimumTrackTintColor={COLORS.accent}
                      maximumTrackTintColor={COLORS.border}
                      thumbTintColor={COLORS.accent}
                    />
                    <Text style={styles.sliderValue}>{trimEnd.toFixed(1)}s</Text>
                  </View>

                  <View style={styles.trimHint}>
                    <Text style={styles.trimHintText}>Video must be 10-15 seconds</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                  <RotateCw size={20} color={COLORS.text} />
                  <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.continueButton} onPress={handleContinueFromTrim}>
                  <Check size={20} color={COLORS.background} />
                  <Text style={styles.continueButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {promoStep === 'PREVIEW' && recordedVideo && selectedGig && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Template & Safe Zones</Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.videoPreviewContainer}>
                <ExpoVideo
                  ref={videoRef}
                  source={{ uri: recordedVideo }}
                  style={styles.videoPreview}
                  resizeMode={ResizeMode.COVER}
                  isLooping
                  onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                    if (status.isLoaded && status.didJustFinish) {
                      setIsPlaying(false);
                    }
                  }}
                />
                
                {safeZone === 'instagram' && (
                  <View style={styles.safeZoneOverlay}>
                    <View style={styles.instagramTopBar} />
                    <View style={styles.instagramBottomBar} />
                    <View style={styles.safeZoneLabel}>
                      <Text style={styles.safeZoneLabelText}>Instagram Safe Zone</Text>
                    </View>
                  </View>
                )}
                
                {safeZone === 'tiktok' && (
                  <View style={styles.safeZoneOverlay}>
                    <View style={styles.tiktokSidebar} />
                    <View style={styles.tiktokBottomBar} />
                    <View style={styles.safeZoneLabel}>
                      <Text style={styles.safeZoneLabelText}>TikTok Safe Zone</Text>
                    </View>
                  </View>
                )}
                
                <TouchableOpacity style={styles.playPauseButton} onPress={handlePlayPause}>
                  {isPlaying ? (
                    <Pause size={32} color={COLORS.text} />
                  ) : (
                    <Play size={32} color={COLORS.text} />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.gigPreview}>
                <Image source={{ uri: selectedGig.venueImageUrl }} style={styles.gigPreviewImage} />
                <View style={styles.gigPreviewInfo}>
                  <Text style={styles.gigPreviewVenue}>{selectedGig.venueName}</Text>
                  <Text style={styles.gigPreviewDate}>
                    {formatDate(selectedGig.date)} • {selectedGig.startTime}
                  </Text>
                  <Text style={styles.gigPreviewGenre}>{selectedGig.genre}</Text>
                </View>
              </View>

              <View style={styles.promoOptions}>
                <Text style={styles.promoOptionsTitle}>Safe Zone Preview</Text>
                <View style={styles.safeZoneSelector}>
                  <TouchableOpacity 
                    style={[styles.safeZoneButton, safeZone === 'none' && styles.safeZoneButtonActive]}
                    onPress={() => setSafeZone('none')}
                  >
                    <Text style={[styles.safeZoneButtonText, safeZone === 'none' && styles.safeZoneButtonTextActive]}>None</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.safeZoneButton, safeZone === 'instagram' && styles.safeZoneButtonActive]}
                    onPress={() => setSafeZone('instagram')}
                  >
                    <Text style={[styles.safeZoneButtonText, safeZone === 'instagram' && styles.safeZoneButtonTextActive]}>Instagram</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.safeZoneButton, safeZone === 'tiktok' && styles.safeZoneButtonActive]}
                    onPress={() => setSafeZone('tiktok')}
                  >
                    <Text style={[styles.safeZoneButtonText, safeZone === 'tiktok' && styles.safeZoneButtonTextActive]}>TikTok</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.promoOptionsTitle, { marginTop: 24 }]}>Select Template</Text>
                
                <TouchableOpacity 
                  style={[styles.templateCard, selectedTemplate === 'neon' && styles.templateCardSelected]}
                  onPress={() => handleSelectTemplate('neon')}
                >
                  <View style={styles.templateIcon}>
                    <Video size={24} color={COLORS.accent} />
                  </View>
                  <View style={styles.templateInfo}>
                    <Text style={styles.templateName}>Neon Overlay</Text>
                    <Text style={styles.templateDesc}>Auto-overlay with venue & date</Text>
                  </View>
                  {selectedTemplate === 'neon' && (
                    <View style={styles.selectedCheckmark}>
                      <Text style={styles.checkmark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.templateCard, selectedTemplate === 'beat-sync' && styles.templateCardSelected]}
                  onPress={() => handleSelectTemplate('beat-sync')}
                >
                  <View style={[styles.templateIcon, { backgroundColor: 'rgba(157, 78, 221, 0.1)' }]}>
                    <Music size={24} color={COLORS.purple} />
                  </View>
                  <View style={styles.templateInfo}>
                    <Text style={styles.templateName}>Beat Sync</Text>
                    <Text style={styles.templateDesc}>Sync cuts to your track</Text>
                  </View>
                  {selectedTemplate === 'beat-sync' && (
                    <View style={styles.selectedCheckmark}>
                      <Text style={styles.checkmark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.retakeButton} onPress={() => setPromoStep('TRIM')}>
                  <Scissors size={20} color={COLORS.text} />
                  <Text style={styles.retakeButtonText}>Re-trim</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.continueButton} onPress={handleContinueToCustomize}>
                  <Text style={styles.continueButtonText}>Customize</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {promoStep === 'CUSTOMIZE' && recordedVideo && selectedGig && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Customize Video</Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.customizeScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.videoPreviewContainer}>
                  <ExpoVideo
                    ref={videoRef}
                    source={{ uri: recordedVideo }}
                    style={styles.videoPreview}
                    resizeMode={ResizeMode.COVER}
                    isLooping
                    onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                      if (status.isLoaded && status.didJustFinish) {
                        setIsPlaying(false);
                      }
                    }}
                  />
                  
                  {selectedFilter !== 'none' && (
                    <View style={[styles.filterOverlay, getFilterStyle(selectedFilter)]} />
                  )}
                  
                  {showTextOverlay && (
                    <View style={styles.textOverlay}>
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.textOverlayGradient}
                      />
                      <View style={styles.textOverlayContent}>
                        <Text style={styles.overlayPerformer}>{profile.displayName}</Text>
                        <Text style={styles.overlayVenue}>{selectedGig.venueName}</Text>
                        <Text style={styles.overlayDate}>
                          {formatDate(selectedGig.date)} • {selectedGig.startTime}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {selectedSticker !== 'none' && (
                    <View style={styles.stickerContainer}>
                      {renderSticker(selectedSticker)}
                    </View>
                  )}
                  
                  <TouchableOpacity style={styles.playPauseButton} onPress={handlePlayPause}>
                    {isPlaying ? (
                      <Pause size={32} color={COLORS.text} />
                    ) : (
                      <Play size={32} color={COLORS.text} />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.customizeSection}>
                  <View style={styles.customizeSectionHeader}>
                    <Sparkles size={20} color={COLORS.accent} />
                    <Text style={styles.customizeSectionTitle}>Vibe Filters</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                    {renderFilterOption('none', 'Original')}
                    {renderFilterOption('neon-glitch', 'Neon Glitch')}
                    {renderFilterOption('afterhours-noir', 'Afterhours Noir')}
                    {renderFilterOption('vhs-retro', 'VHS Retro')}
                    {renderFilterOption('cyber-wave', 'Cyber Wave')}
                    {renderFilterOption('golden-hour', 'Golden Hour')}
                  </ScrollView>
                </View>

                <View style={styles.customizeSection}>
                  <View style={styles.customizeSectionHeader}>
                    <Type size={20} color={COLORS.accent} />
                    <Text style={styles.customizeSectionTitle}>Text Overlay</Text>
                    <TouchableOpacity 
                      style={styles.toggleButton}
                      onPress={() => setShowTextOverlay(!showTextOverlay)}
                    >
                      <Text style={[styles.toggleButtonText, showTextOverlay && styles.toggleButtonTextActive]}>
                        {showTextOverlay ? 'ON' : 'OFF'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.customizeDescription}>
                    Auto-overlay with venue name, date, and your handle
                  </Text>
                </View>

                <View style={styles.customizeSection}>
                  <View style={styles.customizeSectionHeader}>
                    <Sticker size={20} color={COLORS.accent} />
                    <Text style={styles.customizeSectionTitle}>Call-to-Action Sticker</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                    {renderStickerOption('none', 'None')}
                    {renderStickerOption('get-tickets', 'Get Tickets')}
                    {renderStickerOption('join-lobby', 'Join Lobby')}
                    {renderStickerOption('live-tonight', 'Live Tonight')}
                    {renderStickerOption('swipe-up', 'Swipe Up')}
                  </ScrollView>
                </View>

                <View style={styles.customizeSection}>
                  <View style={styles.customizeSectionHeader}>
                    <Music2 size={20} color={COLORS.accent} />
                    <Text style={styles.customizeSectionTitle}>Audio Track</Text>
                  </View>
                  <TouchableOpacity style={styles.audioUploadButton} onPress={handleSelectAudio}>
                    <Upload size={20} color={COLORS.text} />
                    <Text style={styles.audioUploadText}>
                      {audioTrack ? audioName : 'Upload Audio Drop'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.customizeDescription}>
                    Add a 15-second audio snippet or DJ drop
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.retakeButton} onPress={() => setPromoStep('PREVIEW')}>
                  <X size={20} color={COLORS.text} />
                  <Text style={styles.retakeButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.continueButton} onPress={handlePublishVideo}>
                  <Check size={20} color={COLORS.background} />
                  <Text style={styles.continueButtonText}>Generate Video</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {promoStep === 'SHARE' && recordedVideo && selectedGig && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Share Your Promo</Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.sharePreview}>
                <View style={styles.videoPreviewContainer}>
                  <ExpoVideo
                    source={{ uri: recordedVideo }}
                    style={styles.videoPreview}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay
                    isLooping
                  />
                  
                  {selectedFilter !== 'none' && (
                    <View style={[styles.filterOverlay, getFilterStyle(selectedFilter)]} />
                  )}
                  
                  {showTextOverlay && (
                    <View style={styles.textOverlay}>
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.textOverlayGradient}
                      />
                      <View style={styles.textOverlayContent}>
                        <Text style={styles.overlayPerformer}>{profile.displayName}</Text>
                        <Text style={styles.overlayVenue}>{selectedGig.venueName}</Text>
                        <Text style={styles.overlayDate}>
                          {formatDate(selectedGig.date)} • {selectedGig.startTime}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {selectedSticker !== 'none' && (
                    <View style={styles.stickerContainer}>
                      {renderSticker(selectedSticker)}
                    </View>
                  )}

                  <View style={styles.watermark}>
                    <Text style={styles.watermarkText}>Powered by VibeLink</Text>
                  </View>
                </View>

                <View style={styles.shareInfo}>
                  <View style={styles.shareInfoRow}>
                    <Check size={16} color={COLORS.success} />
                    <Text style={styles.shareInfoText}>Video rendered successfully</Text>
                  </View>
                  <View style={styles.shareInfoRow}>
                    <Video size={16} color={COLORS.accent} />
                    <Text style={styles.shareInfoText}>{(trimEnd - trimStart).toFixed(1)}s • {selectedFilter} filter</Text>
                  </View>
                </View>
              </View>

              <View style={styles.shareOptions}>
                <Text style={styles.shareOptionsTitle}>Share To</Text>
                
                <TouchableOpacity style={styles.shareOptionCard} onPress={handleShareToInstagram}>
                  <LinearGradient
                    colors={['#f09433', '#e6683c', '#dc2743', '#cc2366', '#bc1888']}
                    style={styles.shareOptionGradient}
                  >
                    <Instagram size={28} color="#ffffff" />
                  </LinearGradient>
                  <View style={styles.shareOptionInfo}>
                    <Text style={styles.shareOptionName}>Instagram Reels</Text>
                    <Text style={styles.shareOptionDesc}>Share to your story or feed</Text>
                  </View>
                  <ExternalLink size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.shareOptionCard} onPress={handleShareToTikTok}>
                  <View style={styles.shareOptionIcon}>
                    <Music size={28} color={COLORS.purple} />
                  </View>
                  <View style={styles.shareOptionInfo}>
                    <Text style={styles.shareOptionName}>TikTok</Text>
                    <Text style={styles.shareOptionDesc}>Post with pre-filled caption</Text>
                  </View>
                  <ExternalLink size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.shareOptionCard} onPress={handleShareGeneric}>
                  <View style={styles.shareOptionIcon}>
                    <Share2 size={28} color={COLORS.accent} />
                  </View>
                  <View style={styles.shareOptionInfo}>
                    <Text style={styles.shareOptionName}>More Options</Text>
                    <Text style={styles.shareOptionDesc}>Share to other platforms</Text>
                  </View>
                  <ExternalLink size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.doneButton}
                onPress={() => {
                  Alert.alert(
                    'Video Published!',
                    'Your promo video is ready to share. Track engagement in your analytics.',
                    [{ text: 'OK', onPress: handleCloseModal }]
                  );
                }}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 255, 204, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  statsSubtitle: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: 'rgba(0, 255, 204, 0.1)',
    borderColor: COLORS.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.accent,
  },
  gigsContainer: {
    padding: 16,
    gap: 16,
  },
  gigCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gigImage: {
    width: '100%',
    height: 200,
  },
  gigGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  gigContent: {
    padding: 16,
  },
  gigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gigVenue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.text,
    flex: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 204, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: COLORS.accent,
  },
  gigDetails: {
    gap: 8,
    marginBottom: 16,
  },
  gigDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gigDetailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  gigStats: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  gigStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  gigStatText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  gigStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  promoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  promoButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: COLORS.background,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  gigPreview: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  gigPreviewImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  gigPreviewInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  gigPreviewVenue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 4,
  },
  gigPreviewDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  gigPreviewGenre: {
    fontSize: 13,
    color: COLORS.accent,
  },
  promoOptions: {
    padding: 20,
    paddingTop: 0,
  },
  promoOptionsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 16,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 16,
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 255, 204, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 4,
  },
  templateDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  modalActions: {
    padding: 20,
    gap: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.background,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  cameraCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textSecondary,
  },
  recordingDotActive: {
    backgroundColor: '#ff0000',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  cameraTopRightButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cameraFlashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraFlipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: '700' as const,
    color: COLORS.accent,
  },
  cameraControls: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: COLORS.text,
  },
  recordButtonActive: {
    borderColor: '#ff0000',
  },
  recordButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ff0000',
  },
  recordButtonInnerActive: {
    borderRadius: 8,
    width: 32,
    height: 32,
  },
  minDurationWarning: {
    position: 'absolute',
    bottom: 140,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  minDurationText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600' as const,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: COLORS.background,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.background,
  },
  backButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  videoPreviewContainer: {
    width: '100%',
    height: 400,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  videoPreview: {
    width: '100%',
    height: '100%',
  },
  playPauseButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -32 }, { translateY: -32 }],
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  templateCardSelected: {
    borderColor: COLORS.accent,
    borderWidth: 2,
  },
  selectedCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: COLORS.background,
  },
  promoOptionsSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
    marginTop: -8,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  retakeButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  continueButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: COLORS.background,
  },
  trimContainer: {
    padding: 20,
  },
  trimControls: {
    marginTop: 24,
  },
  trimInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  trimInfoText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderValue: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  trimHint: {
    backgroundColor: 'rgba(0, 255, 204, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  trimHintText: {
    fontSize: 13,
    color: COLORS.accent,
    textAlign: 'center',
  },
  safeZoneOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  instagramTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  instagramBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderTopWidth: 2,
    borderTopColor: COLORS.accent,
  },
  tiktokSidebar: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderLeftWidth: 2,
    borderLeftColor: COLORS.purple,
  },
  tiktokBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderTopWidth: 2,
    borderTopColor: COLORS.purple,
  },
  safeZoneLabel: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  safeZoneLabelText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  safeZoneSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  safeZoneButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  safeZoneButtonActive: {
    backgroundColor: 'rgba(0, 255, 204, 0.1)',
    borderColor: COLORS.accent,
  },
  safeZoneButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  safeZoneButtonTextActive: {
    color: COLORS.accent,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  accessDeniedIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  accessDeniedText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  filterOption: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 80,
  },
  filterOptionActive: {
    opacity: 1,
  },
  filterPreview: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  filterPreviewText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  filterLabelActive: {
    color: COLORS.accent,
  },
  sticker: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stickerIcon: {
    fontSize: 16,
  },
  stickerText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#ffffff',
  },
  stickerPreview: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  stickerPreviewText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  customizeScroll: {
    flex: 1,
  },
  filterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  textOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  textOverlayGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  textOverlayContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  overlayPerformer: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 4,
  },
  overlayVenue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.accent,
    marginBottom: 2,
  },
  overlayDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  stickerContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  customizeSection: {
    padding: 20,
    paddingTop: 0,
    marginTop: 20,
  },
  customizeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  customizeSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
    flex: 1,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: COLORS.textSecondary,
  },
  toggleButtonTextActive: {
    color: COLORS.accent,
  },
  customizeDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  filterScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  audioUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  audioUploadText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  sharePreview: {
    padding: 20,
  },
  shareInfo: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  shareInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareInfoText: {
    fontSize: 13,
    color: COLORS.text,
  },
  shareOptions: {
    padding: 20,
    paddingTop: 0,
  },
  shareOptionsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 16,
  },
  shareOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shareOptionGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(157, 78, 221, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareOptionInfo: {
    flex: 1,
  },
  shareOptionName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 2,
  },
  shareOptionDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  doneButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.background,
  },
  watermark: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  watermarkText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  createVideoContainer: {
    gap: 24,
  },
  createVideoHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  createVideoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 255, 204, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  createVideoTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  createVideoSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  createVideoActions: {
    gap: 12,
  },
  createWithGigButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createWithGigButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.background,
  },
  quickCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickCreateButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  proTip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  proTipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proTipContent: {
    flex: 1,
  },
  proTipTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: COLORS.warning,
    marginBottom: 4,
  },
  proTipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
