import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppStateProvider, DiscoveryProvider } from "@/contexts/AppStateContext";
import { PerformerProvider } from "@/contexts/PerformerContext";
import { SocialProvider } from "@/contexts/SocialContext";
import { FeedProvider } from "@/contexts/FeedContext";
import { POSProvider } from "@/contexts/POSContext";
import { GlowProvider, useGlow } from "@/contexts/GlowContext";
import { GrowthProvider } from "@/contexts/GrowthContext";
import { EventsProvider } from "@/contexts/EventsContext";
import { ContentProvider } from "@/contexts/ContentProvider";
import { MonetizationProvider } from "@/contexts/MonetizationContext";
import { RetentionProvider } from "@/contexts/RetentionContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { VenueManagementProvider } from "@/contexts/VenueManagementContext";
import { ModerationProvider } from "@/contexts/ModerationContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AgeVerificationGate from "@/components/AgeVerificationGate";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { GlowOverlay } = useGlow();
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [isAgeVerified, setIsAgeVerified] = useState(false);
  const [isCheckingAge, setIsCheckingAge] = useState(true);

  useEffect(() => {
    // Check if user has already verified their age
    AsyncStorage.getItem('age_verified').then((verified) => {
      setIsAgeVerified(verified === 'true');
      setShowAgeGate(verified !== 'true');
      setIsCheckingAge(false);
    });
  }, []);

  const handleAgeVerified = async (dateOfBirth: Date) => {
    await AsyncStorage.setItem('age_verified', 'true');
    await AsyncStorage.setItem('date_of_birth', dateOfBirth.toISOString());
    setIsAgeVerified(true);
    setShowAgeGate(false);
  };

  // Don't render anything until we've checked age verification status
  if (isCheckingAge) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="create-account" options={{ headerShown: false }} />
        <Stack.Screen name="auth/sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="auth/sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="community-guidelines" options={{ headerShown: false }} />
        <Stack.Screen name="blocked-users" options={{ headerShown: false }} />
        <Stack.Screen name="management" options={{ headerShown: false }} />
        <Stack.Screen name="crews" options={{ headerShown: false }} />
        <Stack.Screen name="challenges" options={{ headerShown: false }} />
        <Stack.Screen name="calendar" options={{ headerShown: false }} />
        <Stack.Screen name="events" options={{ headerShown: false }} />
        <Stack.Screen name="tickets" options={{ headerShown: false }} />
      </Stack>
      <GlowOverlay />
      <AgeVerificationGate
        visible={showAgeGate}
        onVerified={handleAgeVerified}
      />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // TODO: Send error to tracking service (Sentry, Bugsnag, etc.)
    console.error('Global error caught:', error, errorInfo);
  };

  return (
    <ErrorBoundary onError={handleError}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <AppStateProvider>
              <GlowProvider>
                <POSProvider>
                  <ModerationProvider>
                    <SocialProvider>
                      <GrowthProvider>
                        <EventsProvider>
                          <ContentProvider>
                            <MonetizationProvider>
                              <RetentionProvider>
                                <VenueManagementProvider>
                                  <FeedProvider>
                                    <DiscoveryProvider>
                                      <PerformerProvider>
                                        <RootLayoutNav />
                                      </PerformerProvider>
                                    </DiscoveryProvider>
                                  </FeedProvider>
                                </VenueManagementProvider>
                              </RetentionProvider>
                            </MonetizationProvider>
                          </ContentProvider>
                        </EventsProvider>
                      </GrowthProvider>
                    </SocialProvider>
                  </ModerationProvider>
                </POSProvider>
              </GlowProvider>
            </AppStateProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
