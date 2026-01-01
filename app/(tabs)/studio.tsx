import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, Alert, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePerformer } from '@/contexts/PerformerContext';
import { useAppState } from '@/contexts/AppStateContext';
import { Camera, Upload, Play, Pause, RotateCw, Zap, ZapOff, Check, Type, Music2, Share2, Instagram, ExternalLink, Video, Scissors, Sparkles, Sticker, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Video as ExpoVideo, ResizeMode, AVPlaybackStatus } from 'expo-av';

// Import extracted components
import {
  StatsCard,
  GigCard,
  FilterSelector,
  StickerSelector,
  VideoTrimmer,
  COLORS,
  PromoStep,
  SafeZoneType,
  VibeFilter,
  StickerType,
} from './studio';

export default function StudioScreen() {
  const { profile } = useAppState();
  const { upcomingGigs, completedGigs, analytics, createPromoVideo } = usePerformer();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'create'>('upcoming');
  const [promoStep, setPromoStep] = useState<PromoStep>('SELECT_METHOD');
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
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

  // Format helpers - memoized for performance
  const formatCurrency = useCallback((amount: number) => {
    return `$${amount.toLocaleString()}`;
  }, []);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  // Permission handling
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

  // Recording functions
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

  const handleShare = async () => {
    if (!recordedVideo) return;

    try {
      await Share.share({
        message: 'Check out my promo video!',
        url: recordedVideo,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  // Memoized gig press handler
  const handleGigPress = useCallback((gig: any) => {
    if (gig.status === 'UPCOMING') {
      createPromoVideo(gig);
    }
  }, [createPromoVideo]);

  // Access denied screen for non-talent users
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

  // Recording screen
  if (promoStep === 'RECORDING') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={cameraType}
            flash={flashMode}
          />

          {/* Countdown overlay */}
          {countdown !== null && (
            <View style={styles.countdownOverlay}>
              <Text style={styles.countdownText}>{countdown}</Text>
            </View>
          )}

          {/* Camera controls */}
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => setCameraType(prev => prev === 'back' ? 'front' : 'back')}
            >
              <RotateCw size={24} color={COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => setFlashMode(prev => prev === 'off' ? 'on' : 'off')}
            >
              {flashMode === 'on' ? (
                <Zap size={24} color={COLORS.warning} />
              ) : (
                <ZapOff size={24} color={COLORS.text} />
              )}
            </TouchableOpacity>
          </View>

          {/* Recording button */}
          <View style={styles.recordButtonContainer}>
            {isRecording ? (
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStopRecording}
              >
                <View style={styles.stopButtonInner} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.recordButton}
                onPress={handleStartRecording}
              >
                <View style={styles.recordButtonInner} />
              </TouchableOpacity>
            )}
          </View>

          {/* Recording duration */}
          {isRecording && (
            <View style={styles.durationContainer}>
              <View style={styles.recordingIndicator} />
              <Text style={styles.durationText}>
                {recordingDuration.toFixed(1)}s / 15.0s
              </Text>
            </View>
          )}

          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setPromoStep('SELECT_METHOD')}
          >
            <X size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Trim screen
  if (promoStep === 'TRIM' && recordedVideo) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setPromoStep('SELECT_METHOD')}>
            <X size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trim Video</Text>
          <TouchableOpacity onPress={() => setPromoStep('CUSTOMIZE')}>
            <Check size={24} color={COLORS.accent} />
          </TouchableOpacity>
        </View>

        <View style={styles.videoPreviewContainer}>
          <ExpoVideo
            ref={videoRef}
            source={{ uri: recordedVideo }}
            style={styles.videoPreview}
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            shouldPlay={isPlaying}
          />

          <TouchableOpacity
            style={styles.playButton}
            onPress={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <Pause size={32} color={COLORS.text} />
            ) : (
              <Play size={32} color={COLORS.text} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.trimControlsContainer}>
          <VideoTrimmer
            trimStart={trimStart}
            trimEnd={trimEnd}
            videoDuration={videoDuration}
            onTrimStartChange={setTrimStart}
            onTrimEndChange={setTrimEnd}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Customize screen
  if (promoStep === 'CUSTOMIZE' && recordedVideo) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setPromoStep('TRIM')}>
            <X size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customize</Text>
          <TouchableOpacity onPress={() => setPromoStep('SHARE')}>
            <Check size={24} color={COLORS.accent} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.customizeScroll}>
          <View style={styles.videoPreviewSmall}>
            <ExpoVideo
              source={{ uri: recordedVideo }}
              style={styles.videoPreviewSmallVideo}
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              shouldPlay
            />
          </View>

          <FilterSelector
            selectedFilter={selectedFilter}
            onSelectFilter={setSelectedFilter}
          />

          <StickerSelector
            selectedSticker={selectedSticker}
            onSelectSticker={setSelectedSticker}
          />

          <View style={styles.textOverlaySection}>
            <View style={styles.sectionHeader}>
              <Type size={20} color={COLORS.accent} />
              <Text style={styles.sectionTitle}>Text Overlay</Text>
            </View>
            <TouchableOpacity
              style={styles.textOverlayToggle}
              onPress={() => setShowTextOverlay(!showTextOverlay)}
            >
              <Text style={styles.textOverlayLabel}>Show Text</Text>
              <View style={[styles.toggle, showTextOverlay && styles.toggleActive]}>
                <View style={[styles.toggleKnob, showTextOverlay && styles.toggleKnobActive]} />
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Share screen
  if (promoStep === 'SHARE' && recordedVideo) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setPromoStep('CUSTOMIZE')}>
            <X size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Share</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.shareContainer}>
          <View style={styles.videoPreviewFinal}>
            <ExpoVideo
              source={{ uri: recordedVideo }}
              style={styles.videoPreviewFinalVideo}
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              shouldPlay
            />
          </View>

          <View style={styles.shareOptions}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Instagram size={24} color={COLORS.text} />
              <Text style={styles.shareButtonText}>Instagram Story</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Share2 size={24} color={COLORS.text} />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <ExternalLink size={24} color={COLORS.text} />
              <Text style={styles.shareButtonText}>More Options</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Main dashboard screen
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Studio</Text>
        <Text style={styles.headerSubtitle}>Manage your gigs & content</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Analytics Stats */}
        <View style={styles.statsGrid}>
          <StatsCard
            icon={<Video size={24} color={COLORS.accent} />}
            label="Total Earnings"
            value={formatCurrency(analytics.totalRevenue)}
            subtitle={`${analytics.totalGigs} completed gigs`}
          />
          <StatsCard
            icon={<Video size={24} color={COLORS.success} />}
            label="Bar Sales Generated"
            value={formatCurrency(analytics.totalBarSalesGenerated)}
            subtitle="Venue revenue"
          />
          <StatsCard
            icon={<Video size={24} color={COLORS.purple} />}
            label="Avg Ticket Clicks"
            value={Math.round(analytics.averageTicketClicks).toString()}
            subtitle="Per promo video"
          />
        </View>

        {/* Tabs */}
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

        {/* Gigs List */}
        <View style={styles.gigsContainer}>
          {activeTab === 'upcoming' && upcomingGigs.map(gig => (
            <GigCard
              key={gig.id}
              gig={gig}
              onPress={() => handleGigPress(gig)}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
            />
          ))}

          {activeTab === 'completed' && completedGigs.map(gig => (
            <GigCard
              key={gig.id}
              gig={gig}
              onPress={() => handleGigPress(gig)}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
            />
          ))}

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
                    <Text style={styles.featureDesc}>Perfect for Instagram Reels & TikTok</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Scissors size={20} color={COLORS.purple} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Smart Clip Trimmer</Text>
                    <Text style={styles.featureDesc}>Trim to exactly 10-15 seconds</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Sparkles size={20} color={COLORS.accent} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Vibe Filters</Text>
                    <Text style={styles.featureDesc}>5 nightlife-themed filters</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Sticker size={20} color={COLORS.purple} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Call-to-Action Stickers</Text>
                    <Text style={styles.featureDesc}>Drive engagement</Text>
                  </View>
                </View>
              </View>

              <View style={styles.createVideoActions}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => setPromoStep('RECORDING')}
                >
                  <Camera size={20} color={COLORS.text} />
                  <Text style={styles.primaryButtonText}>Record Video</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleUploadVideo}
                >
                  <Upload size={20} color={COLORS.accent} />
                  <Text style={styles.secondaryButtonText}>Upload Existing</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  statsGrid: {
    padding: 20,
    gap: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.text,
  },
  gigsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  createVideoContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
  },
  createVideoHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  createVideoIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  createVideoTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  createVideoSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  featuresList: {
    gap: 16,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    gap: 12,
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
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  createVideoActions: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.accent,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  accessDeniedIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  accessDeniedText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    top: 60,
    right: 20,
    gap: 16,
  },
  cameraButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.error,
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButtonInner: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.error,
  },
  durationContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  recordingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: '700',
    color: COLORS.text,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPreviewContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trimControlsContainer: {
    padding: 20,
  },
  customizeScroll: {
    flex: 1,
    padding: 20,
  },
  videoPreviewSmall: {
    aspectRatio: 9 / 16,
    maxHeight: 400,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  videoPreviewSmallVideo: {
    width: '100%',
    height: '100%',
  },
  textOverlaySection: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  textOverlayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
  },
  textOverlayLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: COLORS.accent,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.text,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  shareContainer: {
    flex: 1,
    padding: 20,
  },
  videoPreviewFinal: {
    aspectRatio: 9 / 16,
    maxHeight: 500,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  videoPreviewFinalVideo: {
    width: '100%',
    height: '100%',
  },
  shareOptions: {
    gap: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});
